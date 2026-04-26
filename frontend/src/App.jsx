import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';
const CATEGORIES = ['allergy', 'bandages', 'contact lenses', 'pain relief', 'eye drops'];

const RETAILER_CONFIG = {
  amazon: {
    label: 'Amazon',
    color: '#FF9900',
    bg: '#FFF8EE',
    border: '#FFE0AA',
    logo: '📦',
    badge: 'FSA Filter Applied ✓',
  },
  walmart: {
    label: 'Walmart',
    color: '#0071CE',
    bg: '#EEF6FF',
    border: '#B3D7F5',
    logo: '🏪',
    badge: 'FSA Eligible ✓',
  },
};

const CATEGORY_ICONS = {
  allergy: '💊',
  bandages: '🩹',
  'contact lenses': '👁️',
  'pain relief': '💊',
  'eye drops': '💧',
};

export default function App() {
  const [query, setQuery] = useState('');
  const [retailer, setRetailer] = useState('amazon');
  const [products, setProducts] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [answer, setAnswer] = useState(null);
  const [usedTavily, setUsedTavily] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (cat, ret) => {
    const q = (cat || query).trim();
    if (!q) return;

    const r = ret || retailer;
    setLoading(true);
    setError(null);
    setSearched(true);
    setAnswer(null);

    try {
      const resp = await axios.get(`${API_BASE}/api/search`, {
        params: { query: q, retailer: r },
      });
      const data = resp.data;

      let items = data.products || [];

      // Sort
      if (sortBy === 'price') {
        items = [...items].sort((a, b) => (a.price ?? 999) - (b.price ?? 999));
      } else if (sortBy === 'rating') {
        items = [...items].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      }
      // 'relevance' keeps the API order (Tavily score)

      setProducts(items);
      setAnswer(data.answer);
      setUsedTavily(data.used_tavily);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Make sure the backend is running on port 8000.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const switchRetailer = (r) => {
    setRetailer(r);
    if (searched) handleSearch(query, r);
  };

  const handleSortChange = (s) => {
    setSortBy(s);
    // Re-sort current products client-side
    let items = [...products];
    if (s === 'price') {
      items.sort((a, b) => (a.price ?? 999) - (b.price ?? 999));
    } else if (s === 'rating') {
      items.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (s === 'relevance') {
      items.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }
    setProducts(items);
  };

  const rc = RETAILER_CONFIG[retailer];

  return (
    <div style={{ fontFamily: "'Inter', system-ui, Arial, sans-serif", minHeight: '100vh', background: '#f0f4f8' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a73e8 0%, #0d9488 100%)', padding: '22px 32px 20px', color: 'white' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <h1 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 800 }}>💊 FSA Product Finder</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.88, fontSize: '0.9rem' }}>
            Search for FSA-eligible products across Amazon and Walmart — powered by Tavily AI Search.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 16px' }}>

        {/* Search bar */}
        <div style={{ background: 'white', borderRadius: 14, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search FSA products: allergy medicine, bandages, eye drops, pain relief..."
              style={{ flex: 1, padding: '11px 14px', borderRadius: 9, border: '1.5px solid #e2e8f0', fontSize: '0.94rem', outline: 'none' }}
            />
            <button onClick={() => handleSearch()}
              disabled={loading}
              style={{ padding: '11px 26px', background: loading ? '#94a3b8' : 'linear-gradient(135deg,#1a73e8,#0d9488)', color: 'white', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: '0.94rem', cursor: loading ? 'wait' : 'pointer' }}>
              {loading ? '⏳ Searching...' : '🔍 Search'}
            </button>
          </div>

          {/* Category chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => { setQuery(cat); handleSearch(cat, retailer); }}
                style={{ padding: '5px 14px', background: query === cat ? '#dbeafe' : '#f1f5f9', color: query === cat ? '#1d4ed8' : '#64748b', border: `1.5px solid ${query === cat ? '#bfdbfe' : '#e2e8f0'}`, borderRadius: 20, fontSize: '0.82rem', cursor: 'pointer', fontWeight: query === cat ? 700 : 400, display: 'flex', alignItems: 'center', gap: 4 }}>
                {CATEGORY_ICONS[cat]} {cat}
              </button>
            ))}
          </div>

          {/* Retailer toggle */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Retailer:</span>
            {Object.entries(RETAILER_CONFIG).map(([key, cfg]) => (
              <button key={key} onClick={() => switchRetailer(key)}
                style={{
                  padding: '7px 18px', borderRadius: 9, border: `2px solid ${retailer === key ? cfg.color : '#e2e8f0'}`,
                  background: retailer === key ? cfg.bg : 'white', color: retailer === key ? cfg.color : '#64748b',
                  fontWeight: retailer === key ? 700 : 500, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                }}>
                {cfg.logo} {cfg.label}
                {retailer === key && <span style={{ fontSize: '0.75rem', background: cfg.color, color: 'white', padding: '1px 7px', borderRadius: 10, marginLeft: 2 }}>active</span>}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Sort:</span>
              {['relevance', 'price', 'rating'].map(s => (
                <button key={s} onClick={() => handleSortChange(s)}
                  style={{ padding: '5px 12px', borderRadius: 7, border: `1.5px solid ${sortBy === s ? '#1a73e8' : '#e2e8f0'}`, background: sortBy === s ? '#dbeafe' : 'white', color: sortBy === s ? '#1d4ed8' : '#64748b', fontSize: '0.8rem', cursor: 'pointer', fontWeight: sortBy === s ? 700 : 400 }}>
                  {s === 'price' ? '💰 Price' : s === 'rating' ? '⭐ Rating' : '🎯 Relevance'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Info banner */}
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 16px', marginBottom: 18, fontSize: '0.84rem', color: '#92400e', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>ℹ️</span>
          <span>
            <strong>Powered by Tavily AI Search:</strong> Live web results are fetched from {rc.label} in real time. Click any product to visit the actual retailer page and confirm FSA eligibility at checkout.
          </span>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 18, fontSize: '0.84rem', color: '#b91c1c', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Loading spinner */}
        {loading && (
          <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: '2rem', marginBottom: 12, animation: 'spin 1s linear infinite' }}>🔄</div>
            <p style={{ color: '#64748b', margin: 0 }}>Searching {rc.label} for FSA-eligible products via Tavily…</p>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* AI Answer */}
        {answer && !loading && (
          <div style={{ background: 'linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%)', border: '1px solid #c7d2fe', borderRadius: 12, padding: '14px 18px', marginBottom: 18, fontSize: '0.88rem', color: '#3730a3' }}>
            <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🤖</span> Tavily AI Summary
              {usedTavily && <span style={{ fontSize: '0.72rem', background: '#16a34a', color: 'white', padding: '2px 8px', borderRadius: 10 }}>Live Results</span>}
            </div>
            <p style={{ margin: 0, lineHeight: 1.5, color: '#4338ca' }}>{answer}</p>
          </div>
        )}

        {/* No results */}
        {searched && !loading && products.length === 0 && !error && (
          <div style={{ background: 'white', borderRadius: 12, padding: 32, textAlign: 'center', color: '#94a3b8' }}>
            No results found. Try a different search term or category chip above.
          </div>
        )}

        {/* Results header */}
        {!loading && products.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{products.length} FSA-eligible products</span>
            <span style={{ background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`, padding: '3px 12px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 700 }}>
              {rc.logo} {rc.label} · {rc.badge}
            </span>
            {usedTavily && (
              <span style={{ background: '#dcfce7', color: '#16a34a', padding: '3px 10px', borderRadius: 12, fontSize: '0.76rem', fontWeight: 700 }}>
                ⚡ Live Tavily Search
              </span>
            )}
            {!usedTavily && searched && (
              <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: 12, fontSize: '0.76rem', fontWeight: 600 }}>
                📋 Cached Data
              </span>
            )}
          </div>
        )}

        {/* Product cards */}
        <div style={{ display: 'grid', gap: 12 }}>
          {!loading && products.map((p, i) => {
            const link = p.url || '#';
            const hasPrice = p.price != null;
            const icon = CATEGORY_ICONS[query?.toLowerCase()] || '🏥';

            return (
              <div key={i} style={{ background: 'white', borderRadius: 13, padding: '18px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: i === 0 && hasPrice ? '2px solid #16a34a' : '2px solid transparent', transition: 'box-shadow 0.2s', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)'}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    {i === 0 && hasPrice && <span style={{ background: '#dcfce7', color: '#16a34a', padding: '3px 11px', borderRadius: 12, fontSize: '0.76rem', fontWeight: 800 }}>🏆 BEST PRICE</span>}
                    <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '3px 10px', borderRadius: 12, fontSize: '0.76rem', fontWeight: 600 }}>✅ FSA Eligible</span>
                    <span style={{ background: rc.bg, color: rc.color, padding: '3px 10px', borderRadius: 12, fontSize: '0.76rem', fontWeight: 600 }}>{rc.logo} {rc.label}</span>
                    {p.score != null && (
                      <span style={{ background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem' }}>
                        relevance: {(p.score * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.97rem', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {icon} {p.name}
                  </div>
                  {p.content && (
                    <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.4, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {p.content}
                    </div>
                  )}
                  {p.rating && (
                    <div style={{ color: '#94a3b8', fontSize: '0.83rem' }}>
                      {'⭐'.repeat(Math.floor(p.rating))} {p.rating}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 20 }}>
                  {hasPrice && (
                    <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#1a73e8', marginBottom: 6 }}>${p.price.toFixed(2)}</div>
                  )}
                  {!hasPrice && (
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>See price →</div>
                  )}
                  <a href={link} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-block', background: rc.color, color: 'white', padding: '8px 16px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    View on {rc.label} →
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        {searched && !loading && products.length > 0 && (
          <div style={{ marginTop: 20, padding: '14px 18px', background: 'white', borderRadius: 10, fontSize: '0.82rem', color: '#94a3b8', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            💡 {usedTavily ? 'Results powered by Tavily AI Search — live web data.' : 'Showing cached product data.'} Click "View on {rc.label}" to see the current live price and confirm FSA eligibility at checkout.
          </div>
        )}
      </div>
    </div>
  );
}
