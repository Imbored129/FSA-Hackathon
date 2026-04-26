import React, { useState } from 'react';
import axios from 'axios';

// --- USER DATA ---
const INITIAL_USERS = {
  'alice@example.com': {
    name: 'Alice Johnson',
    email: 'alice@example.com',
    phone: '(555) 123-4567',
    dob: '1985-06-15',
    employeeId: 'EMP-98234',
    address: '123 Tech Lane, San Francisco, CA',
    balance: 1250.00,
    totalElection: 2500.00,
    employer: 'TechCorp Inc.',
    planType: 'Standard Healthcare FSA',
    conditions: ['Asthma', 'Seasonal Allergies'],
    transactions: [
      { id: 1, date: '2026-04-10', merchant: 'Walgreens', amount: 35.50, status: 'Approved', item: 'Allergy Meds' },
      { id: 2, date: '2026-04-15', merchant: 'Amazon', amount: 15.00, status: 'Approved', item: 'Bandages' },
      { id: 3, date: '2026-04-20', merchant: 'EyeCare Plus', amount: 120.00, status: 'Pending Review', item: 'Contact Lenses' }
    ]
  },
  'bob@example.com': {
    name: 'Bob Smith',
    email: 'bob@example.com',
    phone: '(555) 987-6543',
    dob: '1990-11-22',
    employeeId: 'EMP-44512',
    address: '456 Creative Blvd, Austin, TX',
    balance: 540.25,
    totalElection: 1000.00,
    employer: 'Design Studios LLC',
    planType: 'Limited Purpose FSA',
    conditions: ['Myopia', 'Sensitive Teeth'],
    transactions: [
      { id: 4, date: '2026-03-05', merchant: 'Dentist Office', amount: 200.00, status: 'Approved', item: 'Teeth Cleaning' },
      { id: 5, date: '2026-04-02', merchant: 'Walmart', amount: 45.20, status: 'Approved', item: 'First Aid Kit' }
    ]
  }
};

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8001';
const CATEGORIES = ['allergy', 'bandages', 'contact lenses', 'pain relief', 'eye drops'];

const RETAILER_CONFIG = {
  amazon:    { label: 'Amazon',    color: '#FF9900', bg: '#FFF8EE', border: '#FFE0AA', logo: '📦', badge: 'FSA Eligible ✓' },
  walmart:   { label: 'Walmart',   color: '#0071CE', bg: '#EEF6FF', border: '#B3D7F5', logo: '🏪', badge: 'FSA Eligible ✓' },
  walgreens: { label: 'Walgreens', color: '#E31837', bg: '#FFF0F3', border: '#FFAAB8', logo: '💊', badge: 'FSA Eligible ✓' },
  cvs:       { label: 'CVS',       color: '#CC0000', bg: '#FCE6E6', border: '#EB9999', logo: '❤️',  badge: 'FSA Eligible ✓' },
  fsastore:  { label: 'FSA Store', color: '#00B140', bg: '#E6F8EB', border: '#99E1B3', logo: '🛒', badge: '100% FSA Eligible ✓' },
};

const CATEGORY_ICONS = { allergy: '💊', bandages: '🩹', 'contact lenses': '👁️', 'pain relief': '💊', 'eye drops': '💧' };


// --- APP ---

export default function App() {
  const [usersData, setUsersData] = React.useState(INITIAL_USERS);
  const [currentUserEmail, setCurrentUserEmail] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState('dashboard');

  const user = usersData[currentUserEmail];

  const handleAddFunds = (amount) => {
    setUsersData(prev => ({
      ...prev,
      [currentUserEmail]: { ...prev[currentUserEmail], balance: prev[currentUserEmail].balance + amount, totalElection: prev[currentUserEmail].totalElection + amount }
    }));
  };

  const handleUpdateProfile = (updatedProfile) => {
    setUsersData(prev => ({ ...prev, [currentUserEmail]: { ...prev[currentUserEmail], ...updatedProfile } }));
  };

  const handleAddTransaction = (newTx) => {
    setUsersData(prev => ({
      ...prev,
      [currentUserEmail]: {
        ...prev[currentUserEmail],
        transactions: [{ ...newTx, id: newTx.id || Date.now() }, ...prev[currentUserEmail].transactions],
        balance: prev[currentUserEmail].balance - (newTx.amount || 0)
      }
    }));
  };

  const handleRemoveTransaction = (id) => {
    const tx = usersData[currentUserEmail]?.transactions.find(t => t.id === id);
    setUsersData(prev => ({
      ...prev,
      [currentUserEmail]: {
        ...prev[currentUserEmail],
        transactions: prev[currentUserEmail].transactions.filter(t => t.id !== id),
        balance: prev[currentUserEmail].balance + (tx?.amount || 0)
      }
    }));
  };

  if (!user) {
    return <Login usersData={usersData} onLogin={setCurrentUserEmail} />;
  }

  return (
    <div style={styles.appContainer}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={() => setCurrentUserEmail(null)} />
      <div style={styles.mainContent}>
        <Header user={user} activeTab={activeTab} />
        <div style={styles.contentArea}>
          {activeTab === 'dashboard'     && <Dashboard user={user} />}
          {activeTab === 'profile'       && <Profile user={user} onAddFunds={handleAddFunds} onUpdateProfile={handleUpdateProfile} />}
          {activeTab === 'upload'        && <UploadTransactions addTransaction={handleAddTransaction} />}
          {activeTab === 'transactions'  && <TransactionHistory user={user} onAddTransaction={handleAddTransaction} onRemoveTransaction={handleRemoveTransaction} />}
          {activeTab === 'search'        && <ProductSearch />}
        </div>
      </div>
    </div>
  );
}

// --- LOGIN ---

function Login({ usersData, onLogin }) {
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const formatted = email.toLowerCase().trim();
    if (usersData[formatted]) { setError(''); onLogin(formatted); }
    else setError('Account not found. Please try a registered email.');
  };

  return (
    <div style={styles.loginContainer}>
      <div style={styles.loginCard}>
        <h2 style={{ marginTop: 0, color: '#1a73e8' }}>FSAwise</h2>
        <p style={{ color: '#64748b' }}>Sign in to access your FSA dashboard</p>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <input
            type="email" placeholder="Enter your email address" value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ padding: '12px 16px', borderRadius: 8, border: `1px solid ${error ? '#ef4444' : '#cbd5e1'}`, fontSize: '1rem', outline: 'none' }}
            required
          />
          {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}
          <button type="submit" style={styles.primaryButton}>Sign In</button>
        </form>
        <div style={{ marginTop: 24, fontSize: '0.85rem', color: '#64748b', background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', lineHeight: 1.5 }}>
          <strong style={{ color: '#334155' }}>Demo Accounts:</strong><br />
          • alice@example.com<br />• bob@example.com
        </div>
      </div>
    </div>
  );
}

// --- SIDEBAR ---

function Sidebar({ activeTab, setActiveTab, onLogout }) {
  const tabs = [
    { id: 'dashboard',    label: '📊 Dashboard' },
    { id: 'transactions', label: '💳 Transactions' },
    { id: 'upload',       label: '📤 Upload Transactions' },
    { id: 'search',       label: '🔍 Shop FSA' },
    { id: 'profile',      label: '👤 Profile' },
  ];
  return (
    <div style={styles.sidebar}>
      <h2 style={styles.sidebarTitle}>⚕️ FSAwise</h2>
      <div style={styles.navMenu}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ ...styles.navButton, ...(activeTab === tab.id ? styles.navButtonActive : {}) }}>
            {tab.label}
          </button>
        ))}
      </div>
      <button onClick={onLogout} style={styles.logoutButton}>🚪 Logout</button>
    </div>
  );
}

// --- HEADER ---

function Header({ user, activeTab }) {
  const titles = { dashboard: 'Overview', transactions: 'Transaction History', upload: 'Upload Transactions', search: 'FSA Product Finder', profile: 'My Profile' };
  return (
    <div style={styles.header}>
      <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{titles[activeTab]}</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={styles.avatar}>{user.name.charAt(0)}</div>
        <span style={{ fontWeight: 600, color: '#334155' }}>{user.name}</span>
      </div>
    </div>
  );
}

// --- DASHBOARD ---

function Dashboard({ user }) {
  const spent = user.transactions.reduce((acc, t) => acc + t.amount, 0);
  const total = user.totalElection || (user.balance + spent);
  const percentSpent = Math.min(100, Math.round((spent / total) * 100));

  const [recommendations, setRecommendations] = React.useState([]);
  const [loadingRecs, setLoadingRecs] = React.useState(false);

  React.useEffect(() => {
    async function fetchRecs() {
      setLoadingRecs(true);
      try {
        let q = 'first aid kit';
        if (user.conditions.includes('Asthma')) q = 'inhaler spacer';
        else if (user.conditions.includes('Seasonal Allergies')) q = 'allergy medicine';
        else if (user.conditions.includes('Myopia')) q = 'contact lens solution';
        else if (user.conditions.includes('Sensitive Teeth')) q = 'water flosser';

        const resp = await axios.get(`${API_BASE}/api/search/all`, { params: { query: q }, timeout: 30000 });
        setRecommendations((resp.data.products || []).slice(0, 3));
      } catch (e) { console.error(e); }
      finally { setLoadingRecs(false); }
    }
    fetchRecs();
  }, [user.email]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)', borderRadius: 20, padding: '36px 40px', color: 'white', boxShadow: '0 10px 25px -5px rgba(14,165,233,0.4)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ margin: '0 0 10px', fontSize: '2.4rem', fontWeight: 800 }}>Welcome back, {user.name.split(' ')[0]}! 👋</h1>
          <p style={{ margin: 0, opacity: 0.95, fontSize: '1.15rem', fontWeight: 500 }}>Here is the latest overview of your {user.planType}.</p>
        </div>
        <div style={{ position: 'absolute', right: -20, top: -40, fontSize: 180, opacity: 0.15, transform: 'rotate(-10deg)' }}>💳</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ ...styles.card, padding: 32 }}>
            <h3 style={{ marginTop: 0, color: '#1e293b', fontSize: '1.3rem', marginBottom: 20 }}>FSA Utilization</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase' }}>Spent YTD</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>${spent.toFixed(2)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase' }}>Available Balance</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>${user.balance.toFixed(2)}</div>
              </div>
            </div>
            <div style={{ width: '100%', height: 14, background: '#e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ width: `${percentSpent}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #06b6d4)', borderRadius: 10, transition: 'width 1s ease-in-out' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600 }}>
              <span>{percentSpent}% Used</span>
              <span>Total Election: ${total.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ ...styles.card, padding: 32, borderTop: '5px solid #8b5cf6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.3rem' }}>🩺 Health Profile Analytics</h3>
              <span style={{ fontSize: '0.8rem', background: '#f3f4f6', padding: '6px 12px', borderRadius: 20, color: '#4b5563', fontWeight: 700 }}>
                <span style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%', display: 'inline-block', marginRight: 6 }} />Records Synced
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: 24, lineHeight: 1.5 }}>
              Based on your medical records, our AI has identified specific health conditions to help you maximize your FSA benefits.
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {user.conditions.map(cond => (
                <div key={cond} style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '16px 20px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 14, cursor: 'default' }}>
                  <div style={{ fontSize: '1.8rem', background: 'white', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>
                    {cond.includes('Asthma') ? '🫁' : cond.includes('Allerg') ? '🤧' : cond.includes('Myopia') ? '👓' : '🦷'}
                  </div>
                  <div>
                    <div style={{ color: '#4c1d95', fontWeight: 800, fontSize: '1.05rem', marginBottom: 2 }}>{cond}</div>
                    <div style={{ color: '#7c3aed', fontSize: '0.85rem', fontWeight: 600 }}>Active Condition</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 28, background: '#f8fafc', padding: 20, borderRadius: 16, borderLeft: '4px solid #3b82f6' }}>
              <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 12, fontSize: '0.95rem' }}>💡 Recommended FSA Categories:</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {user.conditions.includes('Asthma') && <><span style={styles.tag}>Air Purifiers</span><span style={styles.tag}>Inhalers & Spacers</span></>}
                {user.conditions.includes('Seasonal Allergies') && <span style={styles.tag}>Allergy Medication</span>}
                {user.conditions.includes('Myopia') && <span style={styles.tag}>Contact Lenses</span>}
                {user.conditions.includes('Sensitive Teeth') && <span style={styles.tag}>Water Flossers</span>}
              </div>
            </div>
          </div>
        </div>

        <div style={{ ...styles.card, padding: 28, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 28px', color: '#1e293b', fontSize: '1.25rem' }}>Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
            {user.transactions.slice(0, 5).map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: '#f8fafc', borderRadius: 16, border: '1px solid transparent', transition: 'all 0.2s', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: t.status === 'Approved' ? '#dcfce7' : '#fef3c7', color: t.status === 'Approved' ? '#16a34a' : '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                    {t.status === 'Approved' ? '✓' : '⌛'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem', marginBottom: 4 }}>{t.merchant}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>{t.date}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.1rem', marginBottom: 4 }}>${t.amount.toFixed(2)}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: t.status === 'Approved' ? '#10b981' : '#f59e0b' }}>{t.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ ...styles.card, padding: 32 }}>
        <h3 style={{ margin: '0 0 20px', color: '#1e293b', fontSize: '1.3rem' }}>🛍️ AI Recommendations for Your Conditions</h3>
        {loadingRecs ? (
          <div style={{ color: '#64748b', fontSize: '0.95rem' }}>⏳ AI is scanning retailers for the best tailored FSA products for your profile...</div>
        ) : recommendations.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
            {recommendations.map((p, i) => {
              const rc = RETAILER_CONFIG[p.source] || RETAILER_CONFIG.amazon;
              return (
                <a key={i} href={p.url || '#'} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, transition: 'all 0.2s', cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.06)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                    <div>
                      <div style={{ display: 'inline-block', background: rc.bg, color: rc.color, padding: '4px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700, marginBottom: 12 }}>{rc.logo} {rc.label}</div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.4, color: '#0f172a' }}>{p.name}</div>
                    </div>
                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1a73e8' }}>{p.price != null ? `$${p.price.toFixed(2)}` : 'See price'}</div>
                      <div style={{ fontSize: '0.85rem', color: rc.color, fontWeight: 800 }}>Buy Now →</div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <div style={{ color: '#94a3b8' }}>No recommendations available right now.</div>
        )}
      </div>
    </div>
  );
}

// --- PROFILE ---

function Profile({ user, onAddFunds, onUpdateProfile }) {
  const spent = user.transactions.reduce((acc, t) => acc + t.amount, 0);
  const total = user.totalElection || (user.balance + spent);
  const percentSpent = Math.min(100, Math.round((spent / total) * 100));
  const [fundAmount, setFundAmount] = React.useState('');
  const [isEditing, setIsEditing] = React.useState(false);
  const [formData, setFormData] = React.useState({});
  const [errors, setErrors] = React.useState({});

  const handleAdjustFunds = (isDeposit) => {
    const amt = parseFloat(fundAmount);
    if (!isNaN(amt) && amt > 0) { onAddFunds(isDeposit ? amt : -amt); setFundAmount(''); }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setFormData({ name: user.name, employeeId: user.employeeId, phone: user.phone, dob: user.dob, address: user.address });
    setErrors({});
  };

  const handleSaveClick = () => {
    const newErrors = {};
    ['name', 'employeeId', 'phone', 'dob', 'address'].forEach(f => { if (!formData[f]?.trim()) newErrors[f] = true; });
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    onUpdateProfile(formData);
    setIsEditing(false);
  };

  const renderField = (label, field) => {
    const isError = errors[field];
    return (
      <div>
        <div style={{ fontSize: '0.8rem', color: isError ? '#ef4444' : '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
          {label}{isError && <span style={{ color: '#ef4444' }}> * Required</span>}
        </div>
        {isEditing
          ? <input value={formData[field]} onChange={e => setFormData({ ...formData, [field]: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${isError ? '#ef4444' : '#cbd5e1'}`, borderRadius: 6, fontSize: '1rem', outline: 'none', background: isError ? '#fef2f2' : 'white', boxSizing: 'border-box' }} />
          : <div style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 500 }}>{user[field]}</div>}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ ...styles.card, padding: 32, display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '2.5rem', fontWeight: 800, flexShrink: 0 }}>
          {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
        </div>
        <div style={{ flex: 1 }}>
          {isEditing
            ? <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                style={{ fontSize: '1.8rem', fontWeight: 'bold', padding: '4px 8px', border: `1px solid ${errors.name ? '#ef4444' : '#cbd5e1'}`, borderRadius: 6, outline: 'none', width: '100%', maxWidth: 300 }} />
            : <h2 style={{ margin: '0 0 8px', fontSize: '2rem', color: '#0f172a' }}>{user.name}</h2>}
          <div style={{ display: 'flex', gap: 16, color: '#64748b', fontSize: '0.95rem', fontWeight: 500 }}>
            <span>✉️ {user.email}</span><span>🏢 {user.employer}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
        <div style={{ ...styles.card, padding: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: 12, marginBottom: 24 }}>
            <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#1e293b' }}>Personal Information</h3>
            {isEditing
              ? <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setIsEditing(false)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                  <button onClick={handleSaveClick} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#10b981', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Save</button>
                </div>
              : <button onClick={handleEditClick} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 600 }}>✏️ Edit</button>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {renderField('Employee ID', 'employeeId')}
            {renderField('Phone Number', 'phone')}
            {renderField('Date of Birth', 'dob')}
            {renderField('Home Address', 'address')}
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Registered Conditions</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                {user.conditions.map(c => <span key={c} style={styles.tag}>{c}</span>)}
              </div>
            </div>
          </div>
        </div>

        <div style={{ ...styles.card, padding: 32, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 24px', fontSize: '1.3rem', color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: 12 }}>FSA Financial Hub</h3>
          <div style={{ background: '#f8fafc', padding: 24, borderRadius: 16, marginBottom: 24 }}>
            <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Current Balance</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10b981', margin: '4px 0 16px' }}>${user.balance.toFixed(2)}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569', fontWeight: 600, marginBottom: 8 }}>
              <span>Budget Meter</span><span>{percentSpent}% Used</span>
            </div>
            <div style={{ width: '100%', height: 10, background: '#e2e8f0', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ width: `${percentSpent}%`, height: '100%', background: percentSpent > 80 ? '#ef4444' : '#3b82f6', transition: 'all 0.5s ease' }} />
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 8, textAlign: 'right' }}>Total Election: ${total.toFixed(2)}</div>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 24, marginTop: 'auto' }}>
            <h4 style={{ margin: '0 0 12px', color: '#334155', fontSize: '1rem' }}>Adjust Funds</h4>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 600 }}>$</span>
                <input type="number" placeholder="0.00" value={fundAmount} onChange={e => setFundAmount(e.target.value)}
                  style={{ width: '100%', padding: '12px 12px 12px 28px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button onClick={() => handleAdjustFunds(true)} style={{ padding: '0 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Deposit</button>
              <button onClick={() => handleAdjustFunds(false)} style={{ padding: '0 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Refund</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- UPLOAD TRANSACTIONS (Claude receipt parsing + xlsx) ---

function UploadTransactions({ addTransaction }) {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [previews, setPreviews] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [dragging, setDragging] = useState(false);

  const parseFile = async (f) => {
    if (!f) return;
    setFile(f); setPreviews(null); setError(null); setSuccess(false);
    setParsing(true);
    const formData = new FormData();
    formData.append('file', f);
    try {
      const resp = await axios.post(`${API_BASE}/api/parse-receipt`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPreviews(Array.isArray(resp.data) ? resp.data : [resp.data]);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to parse file. Supported: JPG, PNG, WEBP, XLSX.');
    } finally { setParsing(false); }
  };

  const handleFileChange = (e) => parseFile(e.target.files[0]);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) parseFile(dropped);
  };

  const handleConfirmAll = () => {
    previews.forEach(tx => addTransaction(tx));
    setPreviews(null); setFile(null); setSuccess(true);
  };

  return (
    <div style={styles.card}>
      <h3 style={{ marginTop: 0 }}>Upload Transaction Receipt</h3>
      <p style={{ color: '#64748b', marginBottom: 20 }}>Upload a receipt image or Excel spreadsheet — Claude AI extracts transaction details automatically.</p>

      {success && <div style={{ padding: 12, background: '#dcfce7', color: '#166534', borderRadius: 8, marginBottom: 20 }}>✅ Transaction(s) added successfully.</div>}

      {!previews && (
        <form onSubmit={(e) => { e.preventDefault(); parseFile(file); }}>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragging ? '#3b82f6' : '#cbd5e1'}`,
              background: dragging ? '#eff6ff' : 'transparent',
              padding: 40, borderRadius: 12, textAlign: 'center', marginBottom: 20,
              transition: 'all 0.2s ease', cursor: 'pointer',
            }}
          >
            {parsing
              ? <p style={{ color: '#3b82f6', fontWeight: 600, margin: 0 }}>🤖 Analyzing with Claude AI...</p>
              : dragging
                ? <p style={{ color: '#3b82f6', fontWeight: 600, margin: 0 }}>Drop to analyze instantly</p>
                : <>
                    <p style={{ color: '#64748b', fontWeight: 600, margin: '0 0 8px' }}>Drag &amp; drop a file here, or click to browse</p>
                    <input type="file" accept="image/*,.xlsx" onChange={handleFileChange} style={{ display: 'block', margin: '0 auto' }} />
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 12, marginBottom: 0 }}>Supported: JPG, PNG, WEBP, XLSX</p>
                  </>
            }
          </div>
          {error && <div style={{ color: '#b91c1c', marginBottom: 12, fontSize: '0.9rem' }}>⚠️ {error}</div>}
          {!parsing && <button type="submit" disabled={!file || parsing} style={{ ...styles.primaryButton, opacity: (!file || parsing) ? 0.5 : 1 }}>
            📤 Parse File
          </button>}
        </form>
      )}

      {previews && (
        <div>
          <h4 style={{ marginTop: 0, color: '#1e293b' }}>{previews.length} transaction{previews.length !== 1 ? 's' : ''} extracted — confirm to add</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {previews.map((tx, i) => (
              <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 18px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr', gap: 16, alignItems: 'center' }}>
                <div><label style={styles.label}>Merchant</label><div style={styles.infoText}>{tx.merchant}</div></div>
                <div><label style={styles.label}>Amount</label><div style={{ ...styles.infoText, fontWeight: 700, color: '#1a73e8' }}>${(tx.amount || 0).toFixed(2)}</div></div>
                <div><label style={styles.label}>Date</label><div style={styles.infoText}>{tx.date}</div></div>
                <div><label style={styles.label}>Item</label><div style={styles.infoText}>{tx.item}</div></div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={handleConfirmAll} style={styles.primaryButton}>✅ Add {previews.length !== 1 ? `All ${previews.length} Transactions` : 'Transaction'}</button>
            <button onClick={() => { setPreviews(null); setFile(null); }} style={{ ...styles.primaryButton, background: '#f1f5f9', color: '#64748b' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- TRANSACTION HISTORY ---

function TransactionHistory({ user, onAddTransaction, onRemoveTransaction }) {
  const [showForm, setShowForm] = React.useState(false);
  const [formData, setFormData] = React.useState({ date: '', merchant: '', item: '', amount: '' });
  const [confirmingId, setConfirmingId] = React.useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.date || !formData.merchant || !formData.item || !formData.amount) return;
    onAddTransaction({ date: formData.date, merchant: formData.merchant, item: formData.item, amount: parseFloat(formData.amount), status: 'Pending Review' });
    setFormData({ date: '', merchant: '', item: '', amount: '' });
    setShowForm(false);
  };

  const handleRemoveClick = (id) => {
    if (confirmingId === id) { onRemoveTransaction(id); setConfirmingId(null); }
    else setConfirmingId(id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '28px 32px', borderRadius: 16, color: 'white' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>Transaction History</h2>
          <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: '1rem' }}>Review past claims and manually log new FSA-eligible purchases.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: '10px 20px', background: showForm ? '#475569' : '#3b82f6', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
          {showForm ? 'Cancel' : '➕ Log Purchase'}
        </button>
      </div>

      {showForm && (
        <div style={{ ...styles.card, padding: 32, borderTop: '4px solid #3b82f6' }}>
          <h3 style={{ margin: '0 0 20px', color: '#1e293b', fontSize: '1.3rem' }}>Log a New Purchase</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 16, alignItems: 'end' }}>
            {[['Date', 'date', 'date'], ['Merchant', 'merchant', 'text'], ['Item/Service', 'item', 'text'], ['Amount ($)', 'amount', 'number']].map(([label, field, type]) => (
              <div key={field}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>{label}</label>
                <input type={type} step={type === 'number' ? '0.01' : undefined} placeholder={type === 'number' ? '0.00' : `e.g. ${field === 'merchant' ? 'CVS' : field}`}
                  required value={formData[field]} onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                  style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }} />
              </div>
            ))}
            <button type="submit" style={{ padding: '0 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', height: 46, fontSize: '1rem' }}>Submit</button>
          </form>
        </div>
      )}

      <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <th style={{ padding: '20px 24px' }}>Date</th>
              <th style={{ padding: '20px 24px' }}>Merchant & Item</th>
              <th style={{ padding: '20px 24px', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '20px 24px', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '20px 24px' }}></th>
            </tr>
          </thead>
          <tbody>
            {user.transactions.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                <td style={{ padding: '20px 24px', color: '#64748b', fontWeight: 600 }}>{t.date}</td>
                <td style={{ padding: '20px 24px' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem', marginBottom: 4 }}>{t.merchant}</div>
                  <div style={{ fontSize: '0.9rem', color: '#64748b' }}>{t.item}</div>
                </td>
                <td style={{ padding: '20px 24px', textAlign: 'right', fontWeight: 800, color: '#1e293b', fontSize: '1.15rem' }}>${t.amount.toFixed(2)}</td>
                <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                  <span style={{ background: t.status === 'Approved' ? '#dcfce7' : t.status === 'Pending Review' ? '#fef3c7' : '#fee2e2', color: t.status === 'Approved' ? '#16a34a' : t.status === 'Pending Review' ? '#d97706' : '#ef4444', padding: '6px 14px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700, display: 'inline-block' }}>
                    {t.status === 'Approved' ? '✅ Approved' : t.status === 'Pending Review' ? '⏳ Pending' : '❌ Denied'}
                  </span>
                </td>
                <td style={{ padding: '20px 24px' }}>
                  {confirmingId === t.id
                    ? <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 700, whiteSpace: 'nowrap' }}>Remove?</span>
                        <button onClick={() => handleRemoveClick(t.id)} style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>Yes</button>
                        <button onClick={() => setConfirmingId(null)} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem' }}>No</button>
                      </div>
                    : <button onClick={() => handleRemoveClick(t.id)} style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Remove</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {user.transactions.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No transactions yet.</div>}
      </div>
    </div>
  );
}

// --- PRODUCT SEARCH (single /api/search/all endpoint, all retailers) ---

function ProductSearch() {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (cat) => {
    const q = (cat || query).trim();
    if (!q) return;
    setLoading(true); setError(null); setSearched(true); setAnswer(null);
    try {
      const resp = await axios.get(`${API_BASE}/api/search/all`, { params: { query: q }, timeout: 45000 });
      setProducts(resp.data.products || []);
      setAnswer(resp.data.answer);
    } catch (err) {
      console.error(err);
      setError('Could not reach the backend. Make sure it is running on port 8001.');
      setProducts([]);
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div style={styles.card}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search FSA products: allergy medicine, bandages, contact lenses..."
            style={styles.input} />
          <button onClick={() => handleSearch()} disabled={loading} style={styles.primaryButton}>
            {loading ? '⏳ Searching...' : '🔍 Search'}
          </button>
        </div>
      </div>

      {error && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '12px 16px', borderRadius: 10, marginTop: 18 }}>⚠️ {error}</div>}
      {answer && !loading && (
        <div style={{ background: '#ede9fe', border: '1px solid #c7d2fe', borderRadius: 12, padding: '14px 18px', marginTop: 18, color: '#3730a3' }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>🤖 AI Summary</div>
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
              <a key={i} href={p.url || '#'} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
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
  tag: { padding: '6px 14px', background: '#e0f2fe', color: '#0369a1', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700 },
  appContainer: { display: 'flex', minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif", background: '#f8fafc' },
  sidebar: { width: 260, background: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' },
  sidebarTitle: { padding: 24, margin: 0, fontSize: '1.5rem', color: '#1e293b', borderBottom: '1px solid #e2e8f0' },
  navMenu: { padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 },
  navButton: { padding: '12px 16px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '1rem', color: '#64748b', borderRadius: 8, cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s' },
  navButtonActive: { background: '#eff6ff', color: '#1d4ed8', fontWeight: 600 },
  logoutButton: { margin: 20, padding: 12, background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  mainContent: { flex: 1, display: 'flex', flexDirection: 'column' },
  header: { background: 'white', padding: '24px 40px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  contentArea: { padding: 40, overflowY: 'auto', flex: 1 },
  avatar: { width: 36, height: 36, borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  card: { background: 'white', padding: 24, borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  label: { display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: 4, fontWeight: 600 },
  infoText: { fontSize: '1.05rem', color: '#1e293b', fontWeight: 500 },
  input: { flex: 1, padding: '12px 16px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' },
  primaryButton: { padding: '12px 24px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '1rem', cursor: 'pointer' },
  loginContainer: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: "'Inter', sans-serif" },
  loginCard: { background: 'white', padding: 40, borderRadius: 16, width: '100%', maxWidth: 400, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
};
