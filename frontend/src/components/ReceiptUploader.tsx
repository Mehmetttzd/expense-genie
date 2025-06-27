import React, { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

// --- Auth Context Setup ---
interface AuthContextType {
  token: string | null;
  userEmail: string | null;
  login: (token: string, email: string) => void;
  logout: () => void;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
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

const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
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
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
      {error && <div className="text-red-600 mb-2 text-center">{error}</div>}
      <input
        type="email"
        placeholder="Email"
        className="w-full p-2 mb-3 border rounded"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        className="w-full p-2 mb-3 border rounded"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
      />
      <button
        type="submit"
        className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Login
      </button>
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
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4 text-center">Register</h2>
      {error && <div className="text-red-600 mb-2 text-center">{error}</div>}
      <input
        type="email"
        placeholder="Email"
        className="w-full p-2 mb-3 border rounded"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        className="w-full p-2 mb-3 border rounded"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
      />
      <button
        type="submit"
        className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
      >
        Register
      </button>
    </form>
  );
};

// --- Main ReceiptUploader Component ---
export default function ReceiptUploader() {
  const { token, userEmail, logout } = useAuth();

  const [showRegister, setShowRegister] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ocrText, setOcrText] = useState('');
  const [error, setError] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setOcrText('');
    setError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a receipt image before uploading.');
      return;
    }
    setUploading(true);
    setError('');
    setOcrText('');
    setProgress(0);

    const formData = new FormData();
    formData.append('receipt', file);

    try {
      const response = await axios.post('http://localhost:5000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
        onUploadProgress: (e) => {
          const total = e.total ?? 1;
          const percent = Math.round((e.loaded * 100) / total);
          setProgress(percent);
        }
      });
      setOcrText(response.data.text);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  if (!token) {
    return (
      <div>
        {showRegister ? (
          <>
            <Register />
            <p className="text-center mt-4">
              Already have an account?{' '}
              <button
                className="text-blue-600 underline"
                onClick={() => setShowRegister(false)}
              >
                Login
              </button>
            </p>
          </>
        ) : (
          <>
            <Login />
            <p className="text-center mt-4">
              Don't have an account?{' '}
              <button
                className="text-green-600 underline"
                onClick={() => setShowRegister(true)}
              >
                Register
              </button>
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto bg-white rounded-xl shadow-xl p-8 mt-8">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-wide">
            Upload Your Receipt
          </h2>
          <p className="text-gray-600">Logged in as {userEmail}</p>
        </div>
        <button
          onClick={logout}
          className="py-2 px-4 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Logout
        </button>
      </header>

      <div
        {...getRootProps()}
        className={`cursor-pointer border-2 rounded-lg p-16 text-center transition
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}
          hover:border-blue-400 hover:bg-blue-50`}
      >
        <input {...getInputProps()} />
        <svg
          className="mx-auto mb-4 w-14 h-14 text-blue-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 16V4m0 0L3 8m4-4l4 4m5 6v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4m9-6h.01"
          ></path>
        </svg>
        {isDragActive ? (
          <p className="text-blue-600 font-semibold">Drop the image here to upload</p>
        ) : (
          <p className="text-gray-600">
            Drag & drop a receipt image here, or click to select (max size: 5MB)
          </p>
        )}
      </div>

      {preview && (
        <div className="mt-6 flex justify-center">
          <img
            src={preview}
            alt="Receipt preview"
            className="max-h-48 rounded-md border border-gray-200 shadow-sm"
          />
        </div>
      )}

      {uploading && (
        <div className="mt-6">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-3 transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-center text-sm text-gray-700 mt-1 font-medium">
            Uploading... {progress}%
          </p>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={uploading}
        className="mt-8 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md transition-colors disabled:bg-blue-300"
      >
        {uploading ? 'Uploading...' : 'Upload Receipt'}
      </button>

      {error && <p className="mt-4 text-center text-red-600 font-semibold">{error}</p>}

      {ocrText && (
        <div className="mt-8 bg-gray-100 p-4 rounded-md whitespace-pre-wrap text-gray-800 shadow-inner max-h-60 overflow-auto">
          <h3 className="font-semibold mb-2 text-lg">Extracted Text:</h3>
          <pre>{ocrText}</pre>
        </div>
      )}
    </div>
  );
}
