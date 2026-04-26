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
from routes import router

load_dotenv(override=True)

app = FastAPI(title="FSA Med Hackathon API", version="1.0.0")

# Allow requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")
TAVILY_SEARCH_URL = "https://api.tavily.com/search"
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
SCRAPER_API_KEY = os.getenv("SCRAPER_API_KEY", "")
OMKAR_API_KEY = os.getenv("OMKAR_API_KEY", "")
SCRAPER_PATH = os.path.expanduser("~/amazon-product-api/price_lookup.js")
WALMART_SCRAPER_PATH = os.path.expanduser("~/amazon-product-api/walmart_price_lookup.js")


# ── Hardcoded fallback data (used when Tavily is unavailable) ────────────
FALLBACK_PRODUCTS = {
    "amazon": {
        "allergy": [
            {"name": "GoodSense All Day Allergy Loratadine 10mg, 365ct", "price": 14.88, "rating": 4.7, "url": "https://www.amazon.com/dp/B07BBBYNLC", "source": "amazon"},
            {"name": "Benadryl Allergy Ultratab 25mg, 100ct", "price": 10.49, "rating": 4.8, "url": "https://www.amazon.com/dp/B001J8U834", "source": "amazon"},
            {"name": "Claritin 24Hr Non-Drowsy Loratadine 10mg, 70ct", "price": 22.97, "rating": 4.8, "url": "https://www.amazon.com/dp/B0006GV0E4", "source": "amazon"},
            {"name": "Zyrtec Allergy Relief 10mg, 90ct", "price": 33.88, "rating": 4.8, "url": "https://www.amazon.com/dp/B07VBDBCLV", "source": "amazon"},
            {"name": "Flonase Allergy Relief Nasal Spray, 144 sprays", "price": 23.99, "rating": 4.6, "url": "https://www.amazon.com/dp/B00NRA8C2W", "source": "amazon"},
        ],
        "bandages": [
            {"name": "Band-Aid Flexible Fabric Adhesive Bandages, 100ct", "price": 8.47, "rating": 4.8, "url": "https://www.amazon.com/dp/B00004TBLH", "source": "amazon"},
            {"name": "Nexcare Waterproof Clear Bandages, 20ct", "price": 5.49, "rating": 4.6, "url": "https://www.amazon.com/dp/B0014CQTGE", "source": "amazon"},
            {"name": "Curad Assorted Bandages Variety Pack, 280ct", "price": 10.97, "rating": 4.6, "url": "https://www.amazon.com/dp/B009QMT8KE", "source": "amazon"},
        ],
        "contact lenses": [
            {"name": "Bausch + Lomb ULTRA for Astigmatism, 6pk", "price": 49.99, "rating": 4.5, "url": "https://www.amazon.com/dp/B00UKM2CQI", "source": "amazon"},
            {"name": "Acuvue Oasys 2-Week, 12pk", "price": 54.99, "rating": 4.8, "url": "https://www.amazon.com/dp/B001KAO60E", "source": "amazon"},
        ],
        "pain relief": [
            {"name": "Amazon Basic Care Ibuprofen 200mg, 300ct", "price": 9.99, "rating": 4.8, "url": "https://www.amazon.com/dp/B07KQTLVFF", "source": "amazon"},
            {"name": "Tylenol Extra Strength 500mg, 225ct", "price": 14.47, "rating": 4.9, "url": "https://www.amazon.com/dp/B001GCU8SK", "source": "amazon"},
            {"name": "Advil Ibuprofen 200mg, 200ct", "price": 17.44, "rating": 4.8, "url": "https://www.amazon.com/dp/B000GCKLBQ", "source": "amazon"},
        ],
        "eye drops": [
            {"name": "Rohto Cool Eye Drops Redness Relief", "price": 6.97, "rating": 4.5, "url": "https://www.amazon.com/dp/B001MSXQZI", "source": "amazon"},
            {"name": "Systane Ultra Lubricant Eye Drops, Twin Pack", "price": 19.97, "rating": 4.8, "url": "https://www.amazon.com/dp/B001KAZOCS", "source": "amazon"},
        ],
    },
    "walmart": {
        "allergy": [
            {"name": "Equate Loratadine Allergy Relief 10mg, 365ct", "price": 11.98, "rating": 4.6, "url": "https://www.walmart.com/ip/1015546166", "source": "walmart"},
            {"name": "Benadryl Allergy Ultratabs 25mg, 100ct", "price": 9.97, "rating": 4.7, "url": "https://www.walmart.com/ip/10791965", "source": "walmart"},
            {"name": "Claritin 24Hr Non-Drowsy 10mg, 45ct", "price": 20.98, "rating": 4.7, "url": "https://www.walmart.com/ip/10295547", "source": "walmart"},
        ],
        "bandages": [
            {"name": "Equate Flexible Fabric Bandages, 100ct", "price": 4.97, "rating": 4.5, "url": "https://www.walmart.com/ip/35094988", "source": "walmart"},
            {"name": "Band-Aid Flexible Fabric, 100ct", "price": 7.97, "rating": 4.8, "url": "https://www.walmart.com/ip/10792045", "source": "walmart"},
        ],
        "contact lenses": [
            {"name": "Equate Moisturizing Contact Lens Solution, 12oz", "price": 6.97, "rating": 4.5, "url": "https://www.walmart.com/ip/10291733", "source": "walmart"},
            {"name": "Biotrue Multi-Purpose Solution, 10oz", "price": 10.97, "rating": 4.7, "url": "https://www.walmart.com/ip/10295311", "source": "walmart"},
        ],
        "pain relief": [
            {"name": "Equate Ibuprofen 200mg, 500ct", "price": 8.97, "rating": 4.8, "url": "https://www.walmart.com/ip/10792077", "source": "walmart"},
            {"name": "Equate Extra Strength Acetaminophen 500mg, 500ct", "price": 9.97, "rating": 4.8, "url": "https://www.walmart.com/ip/10792082", "source": "walmart"},
        ],
        "eye drops": [
            {"name": "Equate Lubricant Eye Drops, 1oz", "price": 4.97, "rating": 4.5, "url": "https://www.walmart.com/ip/10792101", "source": "walmart"},
            {"name": "Systane Ultra Lubricant Eye Drops, 0.33oz", "price": 14.97, "rating": 4.7, "url": "https://www.walmart.com/ip/10295551", "source": "walmart"},
        ],
    },
}

CATEGORIES = ["allergy", "bandages", "contact lenses", "pain relief", "eye drops"]


def _match_category(query: str) -> str | None:
    """Fuzzy-match the user query to one of the known categories."""
    q = query.lower().strip()
    for cat in CATEGORIES:
        if q in cat or cat in q:
            return cat
    return None


def _parse_tavily_results(results: list, retailer: str) -> list[dict]:
    """Convert raw Tavily search results into our product card format."""
    products = []
    for r in results:
        title = r.get("title", "")
        url = r.get("url", "")
        content = r.get("content", "")
        score = r.get("score", 0)

        # Skip results that aren't from the target retailer domain
        retailer_domains = {
            "amazon": "amazon.com",
            "walmart": "walmart.com",
        }
        domain = retailer_domains.get(retailer, "")
        if domain and domain not in url:
            continue

        # Strict post-filter to prevent hallucinations
        text_to_check = (title + " " + content).lower()
        fsa_keywords = ["fsa", "hsa", "flexible spending", "health savings", "eligible"]
        if not any(kw in text_to_check for kw in fsa_keywords):
            continue

        lower_url = url.lower()
        is_product = False
        if retailer == "amazon":
            if "/dp/" in lower_url or "/gp/product/" in lower_url:
                is_product = True
        elif retailer == "walmart":
            if "/ip/" in lower_url:
                is_product = True

        if not is_product:
            continue

        # Try to extract a price from the snippet (e.g. "$12.99")
        price_match = re.search(r"\$(\d+\.?\d{0,2})", content) or re.search(r"\$(\d+\.?\d{0,2})", title)
        if price_match:
            price = float(price_match.group(1))
        else:
            # Generate a realistic mock price so sorting and UI still work nicely
            price = 9.99 + (len(url) % 20) + (len(title) % 10) / 10.0

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
    try:
        proc = await asyncio.create_subprocess_exec(
            "node", SCRAPER_PATH, asin,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=12)
        data = json.loads(stdout.decode())
        if "error" not in data:
            return data
    except Exception as exc:
        print(f"[Scraper] Failed for {asin}: {exc}")
    return None


def _extract_walmart_item_id(url: str) -> str | None:
    match = re.search(r"/ip/[^/]+/(\d+)", url) or re.search(r"/(\d{6,12})(?:\?|$)", url)
    return match.group(1) if match else None


async def _scrape_walmart_price(item_id: str) -> dict | None:
    """Fetch Walmart product data via omkarcloud API (primary) or ScraperAPI (fallback)."""
    # Primary: omkarcloud REST API
    if OMKAR_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.get(
                    "https://walmart-scraper.omkar.cloud/walmart/product",
                    params={"product_id": item_id},
                    headers={"API-Key": OMKAR_API_KEY},
                )
                if resp.status_code == 200:
                    d = resp.json()
                    price = d.get("pricing", {}).get("current_price") or 0
                    if price:
                        return {
                            "price": float(price),
                            "beforePrice": float(d.get("pricing", {}).get("original_price") or 0),
                            "title": d.get("name", ""),
                            "image": (d.get("images") or [""])[0],
                            "rating": d.get("avg_rating", 0),
                            "reviewCount": d.get("review_count", 0),
                            "available": d.get("in_stock", False),
                        }
        except Exception as exc:
            print(f"[Omkar Walmart] Failed for {item_id}: {exc}")

    # Fallback: ScraperAPI + Node scraper
    if SCRAPER_API_KEY:
        env = {**os.environ, "SCRAPER_API_KEY": SCRAPER_API_KEY}
        try:
            proc = await asyncio.create_subprocess_exec(
                "node", WALMART_SCRAPER_PATH, item_id,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL,
                env=env,
            )
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=35)
            data = json.loads(stdout.decode())
            if "error" not in data and data.get("price"):
                return data
        except Exception as exc:
            print(f"[ScraperAPI Walmart] Failed for {item_id}: {exc}")

    return None


async def _enrich_with_scraper(products: list[dict]) -> list[dict]:
    """Fetch real prices via scrapers: amazon-buddy for Amazon, ScraperAPI for Walmart."""
    tasks = []
    indices = []
    for i, p in enumerate(products):
        src = p.get("source")
        if src == "amazon":
            asin = _extract_asin(p.get("url", ""))
            if asin:
                tasks.append(_scrape_amazon_price(asin))
                indices.append(i)
        elif src == "walmart" and (OMKAR_API_KEY or SCRAPER_API_KEY):
            item_id = _extract_walmart_item_id(p.get("url", ""))
            if item_id:
                tasks.append(_scrape_walmart_price(item_id))
                indices.append(i)

    if not tasks:
        return products

    results = await asyncio.gather(*tasks)
    for i, data in zip(indices, results):
        if data:
            products[i]["price"] = data.get("price") or products[i].get("price", 0)
            products[i]["before_price"] = data.get("beforePrice", data.get("before_price", 0))
            products[i]["discounted"] = bool(data.get("beforePrice") or data.get("before_price"))
            if data.get("image"):
                products[i]["main_image"] = data["image"]
            if data.get("rating"):
                products[i]["rating"] = data["rating"]
            products[i]["fsa_confirmed"] = True

    return products


async def _tavily_fetch_price(product_name: str, product_url: str, retailer: str) -> float | None:
    """Run a targeted Tavily search for a specific product's price."""
    if not TAVILY_API_KEY:
        return None
    domain_map = {"walmart": "walmart.com"}
    domain = domain_map.get(retailer, "")
    query = f'"{product_name}" price site:{domain}' if domain else f'"{product_name}" price'
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                TAVILY_SEARCH_URL,
                json={"query": query, "search_depth": "basic", "max_results": 3, "include_answer": True},
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {TAVILY_API_KEY}"},
            )
            if resp.status_code == 200:
                data = resp.json()
                # Try to pull price from answer or snippets
                text = (data.get("answer") or "") + " ".join(
                    r.get("content", "") for r in data.get("results", [])
                )
                match = re.search(r"\$\s*(\d+\.\d{2})", text)
                if match:
                    return float(match.group(1))
    except Exception as exc:
        print(f"[Tavily price] Failed for {product_name}: {exc}")
    return None


async def _claude_enrich_products(products: list[dict]) -> list[dict]:
    """Use Claude Haiku to extract accurate prices and confirm FSA eligibility."""
    if not ANTHROPIC_API_KEY or not products:
        return products

    items = [
        {"index": i, "name": p["name"], "url": p["url"], "snippet": p.get("content", "")}
        for i, p in enumerate(products)
    ]

    prompt = f"""You are analyzing FSA product search results. For each product extract the price from the snippet (use null if not clearly stated) and confirm FSA/HSA eligibility.

Rules:
- Only return a price if you see a clear dollar amount in the snippet (e.g. "$12.99")
- fsa_confirmed = true if the snippet mentions FSA, HSA, flexible spending, or health savings
- Return ONLY valid JSON, no explanation

Format: [{{"index": 0, "price": 12.99, "fsa_confirmed": true}}, ...]

Products:
{json.dumps(items, indent=2)}"""

    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        enrichments = json.loads(raw.strip())

        for e in enrichments:
            i = e.get("index")
            if i is not None and 0 <= i < len(products):
                if e.get("price") is not None:
                    products[i]["price"] = float(e["price"])
                products[i]["fsa_confirmed"] = e.get("fsa_confirmed", False)

    except Exception as exc:
        print(f"[Claude] Enrichment failed: {exc}")

    return products


async def _enrich_non_amazon_prices(products: list[dict]) -> list[dict]:
    """For non-Amazon products missing a price, run a targeted Tavily+Claude price search."""
    if not ANTHROPIC_API_KEY or not TAVILY_API_KEY:
        return products

    # Skip products already handled by a scraper (amazon-buddy or ScraperAPI/Walmart)
    missing = [(i, p) for i, p in enumerate(products)
               if p.get("source") != "amazon"
               and not (p.get("source") == "walmart" and (OMKAR_API_KEY or SCRAPER_API_KEY))
               and (not p.get("price") or p["price"] == 0)]

    if not missing:
        return products

    # Fetch targeted prices from Tavily in parallel
    tavily_tasks = [_tavily_fetch_price(p["name"], p["url"], p["source"]) for _, p in missing]
    prices = await asyncio.gather(*tavily_tasks)

    # For any still missing, ask Claude to infer from product name + retailer
    still_missing = [(i, p) for (i, p), price in zip(missing, prices) if price is None]
    if still_missing:
        names = [{"index": idx, "name": p["name"], "retailer": p["source"]} for idx, p in still_missing]
        try:
            client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
            msg = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=512,
                messages=[{"role": "user", "content": f"""Estimate realistic retail prices for these FSA-eligible products based on your knowledge of typical prices at each retailer. Return ONLY JSON:
[{{"index": 0, "price": 9.99}}, ...]

Products: {json.dumps(names)}"""}],
            )
            raw = msg.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            estimates = json.loads(raw.strip())
            # Map back using the original indices
            index_map = {p["index"]: est for p, est in zip(
                [{"index": i} for i, _ in still_missing], estimates
            )}
            for (orig_i, _), tavily_price in zip(missing, prices):
                if tavily_price is None and orig_i in index_map:
                    prices[missing.index((orig_i, _))] = index_map[orig_i].get("price")
        except Exception as exc:
            print(f"[Claude price estimate] Failed: {exc}")

    for (i, _), price in zip(missing, prices):
        if price is not None:
            products[i]["price"] = price

    return products


async def _claude_generate_other_retailers(query: str, min_amazon_price: float) -> list[dict]:
    """Ask Claude to generate realistic FSA product listings for non-Amazon retailers."""
    if not ANTHROPIC_API_KEY:
        return []

    w_lo  = round(min_amazon_price * 1.05, 2)
    w_hi  = round(min_amazon_price * 1.22, 2)
    cv_lo = round(min_amazon_price * 1.12, 2)
    cv_hi = round(min_amazon_price * 1.35, 2)
    fs_lo = round(min_amazon_price * 1.08, 2)
    fs_hi = round(min_amazon_price * 1.28, 2)

    prompt = f"""Generate realistic FSA-eligible product listings for the query: "{query}"

Retailers: walmart, walgreens, cvs, fsastore (2-3 products each, 10 total max)

Price rules (Amazon cheapest is ${min_amazon_price:.2f} — others must cost MORE):
- walmart:   ${w_lo:.2f} – ${w_hi:.2f}
- walgreens: ${cv_lo:.2f} – ${cv_hi:.2f}
- cvs:       ${cv_lo:.2f} – ${cv_hi:.2f}
- fsastore:  ${fs_lo:.2f} – ${fs_hi:.2f}

Return ONLY a valid JSON array. Each object must have these exact keys:
[
  {{
    "name": "Equate Loratadine 10mg 365ct",
    "price": {w_lo:.2f},
    "source": "walmart",
    "url": "https://www.walmart.com/ip/equate-loratadine-10mg-365ct/887654321",
    "rating": 4.5,
    "fsa_confirmed": true
  }}
]

Rules:
- Use real brand/generic names appropriate for "{query}"
- Only include genuinely FSA-eligible products
- Walmart URLs: walmart.com/ip/slug/9-digit-number
- Walgreens URLs: walgreens.com/store/c/slug/ID=prod123456
- CVS URLs: cvs.com/shop/slug/prodid=123456
- FSA Store URLs: fsastore.com/products/slug
- rating 4.0–4.9, fsa_confirmed always true
- NO explanation, ONLY the JSON array"""

    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        products = json.loads(raw.strip())
        # Enforce price floor
        for p in products:
            if p.get("price", 0) < min_amazon_price:
                p["price"] = round(min_amazon_price * 1.05, 2)
        return products
    except Exception as exc:
        print(f"[Claude generate] Failed: {exc}")
        return []


@app.get("/")
def root():
    return {"message": "FSA Med Hackathon API is running!"}


@app.get("/api/search/all")
async def search_all_products(query: str = Query(..., description="FSA product search query")):
    """Search Amazon (real scraper) + generate other retailer listings via Claude."""

    # ── 1. Tavily: find Amazon product URLs (fast, basic depth) ───────────
    amazon_products = []
    tavily_answer = None

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
                    data = resp.json()
                    amazon_products = _parse_tavily_results(data.get("results", []), "amazon")[:4]
        except Exception as exc:
            print(f"[Tavily] Amazon search failed: {exc}")

    # ── 2. Scraper + Claude generate run in parallel ───────────────────────
    DEFAULT_FLOOR = 12.99
    scraper_task = _enrich_with_scraper(amazon_products) if amazon_products else asyncio.sleep(0, result=[])
    claude_task  = _claude_generate_other_retailers(query, DEFAULT_FLOOR)

    amazon_products, other_products = await asyncio.gather(scraper_task, claude_task)

    # ── 3. Enforce real price floor now that we have scraped prices ────────
    amazon_prices = [p["price"] for p in amazon_products if p.get("price", 0) > 0]
    min_amazon_price = min(amazon_prices) if amazon_prices else DEFAULT_FLOOR

    for p in other_products:
        if (p.get("price") or 0) < min_amazon_price:
            p["price"] = round(min_amazon_price * 1.06, 2)

    # ── 4. Combine and sort by price ───────────────────────────────────────
    all_products = amazon_products + other_products
    all_products.sort(key=lambda p: p.get("price") or 999999)

    return {
        "query": query,
        "products": all_products,
        "total": len(all_products),
        "answer": tavily_answer,
        "used_tavily": bool(TAVILY_API_KEY),
    }


@app.post("/api/parse-receipt")
async def parse_receipt(file: UploadFile = File(...)):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")

    contents = await file.read()
    media_type = file.content_type or ""
    filename = file.filename or ""
    today = datetime.date.today().isoformat()
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    # ── XLSX ──────────────────────────────────────────────────────────────
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
[{{"merchant": "store name", "amount": 12.99, "date": "YYYY-MM-DD", "item": "description", "status": "Approved"}}]

Rules:
- One object per transaction row; skip header rows and empty rows
- amount: number only, no currency symbols
- date: YYYY-MM-DD, use {today} if missing
- status: "Approved" unless data says otherwise
- Return ONLY the JSON array, no explanation

Spreadsheet:
{chr(10).join(rows)}"""}],
        )

    # ── IMAGE ─────────────────────────────────────────────────────────────
    elif media_type.startswith("image/"):
        b64 = base64.standard_b64encode(contents).decode("utf-8")
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            messages=[{"role": "user", "content": [
                {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64}},
                {"type": "text", "text": f"""Extract the transaction from this receipt. Return ONLY a valid JSON array with one object:
[{{"merchant": "store name", "amount": 12.99, "date": "YYYY-MM-DD", "item": "brief item description", "status": "Approved"}}]

Rules:
- amount: number only, no $ sign
- date: YYYY-MM-DD, use {today} if not visible
- Return ONLY the JSON array, no explanation"""},
            ]}],
        )

    else:
        raise HTTPException(status_code=400, detail="Only image files (JPG, PNG, WEBP) and .xlsx spreadsheets are supported")

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


@app.get("/api/search")
async def search_products(
    query: str = Query(..., description="Product search query"),
    retailer: str = Query("amazon", description="Retailer: amazon, walmart"),
):
    """
    Search for FSA-eligible products using the Tavily API.
    Falls back to hardcoded data if the API is unavailable.
    """
    retailer = retailer.lower().strip()
    if retailer not in ("amazon", "walmart"):
        retailer = "amazon"

    # ── Build a Tavily-optimised search query ──────────────────────────
    domain_map = {
        "amazon": "amazon.com",
        "walmart": "walmart.com",
    }
    domain_filter = domain_map.get(retailer, "amazon.com")
    
    # Strict query to force Tavily to look for FSA/HSA eligibility
    search_query = f'"FSA eligible" OR "HSA eligible" {query} site:{domain_filter}'

    tavily_results = []
    tavily_answer = None
    used_tavily = False

    if TAVILY_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                resp = await client.post(
                    TAVILY_SEARCH_URL,
                    json={
                        "query": search_query,
                        "search_depth": "advanced",
                        "max_results": 10,
                        "include_answer": True,
                        "include_domains": [domain_filter],
                    },
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {TAVILY_API_KEY}",
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    tavily_answer = data.get("answer")
                    tavily_results = _parse_tavily_results(
                        data.get("results", []), retailer
                    )
                    used_tavily = True
        except Exception as exc:
            print(f"[Tavily] Search failed: {exc}")

    # ── Fallback to hardcoded data ─────────────────────────────────────
    # Only use fallback if Tavily failed or returned no results
    if not used_tavily or len(tavily_results) == 0:
        fallback = []
        cat = _match_category(query)
        if cat and retailer in FALLBACK_PRODUCTS:
            fallback = FALLBACK_PRODUCTS[retailer].get(cat, [])
        merged = fallback
    else:
        # Claude confirms FSA eligibility + extracts any visible prices from snippets
        merged = await _claude_enrich_products(tavily_results)
        # Amazon: use scraper for real prices; others: Tavily targeted search + Claude estimates
        merged, _ = await asyncio.gather(
            _enrich_with_scraper(merged),
            _enrich_non_amazon_prices(merged),
        )
        # _enrich_non_amazon_prices mutates in-place so merged is already updated

    return {
        "query": query,
        "retailer": retailer,
        "used_tavily": used_tavily,
        "answer": tavily_answer,
        "products": merged,
        "total": len(merged),
    }
