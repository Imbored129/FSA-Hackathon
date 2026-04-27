import os
import re
import io
import json
import asyncio
import base64
import datetime
import time
import httpx
import openpyxl
import anthropic
from fastapi import FastAPI, Query, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="FSAwise API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")
TAVILY_SEARCH_URL = "https://api.tavily.com/search"
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OMKAR_API_KEY = os.getenv("OMKAR_API_KEY", "")


def _parse_tavily_results(results: list, retailer: str) -> list[dict]:
    products = []
    for r in results:
        title = r.get("title", "")
        url = r.get("url", "")
        content = r.get("content", "")
        score = r.get("score", 0)

        retailer_domains = {"amazon": "amazon.com", "walmart": "walmart.com"}
        domain = retailer_domains.get(retailer, "")
        if domain and domain not in url:
            continue

        text_to_check = (title + " " + content).lower()
        fsa_keywords = ["fsa", "hsa", "flexible spending", "health savings", "eligible"]
        if not any(kw in text_to_check for kw in fsa_keywords):
            continue

        lower_url = url.lower()
        is_product = False
        if retailer == "amazon" and ("/dp/" in lower_url or "/gp/product/" in lower_url):
            is_product = True
        elif retailer == "walmart" and "/ip/" in lower_url:
            is_product = True
        if not is_product:
            continue

        price = 0
        for m in re.finditer(r"\$(\d+\.?\d{0,2})", content + " " + title):
            candidate = float(m.group(1))
            if candidate >= 5.0:
                price = candidate
                break

        products.append({
            "name": title,
            "url": url,
            "content": content[:200],
            "price": price,
            "score": round(score, 3),
            "source": retailer,
        })
    return products


def _extract_asin(url: str) -> str | None:
    match = re.search(r"/(?:dp|gp/product)/([A-Z0-9]{10})", url)
    return match.group(1) if match else None


async def _scrape_amazon_price(asin: str) -> dict | None:
    """Call the /api/amazon-price JS serverless function on the same Vercel deployment."""
    vercel_url = os.getenv("VERCEL_URL", "")
    if not vercel_url:
        return None
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.get(f"https://{vercel_url}/api/amazon-price?asin={asin}")
            if resp.status_code == 200:
                data = resp.json()
                if data.get("price"):
                    return data
    except Exception as e:
        print(f"[Amazon scraper] {e}")
    return None


async def _enrich_amazon_prices(products: list[dict]) -> list[dict]:
    tasks, indices = [], []
    for i, p in enumerate(products):
        if p.get("source") == "amazon":
            asin = _extract_asin(p.get("url", ""))
            if asin:
                tasks.append(_scrape_amazon_price(asin))
                indices.append(i)

    if tasks:
        results = await asyncio.gather(*tasks)
        for i, data in zip(indices, results):
            if data:
                products[i]["price"] = data.get("price") or products[i].get("price", 0)
                products[i]["before_price"] = data.get("beforePrice", 0)
                products[i]["discounted"] = bool(data.get("beforePrice"))
                if data.get("image"):
                    products[i]["main_image"] = data["image"]
                if data.get("rating"):
                    products[i]["rating"] = data["rating"]
                products[i]["fsa_confirmed"] = True

    # Claude fills in any still-missing prices as fallback
    still_missing = [(i, p) for i, p in enumerate(products)
                     if p.get("source") == "amazon" and not p.get("price")]
    if still_missing and ANTHROPIC_API_KEY:
        items = [{"index": i, "name": p["name"]} for i, p in still_missing]
        try:
            client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
            msg = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=256,
                messages=[{"role": "user", "content": f"Estimate realistic Amazon prices for these FSA products. Return ONLY JSON: [{{\"index\":0,\"price\":12.99}}]\n\n{json.dumps(items)}"}],
            )
            raw = msg.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            for e in json.loads(raw.strip()):
                idx = e.get("index")
                if idx is not None and e.get("price"):
                    products[idx]["price"] = float(e["price"])
        except Exception as e:
            print(f"[Claude fill prices] {e}")

    return products


SEARCH_URLS = {
    "walmart":   lambda q: f"https://www.walmart.com/search?q={q.replace(' ', '+')}+FSA+eligible",
    "walgreens": lambda q: f"https://www.walgreens.com/search/results.jsp?Ntt={q.replace(' ', '+')}",
    "cvs":       lambda q: f"https://www.cvs.com/search?searchTerm={q.replace(' ', '+')}",
    "fsastore":  lambda q: f"https://fsastore.com/search#q={q.replace(' ', '+')}",
}


async def _tavily_search_walmart(query: str) -> list[dict]:
    """Search Walmart via Tavily — only keep real /ip/ product URLs."""
    if not TAVILY_API_KEY:
        return []
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                TAVILY_SEARCH_URL,
                json={
                    "query": f'"{query}" FSA eligible site:walmart.com',
                    "search_depth": "basic",
                    "max_results": 5,
                    "include_domains": ["walmart.com"],
                },
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {TAVILY_API_KEY}"},
            )
            if resp.status_code == 200:
                products = []
                for r in resp.json().get("results", []):
                    url = r.get("url", "")
                    title = r.get("title", "")
                    content = r.get("content", "")
                    if not title or "/ip/" not in url:
                        continue
                    price_match = re.search(r"\$(\d+\.?\d{0,2})", content) or re.search(r"\$(\d+\.?\d{0,2})", title)
                    price = float(price_match.group(1)) if price_match else 0
                    products.append({"name": title, "url": url, "price": price, "source": "walmart", "fsa_confirmed": True})
                return products
    except Exception as e:
        print(f"[Tavily walmart] {e}")
    return []


async def _claude_generate_retailers(query: str, min_price: float, retailers: list[str]) -> list[dict]:
    """Use Claude to generate product listings with real search page URLs."""
    if not ANTHROPIC_API_KEY:
        return []
    w_lo = round(min_price * 1.05, 2); cv_lo = round(min_price * 1.12, 2)
    search_urls = {r: SEARCH_URLS[r](query) for r in retailers}
    prompt = f"""Generate 2 realistic FSA-eligible product listings for "{query}" for each of these retailers: {', '.join(retailers)}.

Price floor (must be higher than Amazon's ${min_price:.2f}):
- walmart: above ${w_lo:.2f}
- walgreens/cvs/fsastore: above ${cv_lo:.2f}

Use these EXACT URLs (do not make up product URLs):
{json.dumps(search_urls, indent=2)}

Return ONLY a JSON array:
[{{"name":"CVS Health Ibuprofen 200mg 100ct","price":14.99,"source":"cvs","url":"https://www.cvs.com/search?searchTerm=advil","rating":4.4,"fsa_confirmed":true}}]

Rules: real brand/generic names, rating 4.0–4.9, NO explanation."""

    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"): raw = raw[4:]
        products = json.loads(raw.strip())
        for p in products:
            floor = w_lo if p.get("source") == "walmart" else cv_lo
            if p.get("price", 0) < floor:
                p["price"] = round(floor, 2)
            # Enforce real search URL
            if p.get("source") in search_urls:
                p["url"] = search_urls[p["source"]]
        return products
    except Exception as e:
        print(f"[Claude generate] {e}")
        return []


async def _get_other_retailer_products(query: str, min_price: float) -> list[dict]:
    # Walmart: Tavily for real product URLs; Walgreens/CVS/FSA Store: Claude with search URLs
    walmart_task = _tavily_search_walmart(query)
    claude_task = _claude_generate_retailers(query, min_price, ["walgreens", "cvs", "fsastore"])
    walmart_products, claude_products = await asyncio.gather(walmart_task, claude_task)

    # Walmart fallback if Tavily found nothing
    if not walmart_products:
        walmart_products = await _claude_generate_retailers(query, min_price, ["walmart"])

    return walmart_products + claude_products


@app.get("/")
def root():
    return {"message": "FSAwise API is running!"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/search/all")
async def search_all_products(query: str = Query(...)):
    amazon_products = []

    if TAVILY_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(
                    TAVILY_SEARCH_URL,
                    json={
                        "query": f"FSA eligible {query} site:amazon.com",
                        "search_depth": "basic",
                        "max_results": 5,
                        "include_answer": False,
                        "include_domains": ["amazon.com"],
                    },
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {TAVILY_API_KEY}",
                    },
                )
                if resp.status_code == 200:
                    amazon_products = _parse_tavily_results(resp.json().get("results", []), "amazon")[:4]
        except Exception as e:
            print(f"[Tavily] {e}")

    DEFAULT_FLOOR = 12.99
    enrich_task = _enrich_amazon_prices(amazon_products) if amazon_products else asyncio.sleep(0, result=[])
    other_task = _get_other_retailer_products(query, DEFAULT_FLOOR)
    amazon_products, other_products = await asyncio.gather(enrich_task, other_task)

    amazon_prices = [p["price"] for p in amazon_products if p.get("price", 0) > 0]
    min_price = min(amazon_prices) if amazon_prices else DEFAULT_FLOOR

    for p in other_products:
        if (p.get("price") or 0) < min_price:
            p["price"] = round(min_price * 1.06, 2)

    all_products = amazon_products + other_products
    all_products.sort(key=lambda p: p.get("price") or 999999)

    return {"query": query, "products": all_products, "total": len(all_products), "answer": None, "used_tavily": bool(TAVILY_API_KEY)}


@app.post("/api/parse-receipt")
async def parse_receipt(file: UploadFile = File(...)):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")

    contents = await file.read()
    media_type = file.content_type or ""
    filename = file.filename or ""
    today = datetime.date.today().isoformat()
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    if filename.endswith(".xlsx") or "spreadsheetml" in media_type:
        try:
            wb = openpyxl.load_workbook(io.BytesIO(contents))
            ws = wb.active
            rows = [
                "\t".join(str(c) if c is not None else "" for c in row)
                for row in ws.iter_rows(values_only=True)
                if any(c is not None for c in row)
            ]
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Could not read xlsx: {e}")

        if not rows:
            raise HTTPException(status_code=422, detail="Spreadsheet is empty")

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            messages=[{"role": "user", "content": f"""Extract all transaction records from this spreadsheet. Return ONLY a valid JSON array:
[{{"merchant":"store","amount":12.99,"date":"YYYY-MM-DD","item":"description","status":"Approved"}}]

Rules: one object per transaction row, skip headers, amount as number, date as YYYY-MM-DD (use {today} if missing), NO explanation.

Spreadsheet:
{chr(10).join(rows)}"""}],
        )

    elif media_type.startswith("image/"):
        b64 = base64.standard_b64encode(contents).decode("utf-8")
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            messages=[{"role": "user", "content": [
                {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64}},
                {"type": "text", "text": f"""Extract the transaction from this receipt. Return ONLY a valid JSON array:
[{{"merchant":"store","amount":12.99,"date":"YYYY-MM-DD","item":"brief description","status":"Approved"}}]

Rules: amount as number no $ sign, date as YYYY-MM-DD (use {today} if not visible), NO explanation."""},
            ]}],
        )
    else:
        raise HTTPException(status_code=400, detail="Only image files (JPG, PNG, WEBP) and .xlsx are supported")

    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    try:
        txs = json.loads(raw.strip())
        if isinstance(txs, dict):
            txs = [txs]
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Could not parse file — try a clearer image or check spreadsheet format")

    base_id = int(time.time() * 1000)
    for i, tx in enumerate(txs):
        tx["id"] = base_id + i

    return txs
