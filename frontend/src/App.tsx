import React, { useState, createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';
import './App.css';

// --- Auth Context Setup ---
interface AuthContextType {
  token: string | null;
  userEmail: string | null;
  login: (token: string, email: string) => void;
  logout: () => void;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [userEmail, setUserEmail] = useState<string | null>(localStorage.getItem('userEmail'));

  const login = (newToken: string, email: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('userEmail', email);
    setToken(newToken);
    setUserEmail(email);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    setToken(null);
    setUserEmail(null);
  };

  return (
    <AuthContext.Provider value={{ token, userEmail, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};



// --- Login Component ---
const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await axios.post('http://localhost:5000/auth/login', { email, password });
      login(res.data.token, res.data.email);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: 'auto' }}>
      <h2>Login</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        style={{ width: '100%', marginBottom: 10 }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        style={{ width: '100%', marginBottom: 10 }}
      />
      <button type="submit">Login</button>
    </form>
  );
};

// --- Register Component ---
const Register = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await axios.post('http://localhost:5000/auth/register', { email, password });
      login(res.data.token, res.data.email);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: 'auto' }}>
      <h2>Register</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        style={{ width: '100%', marginBottom: 10 }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        style={{ width: '100%', marginBottom: 10 }}
      />
      <button type="submit">Register</button>
    </form>
  );
};

// --- Receipt Upload Component (Your existing code wrapped) ---
const ReceiptUpload = () => {
  const { token } = useAuth();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string | null>(null);
  const [ocrWarning, setOcrWarning] = useState<boolean>(false);

  // OCR quality check & extract totalAmount (your existing logic)
  function isLowQualityText(text: string): boolean {
    const clean = text.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    return clean.length < 30;
  }

  function extractTotalAmount(text: string): string | null {
    const cleaned = text
      .toLowerCase()
      .replace(/[^\w\s.$,]/g, ' ')
      .split('\n')
      .map(line => line.trim().replace(/\s+/g, ' '))
      .filter(Boolean);

    const totalLines = cleaned.filter(line => line.includes('total'));
    let amounts: number[] = [];

    totalLines.forEach(line => {
      const matches = line.match(/[$]?[\d,.]+/g);
      if (matches) {
        matches.forEach(m => {
          const cleanNumStr = m.replace(/[$]/g, '').replace(/,/g, '.');
          const num = parseFloat(cleanNumStr);
          if (!isNaN(num) && cleanNumStr.includes('.')) {
            amounts.push(num);
          }
        });
      }
    });

    if (amounts.length === 0) {
      const allMatches = text.match(/[$]?[\d,.]+/g);
      if (allMatches) {
        amounts = allMatches
          .map(m => parseFloat(m.replace(/[$]/g, '').replace(/,/g, '.')))
          .filter(n => !isNaN(n) && n % 1 !== 0);
      }
    }

    if (amounts.length === 0) return null;

    const maxAmount = Math.max(...amounts);
    return maxAmount.toFixed(2);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setOcrText('');
      setTotalAmount(null);
      setOcrWarning(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      alert('Please select a receipt image first.');
      return;
    }

    const formData = new FormData();
    formData.append('receipt', selectedFile);

    try {
      const res = await axios.post('http://localhost:5000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`, // Pass JWT token for auth
        },
      });

      const text = res.data.text;
      const confidence = res.data.confidence;

      setOcrText(text);

      if (confidence !== undefined && confidence < 70) {
        setOcrWarning(true);
      } else {
        setOcrWarning(isLowQualityText(text));
      }

      const total = extractTotalAmount(text);
      setTotalAmount(total);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload or process receipt. Please try again.');
    }
  };

  return (
    <section className="upload-section">
      <h3>Upload Your Receipt</h3>
      <p>Snap a photo or upload a file — we’ll handle the rest with OCR magic ✨</p>
      <input type="file" className="upload-input" onChange={handleFileChange} />
      <button className="btn-submit" onClick={handleSubmit}>
        Submit Receipt
      </button>

      {ocrText && (
        <div
          className="ocr-result"
          style={{
            whiteSpace: 'pre-wrap',
            maxHeight: '200px',
            overflowY: 'auto',
            padding: '10px',
            backgroundColor: '#f0f4ff',
            borderRadius: '8px',
            boxShadow: '0 2px 6px rgba(100, 100, 255, 0.15)',
            marginTop: '20px',
            fontFamily: 'monospace',
            fontSize: '14px',
          }}
        >
          <h4>Extracted Text:</h4>
          <pre>{ocrText}</pre>
        </div>
      )}

      {ocrWarning && (
        <div
          style={{
            marginTop: '10px',
            padding: '10px',
            backgroundColor: '#fff4cc',
            borderLeft: '4px solid #ffcc00',
            borderRadius: '5px',
            color: '#333',
          }}
        >
          ⚠️ The OCR result looks incomplete or low-quality. Try using a clearer image.
        </div>
      )}

      {totalAmount && (
        <div
          className="extracted-info"
          style={{
            marginTop: '20px',
            padding: '10px',
            backgroundColor: '#d9e4ff',
            borderRadius: '8px',
            boxShadow: '0 2px 6px rgba(70, 70, 200, 0.2)',
            fontWeight: '600',
            fontSize: '18px',
            color: '#1e1e9c',
          }}
        >
          <h4>Total Amount Detected:</h4>
          <p>${totalAmount}</p>
        </div>
      )}
    </section>
  );
};

// --- Main App Component ---
export default function App() {
  const { token, userEmail, logout } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (!token) {
    return (
      <div>
        {showRegister ? (
          <>
            <Register />
            <p style={{ textAlign: 'center' }}>
              Already have an account?{' '}
              <button onClick={() => setShowRegister(false)}>Login</button>
            </p>
          </>
        ) : (
          <>
            <Login />
            <p style={{ textAlign: 'center' }}>
              Don't have an account?{' '}
              <button onClick={() => setShowRegister(true)}>Register</button>
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Expense Genie</h1>
        <p>Welcome, {userEmail}</p>
        <button onClick={logout}>Logout</button>
      </header>

      <nav className="app-nav">
        <ul className="nav-list">
          {['Home', 'Features', 'Pricing', 'About', 'Contact'].map((item) => (
            <li key={item} className="nav-item">
              <a href={`#${item.toLowerCase()}`} className="nav-link">
                {item}
              </a>
            </li>
          ))}
        </ul>
        <button
          className="btn-upload"
          onClick={() => window.scrollTo({ top: 800, behavior: 'smooth' })}
        >
          Upload Receipt
        </button>
      </nav>

      <main className="main-card">
        <section className="intro-section">
          <h2>Welcome to Expense Genie</h2>
          <p>Your personal assistant for effortless receipt tracking and management.</p>
        </section>

        <ReceiptUpload />
      </main>

      <footer className="app-footer">
        &copy; {new Date().getFullYear()} Expense Genie — Smart money, smart you.
      </footer>
    </div>
  );
}

// Wrap the whole app with AuthProvider at the root level (e.g., index.tsx):
// ReactDOM.createRoot(document.getElementById('root')).render(
//   <React.StrictMode>
//     <AuthProvider>
//       <App />
//     </AuthProvider>
//   </React.StrictMode>
// );
