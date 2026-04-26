# FSA Product Finder

A full-stack web app that helps users find the **cheapest FSA-eligible products** across Amazon and Walmart — powered by **Tavily AI Search**, **FastAPI**, and **React**.

---

## Features

- 🔍 **Live AI Search** — Uses Tavily API for real-time web search of FSA products
- 🤖 **AI Summary** — Tavily generates a contextual answer alongside results
- 📦 **Amazon & Walmart** — Toggle between retailers with domain-scoped search
- 💰 **Smart Sorting** — Sort by relevance, price, or rating
- 🏆 **Best Price Badge** — Highlights the cheapest option
- 🔄 **Fallback Data** — Works offline with cached product data when Tavily is unavailable

---

## Project Structure

```
FSA-Hackathon/
├── backend/
│   ├── main.py              # FastAPI + Tavily search integration
│   ├── .env                 # Tavily API key (server-side only)
│   ├── requirements.txt     # Python dependencies
│   ├── routes/              # API route handlers
│   └── models/              # Pydantic data models
├── frontend/
│   ├── public/              # Static HTML
│   └── src/
│       ├── App.jsx          # Main React component
│       ├── main.jsx         # React entry point
│       └── components/      # Reusable UI components
└── docs/                    # Project documentation
```

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Git

---

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The API will be available at: `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs`

**Environment Variables** (`backend/.env`):
```
TAVILY_API_KEY=your_tavily_api_key_here
```

---

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

The app will open at: `http://localhost:3000`

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/api/health` | API health status |
| GET | `/api/search?query=allergy&retailer=amazon` | Search FSA products via Tavily |

---

## How It Works

1. User enters a search query (e.g. "allergy medicine")
2. Frontend calls `GET /api/search?query=...&retailer=...`
3. Backend sends a scoped search to Tavily: `"FSA eligible {query} site:amazon.com"`
4. Tavily returns real-time web results + an AI-generated summary
5. Backend parses results, merges with fallback data, and returns structured JSON
6. Frontend renders product cards with direct links to Amazon/Walmart

---

## Team

| Name | Role |
|------|------|
|      |      |

---

## License

MIT
