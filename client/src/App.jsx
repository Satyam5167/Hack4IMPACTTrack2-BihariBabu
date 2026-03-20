import { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import './index.css';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { API_BASE_URL } from './api';
import BackgroundCanvas from './components/BackgroundCanvas';
import CustomCursor from './components/CustomCursor';

// 1. Auth Context
const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/me`, {
          credentials: 'include'
        });
        const data = await response.json();
        if (response.ok) {
          setUser(data.user);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const login = (userData) => {
    setUser(userData);
  };

  const updateUser = (newData) => {
    setUser(prev => ({ ...prev, ...newData }));
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/users/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
      showToast('⚡', 'Logged out successfully');
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      showToast('❌', 'Logout failed');
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// 2. Protected Route Wrapper (Still kept for future use)
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // Or a loading spinner

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// 3. Layout Wrapper for Navbar
function AppLayout({ children }) {
  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
      <Navbar />
      {children}
    </div>
  );
}

// 4. Main App Component
export default function App() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 2,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, []);

  return (
    <BrowserRouter>
      <CustomCursor />
      <BackgroundCanvas />
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Main Entry Points */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route path="/dashboard" element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            } />

            <Route path="/marketplace" element={
              <ProtectedRoute>
                <AppLayout>
                  <Marketplace />
                </AppLayout>
              </ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
