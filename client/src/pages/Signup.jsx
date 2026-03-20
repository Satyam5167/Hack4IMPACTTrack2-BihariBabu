import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../App';
import { API_BASE_URL } from '../api';
import './Login.css'; // Reuse login styles

const TRADES = [
  { from: 'Priya S.', to: 'Ravi M.', amt: '2.4 kWh', hash: '0x3f4a...2b9c', price: '₹6.40' },
  { from: 'Arjun K.', to: 'Neha T.', amt: '1.8 kWh', hash: '0xa1e2...7f03', price: '₹6.20' },
  { from: 'Dev P.', to: 'Meera J.', amt: '3.1 kWh', hash: '0x8c91...4d55', price: '₹6.60' },
  { from: 'Anita R.', to: 'Kiran L.', amt: '0.9 kWh', hash: '0x2d3e...8a11', price: '₹6.35' },
  { from: 'Sanjay B.', to: 'Rahul V.', amt: '2.2 kWh', hash: '0xf7b4...9e32', price: '₹6.55' },
];

export default function Signup() {
  const { showToast } = useToast();
  const { login, isAuthenticated } = useAuth();
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // State
  const [feed, setFeed] = useState([]);
  const [priceVal, setPriceVal] = useState(6.50);
  const [priceDelta, setPriceDelta] = useState(0);
  const [solarVal, setSolarVal] = useState(8.4);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwdVisible, setPwdVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext('2d');
    let W, H;
    
    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const pts = Array.from({ length: 12 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .2, vy: (Math.random() - .5) * .2,
      r: Math.random() * 1.5 + 0.5
    }));

    let animationId;
    function drawBg() {
      c.clearRect(0, 0, W, H);
      pts.forEach((p, i) => {
        pts.slice(i + 1).forEach(q => {
          const dx = p.x - q.x, dy = p.y - q.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < 200) {
            c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y);
            c.strokeStyle = `rgba(0,255,135,${0.05 * (1 - d / 200)})`; c.lineWidth = 0.5; c.stroke();
          }
        });
        c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        c.fillStyle = 'rgba(0,255,135,0.4)'; c.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      });
      animationId = requestAnimationFrame(drawBg);
    }
    drawBg();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  useEffect(() => {
    let feedIdx = 0;
    function addFeedItem() {
      const t = TRADES[feedIdx % TRADES.length];
      feedIdx++;
      setFeed(prev => [t, ...prev].slice(0, 3));
    }
    addFeedItem(); addFeedItem(); addFeedItem();
    const feedInterval = setInterval(addFeedItem, 3500);
    const metricsInterval = setInterval(() => {
      setPriceDelta(prev => {
        const delta = (Math.random() - .5) * .2;
        setPriceVal(curr => Math.max(4, Math.min(9, curr + delta)));
        return delta;
      });
      setSolarVal(curr => +(8.4 + Math.random() * .3 - .1).toFixed(1));
    }, 4000);
    return () => {
      clearInterval(feedInterval);
      clearInterval(metricsInterval);
    };
  }, []);

  const showError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 4000);
  };

  const showSuccess = () => {
    setShowSuccessOverlay(true);
    showToast('🚀', 'Welcome to EnergyGrid!');
    setTimeout(() => { navigate('/dashboard'); }, 1800);
  };

  const handleSignup = async (e) => {
    if (e) e.preventDefault();
    if (!name.trim()) { showError('Please enter your full name.'); return; }
    if (!email.trim()) { showError('Please enter your email address.'); return; }
    if (!pwd) { showError('Please enter a password.'); return; }
    if (!email.includes('@')) { showError('Please enter a valid email address.'); return; }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password: pwd }),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      login(data.user);
      showSuccess();
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOAuth = () => {
    showToast('🚀', 'Redirecting to Google...');
    window.location.href = `${API_BASE_URL}/api/users/auth/google`;
  };

  const walletConnect = async (providerName) => {
    if (!window.ethereum) {
      showError('Please install MetaMask to connect your wallet.');
      return;
    }
    setLoading(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      
      const response = await fetch(`${API_BASE_URL}/api/users/wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: address }),
        credentials: 'include'
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Wallet registration failed');

      login(data.user);
      showSuccess();
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <canvas id="bgCanvas" ref={canvasRef}></canvas>

      <div className="login-wrap">
        <div className="left-panel">
          <div className="orb orb1"></div>
          <div className="orb orb2"></div>
          <Link to="/" className="left-logo">
            <div className="logo-mark">⚡</div>
            EnergyGrid
          </Link>
          <div className="left-main">
            <div className="left-tagline">Create your profile</div>
            <h1 className="left-title">
              Start trading.<br/>
              <span className="accent">Automate your grid.</span><br/>
              Join the future.
            </h1>
            <p className="left-desc">
              Set up your account in seconds and start selling your excess solar energy to the neighborhood.
            </p>
            <div className="metrics-strip">
               <div className="metric-row">
                <div className="metric-left">
                  <div className="metric-icon" style={{ background: 'rgba(0,255,135,0.08)' }}>☀️</div>
                  <div>
                    <div className="metric-label">Live solar production</div>
                    <div className="metric-val" style={{ color: 'var(--green)' }}>{solarVal} kWh</div>
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--green)', fontFamily: 'var(--mono)' }}>▲ 12%</div>
              </div>
            </div>
          </div>
          <div className="live-feed">
            <div className="feed-label"><div className="feed-dot"></div>Live Trades</div>
            <div>
              {feed.map((f, i) => (
                <div key={i} className="feed-item" style={{ animationDelay: '0s' }}>
                  <span>{f.from} → {f.to} &nbsp;<span className="feed-amount">{f.amt}</span></span>
                  <span className="feed-hash">{f.price} · {f.hash}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="right-panel">
          <div className={`success-overlay ${showSuccessOverlay ? 'show' : ''}`}>
            <div className="success-check">✓</div>
            <div className="success-title">Success!</div>
            <div className="success-sub">Creating your grid node…</div>
          </div>

          <div className="login-card">
            <div className="login-greeting">
              <div className="login-welcome">Register for an account</div>
              <div className="login-card-title">Join the<br/>network</div>
            </div>

            <form className="login-form" onSubmit={handleSignup}>
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <div className="input-wrap">
                  <span className="input-icon">👤</span>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="form-input" placeholder="Arjun K." />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Email address</label>
                <div className="input-wrap">
                  <span className="input-icon">✉</span>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={`form-input ${errorMsg ? 'error' : ''}`} placeholder="you@example.com" />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Password</label>
                <div className="input-wrap">
                  <span className="input-icon">🔒</span>
                  <input type={pwdVisible ? 'text' : 'password'} value={pwd} onChange={e => setPwd(e.target.value)} className={`form-input ${errorMsg ? 'error' : ''}`} placeholder="••••••••" />
                  <button type="button" onClick={() => setPwdVisible(!pwdVisible)} className="pwd-toggle">{pwdVisible ? '🙈' : '👁'}</button>
                </div>
              </div>

              <div className={`error-msg ${errorMsg ? 'show' : ''}`}>
                <span>⚠</span>
                <span>{errorMsg}</span>
              </div>

              <button disabled={loading} type="submit" className={`submit-btn ${loading ? 'loading' : ''}`}>
                <span className="btn-text">Create Account</span>
                <div className="btn-spinner"><div className="spinner"></div></div>
              </button>

              {/* Divider */}
              <div className="divider" style={{ margin: '20px 0' }}>
                <div className="div-line"></div>
                <span className="div-text">or continue with</span>
                <div className="div-line"></div>
              </div>

              {/* Google Button */}
              <button type="button" className="google-btn" style={{ marginBottom: '20px' }} onClick={handleGoogleOAuth}>
                <span className="google-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </span>
                Sign up with Google
              </button>

              {/* Wallet connect */}
              <div className="wallet-row" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button type="button" onClick={() => walletConnect('MetaMask')} className="wallet-btn" style={{ flex: 1, padding: '10px', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', cursor: 'pointer' }}>
                  🦊 MetaMask
                </button>
                <button type="button" onClick={() => walletConnect('WalletConnect')} className="wallet-btn" style={{ flex: 1, padding: '10px', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', cursor: 'pointer' }}>
                  🔗 Wallet
                </button>
              </div>

              <div className="signup-prompt">
                Already have an account? <Link to="/login" className="signup-link">Sign in here →</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
