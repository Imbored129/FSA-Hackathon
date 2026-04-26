import os
import httpx
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routes import router

load_dotenv()

app = FastAPI(title="FSA Med Hackathon API", version="1.0.0")

# Allow requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")
TAVILY_SEARCH_URL = "https://api.tavily.com/search"


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

        # Try to extract a price from the snippet (e.g. "$12.99")
        import re
        price_match = re.search(r"\$(\d+\.?\d{0,2})", content) or re.search(r"\$(\d+\.?\d{0,2})", title)
        price = float(price_match.group(1)) if price_match else None

        products.append({
            "name": title,
            "url": url,
            "content": content[:200],
            "price": price,
            "score": round(score, 3),
            "source": retailer,
        })

    return products


@app.get("/")
def root():
    return {"message": "FSA Med Hackathon API is running!"}


@app.get("/api/search")
async def search_products(
    query: str = Query(..., description="Product search query"),
    retailer: str = Query("amazon", description="Retailer: amazon or walmart"),
):
    """
    Search for FSA-eligible products using the Tavily API.
    Falls back to hardcoded data if the API is unavailable.
    """
    retailer = retailer.lower().strip()
    if retailer not in ("amazon", "walmart"):
        retailer = "amazon"

    # ── Build a Tavily-optimised search query ──────────────────────────
    domain_filter = "amazon.com" if retailer == "amazon" else "walmart.com"
    search_query = f"FSA eligible {query} site:{domain_filter}"

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
    fallback = []
    cat = _match_category(query)
    if cat and retailer in FALLBACK_PRODUCTS:
        fallback = FALLBACK_PRODUCTS[retailer].get(cat, [])

    # Merge: Tavily results first, then fallback (deduplicated by URL)
    seen_urls = {p["url"] for p in tavily_results}
    merged = list(tavily_results)
    for fb in fallback:
        if fb["url"] not in seen_urls:
            merged.append(fb)
            seen_urls.add(fb["url"])

    return {
        "query": query,
        "retailer": retailer,
        "used_tavily": used_tavily,
        "answer": tavily_answer,
        "products": merged,
        "total": len(merged),
    }
