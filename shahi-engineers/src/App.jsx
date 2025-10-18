import React, { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';

// Production-ready single-file React app (App.jsx)
// - Uses an axios instance with interceptors
// - Reads backend base URL from VITE_API_URL
// - Stores JWT in memory and optionally in localStorage (configurable)
// - Minimal, accessible UI without exposing secrets
// - Replace localStorage token usage with httpOnly cookies in production for better security

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// --- Axios instance ---
const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false // set true if you switch to cookie-based auth
});

// Add request interceptor to attach token from memory
api.interceptors.request.use((config) => {
  try {
    const token = authStorage.getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch (e) {
    // ignore
  }
  return config;
});

// Optional: response interceptor to handle 401s globally
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    // simple 401 handler — you can extend to attempt refresh-token flow
    if (err.response && err.response.status === 401) {
      authStorage.clearToken();
      // don't throw a huge UI error here — components will react to auth change
    }
    return Promise.reject(err);
  }
);

// --- Simple in-memory + localStorage token helper ---
// In production prefer httpOnly secure cookies; this is configured for convenience.
const authStorage = (function () {
  let memoryToken = null;
  const LS_KEY = 'shahi_token_v1';
  const persist = true; // set false to keep token only in memory

  return {
    setToken(token) {
      memoryToken = token;
      if (persist && typeof window !== 'undefined') localStorage.setItem(LS_KEY, token);
    },
    getToken() {
      if (memoryToken) return memoryToken;
      if (persist && typeof window !== 'undefined') {
        memoryToken = localStorage.getItem(LS_KEY);
        return memoryToken;
      }
      return null;
    },
    clearToken() {
      memoryToken = null;
      if (typeof window !== 'undefined') localStorage.removeItem(LS_KEY);
    }
  };
})();

// --- Auth context for app-wide state ---
const AuthContext = createContext(null);
export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async function restore() {
      const token = authStorage.getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/api/profile');
        setUser(res.data.user);
      } catch (err) {
        authStorage.clearToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    const token = res.data.token;
    authStorage.setToken(token);
    // fetch profile after setting token
    const profile = await api.get('/api/profile');
    setUser(profile.data.user);
    return profile.data.user;
  };

  const signup = async (name, email, password) => {
    const res = await api.post('/api/auth/signup', { name, email, password });
    const token = res.data.token;
    authStorage.setToken(token);
    const profile = await api.get('/api/profile');
    setUser(profile.data.user);
    return profile.data.user;
  };

  const logout = () => {
    authStorage.clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// --- UI components ---
function Field({ label, id, type = 'text', value, onChange, required = false }) {
  return (
    <label htmlFor={id} style={{ display: 'block', marginBottom: 8 }}>
      <div style={{ fontSize: 13, marginBottom: 4 }}>{label}{required ? ' *' : ''}</div>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        style={{ padding: '8px 10px', width: '100%', borderRadius: 6, border: '1px solid #ccc' }}
      />
    </label>
  );
}

function AuthForms() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(name, email, password);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setMode('login')} disabled={mode === 'login'}>Login</button>
        <button onClick={() => setMode('signup')} disabled={mode === 'signup'}>Sign up</button>
      </div>

      <form onSubmit={handleSubmit} aria-live="polite">
        {mode === 'signup' && <Field id="name" label="Full name" value={name} onChange={setName} required />}
        <Field id="email" label="Email" value={email} onChange={setEmail} type="email" required />
        <Field id="password" label="Password" value={password} onChange={setPassword} type="password" required />

        {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={busy}>{busy ? 'Working...' : mode === 'login' ? 'Login' : 'Create account'}</button>
        </div>
      </form>
    </div>
  );
}

function Dashboard() {
  const { user, logout } = useAuth();
  const [promoteEmail, setPromoteEmail] = useState('');
  const [message, setMessage] = useState('');

  async function handlePromote() {
    setMessage('');
    try {
      const res = await api.post('/api/users/make-admin', { email: promoteEmail });
      setMessage(`${res.data.user.email} is now admin`);
      setPromoteEmail('');
    } catch (err) {
      setMessage(err.response?.data?.message || err.message || 'Request failed');
    }
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>Welcome, {user.name}</h2>
          <div style={{ fontSize: 13, color: '#555' }}>{user.email} {user.isAdmin ? '(Admin)' : ''}</div>
        </div>
        <div>
          <button onClick={logout}>Logout</button>
        </div>
      </div>

      <section style={{ marginTop: 20 }}>
        <h3>Admin: promote user</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            placeholder="user's email"
            value={promoteEmail}
            onChange={(e) => setPromoteEmail(e.target.value)}
            style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', flex: 1 }}
          />
          <button onClick={handlePromote}>Make admin</button>
        </div>
        {message && <div style={{ marginTop: 8 }}>{message}</div>}
      </section>
    </div>
  );
}

// --- App root ---
export default function App() {
  return (
    <AuthProvider>
      <Main />
    </AuthProvider>
  );
}

function Main() {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ padding: 24, fontFamily: 'Inter, system-ui, -apple-system, sans-serif', maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ marginTop: 0 }}>Shahi Engineers — Admin Console (Demo)</h1>
      {!user ? <AuthForms /> : <Dashboard />}

      <footer style={{ marginTop: 48, color: '#666', fontSize: 13 }}>
        Note: For production, prefer httpOnly secure cookies instead of localStorage tokens. Ensure your backend sets
        Secure, SameSite and HttpOnly flags when using cookies. Rotate JWT_SECRET regularly and use strong secrets
        stored in your host provider's secret manager (Render / Vercel environment variables).
      </footer>
    </div>
  );
}
