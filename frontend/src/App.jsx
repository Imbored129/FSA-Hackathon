import React, { useState } from 'react';
import axios from 'axios';

// --- MOCK DATA FOR MULTIPLE USERS ---
const MOCK_USERS = {
  'alice@example.com': {
    name: 'Alice Johnson',
    balance: 1250.00,
    employer: 'TechCorp Inc.',
    planType: 'Standard Healthcare FSA',
    transactions: [
      { id: 1, date: '2026-04-10', merchant: 'Walgreens', amount: 35.50, status: 'Approved', item: 'Allergy Meds' },
      { id: 2, date: '2026-04-15', merchant: 'Amazon', amount: 15.00, status: 'Approved', item: 'Bandages' },
      { id: 3, date: '2026-04-20', merchant: 'EyeCare Plus', amount: 120.00, status: 'Pending Review', item: 'Contact Lenses' }
    ]
  },
  'bob@example.com': {
    name: 'Bob Smith',
    balance: 540.25,
    employer: 'Design Studios LLC',
    planType: 'Limited Purpose FSA',
    transactions: [
      { id: 4, date: '2026-03-05', merchant: 'Dentist Office', amount: 200.00, status: 'Approved', item: 'Teeth Cleaning' },
      { id: 5, date: '2026-04-02', merchant: 'Walmart', amount: 45.20, status: 'Approved', item: 'First Aid Kit' }
    ]
  }
};

// --- EXISTING SEARCH APP CONSTANTS ---
const API_BASE = 'http://localhost:8001';
const CATEGORIES = ['allergy', 'bandages', 'contact lenses', 'pain relief', 'eye drops'];

const RETAILER_CONFIG = {
  amazon:   { label: 'Amazon',    color: '#FF9900', bg: '#FFF8EE', border: '#FFE0AA', logo: '📦', badge: 'FSA Eligible ✓' },
  walmart:  { label: 'Walmart',   color: '#0071CE', bg: '#EEF6FF', border: '#B3D7F5', logo: '🏪', badge: 'FSA Eligible ✓' },
  walgreens:{ label: 'Walgreens', color: '#E31837', bg: '#FFF0F3', border: '#FFAAB8', logo: '💊', badge: 'FSA Eligible ✓' },
  cvs:      { label: 'CVS',       color: '#CC0000', bg: '#FCE6E6', border: '#EB9999', logo: '❤️',  badge: 'FSA Eligible ✓' },
  fsastore: { label: 'FSA Store', color: '#00B140', bg: '#E6F8EB', border: '#99E1B3', logo: '🛒', badge: '100% FSA Eligible ✓' },
};

const CATEGORY_ICONS = { allergy: '💊', bandages: '🩹', 'contact lenses': '👁️', 'pain relief': '💊', 'eye drops': '💧' };


// --- COMPONENTS ---

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLogin = (user) => {
    setCurrentUser(user);
    setTransactions(user.transactions || []);
  };

  const addTransaction = (tx) => setTransactions(prev => [tx, ...prev]);
  const removeTransaction = (id) => setTransactions(prev => prev.filter(t => t.id !== id));

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div style={styles.appContainer}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={() => { setCurrentUser(null); setTransactions([]); }} />
      <div style={styles.mainContent}>
        <Header user={currentUser} activeTab={activeTab} />
        <div style={styles.contentArea}>
          {activeTab === 'dashboard' && <Dashboard user={currentUser} transactions={transactions} />}
          {activeTab === 'profile' && <Profile user={currentUser} />}
          {activeTab === 'upload' && <UploadTransactions addTransaction={addTransaction} />}
          {activeTab === 'transactions' && <TransactionHistory transactions={transactions} removeTransaction={removeTransaction} />}
          {activeTab === 'search' && <ProductSearch />}
        </div>
      </div>
    </div>
  );
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('alice@example.com');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (MOCK_USERS[email]) {
      setError('');
      onLogin({ email, ...MOCK_USERS[email] });
    } else {
      setError('User not found. Try alice@example.com or bob@example.com');
    }
  };

  return (
    <div style={styles.loginContainer}>
      <div style={styles.loginCard}>
        <h2 style={{marginTop: 0, color: '#1a73e8'}}>FSA Smart App</h2>
        <p style={{color: '#64748b'}}>Sign in to access your FSA dashboard</p>
        <form onSubmit={handleLogin} style={{display: 'flex', flexDirection: 'column', gap: 15}}>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="Email address"
            style={styles.input}
          />
          {error && <span style={{color: 'red', fontSize: '0.85rem'}}>{error}</span>}
          <button type="submit" style={styles.primaryButton}>Sign In</button>
        </form>
        <div style={{marginTop: 20, fontSize: '0.8rem', color: '#94a3b8'}}>
          Test accounts: alice@example.com, bob@example.com
        </div>
      </div>
    </div>
  );
}

function Sidebar({ activeTab, setActiveTab, onLogout }) {
  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'transactions', label: '💳 Transactions' },
    { id: 'upload', label: '📤 Upload Transactions' },
    { id: 'search', label: '🔍 Shop FSA' },
    { id: 'profile', label: '👤 Profile' },
  ];

  return (
    <div style={styles.sidebar}>
      <h2 style={styles.sidebarTitle}>⚕️ FSA Compass</h2>
      <div style={styles.navMenu}>
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...styles.navButton,
              ...(activeTab === tab.id ? styles.navButtonActive : {})
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <button onClick={onLogout} style={styles.logoutButton}>🚪 Logout</button>
    </div>
  );
}

function Header({ user, activeTab }) {
  const tabTitles = {
    dashboard: 'Overview', transactions: 'Transaction History', 
    upload: 'Upload Transactions', search: 'FSA Product Finder', profile: 'My Profile'
  };

  return (
    <div style={styles.header}>
      <h2 style={{margin: 0, fontSize: '1.5rem'}}>{tabTitles[activeTab]}</h2>
      <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
        <div style={styles.avatar}>{user.name.charAt(0)}</div>
        <span style={{fontWeight: 600, color: '#334155'}}>{user.name}</span>
      </div>
    </div>
  );
}

function Dashboard({ user, transactions }) {
  return (
    <div>
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Available Balance</div>
          <div style={{...styles.statValue, color: '#10b981'}}>${user.balance.toFixed(2)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Spent (YTD)</div>
          <div style={styles.statValue}>${(transactions.reduce((acc, t) => acc + (t.amount || 0), 0)).toFixed(2)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Pending Claims</div>
          <div style={{...styles.statValue, color: '#f59e0b'}}>
            {transactions.filter(t => t.status !== 'Approved').length}
          </div>
        </div>
      </div>

      <div style={{...styles.card, marginTop: 24}}>
        <h3 style={{marginTop: 0}}>Recent Activity</h3>
        {transactions.slice(0, 2).map(t => (
          <div key={t.id} style={styles.transactionRow}>
            <div>
              <div style={{fontWeight: 600}}>{t.merchant}</div>
              <div style={{fontSize: '0.85rem', color: '#64748b'}}>{t.date}</div>
            </div>
            <div style={{textAlign: 'right'}}>
              <div style={{fontWeight: 700}}>${(t.amount || 0).toFixed(2)}</div>
              <span style={{fontSize: '0.8rem', color: t.status === 'Approved' ? '#10b981' : '#f59e0b'}}>{t.status}</span>
            </div>
          </div>
        ))}
        {transactions.length === 0 && <p style={{color: '#94a3b8', margin: 0}}>No transactions yet.</p>}
      </div>
    </div>
  );
}

function Profile({ user }) {
  return (
    <div style={styles.card}>
      <h3 style={{marginTop: 0}}>Personal Information</h3>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20}}>
        <div>
          <label style={styles.label}>Full Name</label>
          <div style={styles.infoText}>{user.name}</div>
        </div>
        <div>
          <label style={styles.label}>Email Address</label>
          <div style={styles.infoText}>{user.email}</div>
        </div>
        <div>
          <label style={styles.label}>Employer</label>
          <div style={styles.infoText}>{user.employer}</div>
        </div>
        <div>
          <label style={styles.label}>Plan Type</label>
          <div style={styles.infoText}>{user.planType}</div>
        </div>
      </div>
    </div>
  );
}

function UploadTransactions({ addTransaction }) {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [previews, setPreviews] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setPreviews(null);
    setError(null);
    setSuccess(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setParsing(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const resp = await axios.post(`${API_BASE}/api/parse-receipt`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const data = Array.isArray(resp.data) ? resp.data : [resp.data];
      setPreviews(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to parse file. Supported: JPG, PNG, WEBP, XLSX.');
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmAll = () => {
    previews.forEach(tx => addTransaction(tx));
    setPreviews(null);
    setFile(null);
    setSuccess(true);
  };

  return (
    <div style={styles.card}>
      <h3 style={{marginTop: 0}}>Upload Transaction Receipt</h3>
      <p style={{color: '#64748b', marginBottom: 20}}>
        Upload a receipt image or Excel spreadsheet — Claude AI extracts the transaction details automatically.
      </p>

      {success && (
        <div style={{padding: 12, background: '#dcfce7', color: '#166534', borderRadius: 8, marginBottom: 20}}>
          ✅ Transaction(s) added successfully.
        </div>
      )}

      {!previews && (
        <form onSubmit={handleUpload}>
          <div style={{border: '2px dashed #cbd5e1', padding: 40, borderRadius: 12, textAlign: 'center', marginBottom: 20}}>
            <input type="file" accept="image/*,.xlsx" onChange={handleFileChange} style={{display: 'block', margin: '0 auto'}} />
            <p style={{color: '#94a3b8', fontSize: '0.85rem', marginTop: 12, marginBottom: 0}}>Supported: JPG, PNG, WEBP, XLSX</p>
          </div>
          {error && <div style={{color: '#b91c1c', marginBottom: 12, fontSize: '0.9rem'}}>⚠️ {error}</div>}
          <button type="submit" disabled={!file || parsing} style={{...styles.primaryButton, opacity: (!file || parsing) ? 0.5 : 1}}>
            {parsing ? '🤖 Analyzing...' : '📤 Parse File'}
          </button>
        </form>
      )}

      {previews && (
        <div>
          <h4 style={{marginTop: 0, color: '#1e293b'}}>
            {previews.length} transaction{previews.length !== 1 ? 's' : ''} extracted — confirm to add
          </h4>
          <div style={{display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20}}>
            {previews.map((tx, i) => (
              <div key={i} style={{border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 18px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr', gap: 16, alignItems: 'center'}}>
                <div>
                  <label style={styles.label}>Merchant</label>
                  <div style={styles.infoText}>{tx.merchant}</div>
                </div>
                <div>
                  <label style={styles.label}>Amount</label>
                  <div style={{...styles.infoText, fontWeight: 700, color: '#1a73e8'}}>${(tx.amount || 0).toFixed(2)}</div>
                </div>
                <div>
                  <label style={styles.label}>Date</label>
                  <div style={styles.infoText}>{tx.date}</div>
                </div>
                <div>
                  <label style={styles.label}>Item</label>
                  <div style={styles.infoText}>{tx.item}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{display: 'flex', gap: 12}}>
            <button onClick={handleConfirmAll} style={styles.primaryButton}>
              ✅ Add {previews.length !== 1 ? `All ${previews.length} Transactions` : 'Transaction'}
            </button>
            <button onClick={() => { setPreviews(null); setFile(null); }} style={{...styles.primaryButton, background: '#f1f5f9', color: '#64748b'}}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TransactionHistory({ transactions, removeTransaction }) {
  const [confirmingId, setConfirmingId] = useState(null);

  const handleRemoveClick = (id) => {
    if (confirmingId === id) {
      removeTransaction(id);
      setConfirmingId(null);
    } else {
      setConfirmingId(id);
    }
  };

  return (
    <div style={styles.card}>
      <h3 style={{marginTop: 0}}>All Transactions</h3>
      {transactions.length === 0 && <p style={{color: '#94a3b8'}}>No transactions yet. Upload a receipt to add one.</p>}
      <table style={{width: '100%', borderCollapse: 'collapse'}}>
        <thead>
          <tr style={{borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b'}}>
            <th style={{padding: '12px 0'}}>Date</th>
            <th>Merchant</th>
            <th>Item</th>
            <th>Amount</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(t => (
            <tr key={t.id} style={{borderBottom: '1px solid #f1f5f9'}}>
              <td style={{padding: '16px 0'}}>{t.date}</td>
              <td style={{fontWeight: 600}}>{t.merchant}</td>
              <td>{t.item}</td>
              <td style={{fontWeight: 700}}>${(t.amount || 0).toFixed(2)}</td>
              <td>
                <span style={{
                  background: t.status === 'Approved' ? '#dcfce7' : '#fef3c7',
                  color: t.status === 'Approved' ? '#166534' : '#92400e',
                  padding: '4px 8px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 600
                }}>
                  {t.status}
                </span>
              </td>
              <td style={{paddingLeft: 12}}>
                {confirmingId === t.id ? (
                  <div style={{display: 'flex', gap: 6, alignItems: 'center'}}>
                    <span style={{fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600, whiteSpace: 'nowrap'}}>Remove?</span>
                    <button onClick={() => handleRemoveClick(t.id)} style={{background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem'}}>
                      Yes
                    </button>
                    <button onClick={() => setConfirmingId(null)} style={{background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem'}}>
                      No
                    </button>
                  </div>
                ) : (
                  <button onClick={() => handleRemoveClick(t.id)} style={{background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600}}>
                    Remove
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- EXISTING SEARCH FEATURE INTEGRATED ---
function ProductSearch() {
  const [query, setQuery] = useState('');
  const [retailer, setRetailer] = useState('amazon');
  const [products, setProducts] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [answer, setAnswer] = useState(null);
  const [usedTavily, setUsedTavily] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (cat) => {
    const q = (cat || query).trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setSearched(true);
    setAnswer(null);

    try {
      const resp = await axios.get(`${API_BASE}/api/search/all`, { params: { query: q }, timeout: 45000 });
      const data = resp.data;
      setProducts(data.products || []);
      setAnswer(data.answer);
      setUsedTavily(data.used_tavily);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Could not reach the backend. Make sure it is running on port 8001.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const rc = RETAILER_CONFIG[retailer];

  return (
    <div>
      <div style={styles.card}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search FSA products: allergy medicine, bandages..."
            style={styles.input}
          />
          <button onClick={() => handleSearch()} disabled={loading} style={styles.primaryButton}>
            {loading ? '⏳ Searching...' : '🔍 Search'}
          </button>
        </div>


      </div>

      {error && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '12px 16px', borderRadius: 10, marginTop: 18 }}>⚠️ {error}</div>}
      
      {answer && !loading && (
        <div style={{ background: '#ede9fe', border: '1px solid #c7d2fe', borderRadius: 12, padding: '14px 18px', marginTop: 18, color: '#3730a3' }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>🤖 Tavily AI Summary</div>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>{answer}</p>
        </div>
      )}

      {searched && !loading && products.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No results found.</div>
      )}

      {products.length > 0 && !loading && (
        <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
          {products.map((p, i) => {
            const rc = RETAILER_CONFIG[p.source] || RETAILER_CONFIG[p.retailer] || RETAILER_CONFIG.amazon;
            return (
              <a 
                key={i} 
                href={p.url || '#'} 
                target="_blank" 
                rel="noreferrer"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{ background: 'white', borderRadius: 13, padding: '18px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.2s', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '3px 10px', borderRadius: 12, fontSize: '0.76rem', fontWeight: 600 }}>✅ FSA Eligible</span>
                      <span style={{ background: rc.bg, color: rc.color, padding: '3px 10px', borderRadius: 12, fontSize: '0.76rem', fontWeight: 600 }}>{rc.logo} {rc.label}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.97rem', marginBottom: 4 }}>{p.name}</div>
                    {p.rating && <div style={{ color: '#94a3b8', fontSize: '0.83rem' }}>⭐ {p.rating}</div>}
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 100 }}>
                    {p.price != null ? <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1a73e8', marginBottom: 6 }}>${p.price.toFixed(2)}</div> : <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 6 }}>See price →</div>}
                    <div style={{ display: 'inline-block', background: rc.color, color: 'white', padding: '8px 16px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700 }}>View →</div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- STYLES ---
const styles = {
  appContainer: { display: 'flex', minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif", background: '#f8fafc' },
  sidebar: { width: 260, background: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' },
  sidebarTitle: { padding: '24px', margin: 0, fontSize: '1.5rem', color: '#1e293b', borderBottom: '1px solid #e2e8f0' },
  navMenu: { padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 },
  navButton: { padding: '12px 16px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '1rem', color: '#64748b', borderRadius: 8, cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s' },
  navButtonActive: { background: '#eff6ff', color: '#1d4ed8', fontWeight: 600 },
  logoutButton: { margin: '20px', padding: '12px', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  mainContent: { flex: 1, display: 'flex', flexDirection: 'column' },
  header: { background: 'white', padding: '24px 40px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  contentArea: { padding: '40px', overflowY: 'auto', flex: 1 },
  avatar: { width: 36, height: 36, borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  card: { background: 'white', padding: 24, borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 },
  statCard: { background: 'white', padding: 24, borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  statLabel: { color: '#64748b', fontSize: '0.9rem', fontWeight: 600, marginBottom: 8 },
  statValue: { fontSize: '2rem', fontWeight: 800, color: '#1e293b' },
  transactionRow: { display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #f1f5f9' },
  label: { display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: 4, fontWeight: 600 },
  infoText: { fontSize: '1.05rem', color: '#1e293b', fontWeight: 500 },
  input: { flex: 1, padding: '12px 16px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' },
  primaryButton: { padding: '12px 24px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '1rem', cursor: 'pointer' },
  loginContainer: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: "'Inter', sans-serif" },
  loginCard: { background: 'white', padding: 40, borderRadius: 16, width: '100%', maxWidth: 400, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }
};
