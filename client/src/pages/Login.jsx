import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../App';
import { API_BASE_URL } from '../apiBase';
import { Sun, Leaf, IndianRupee, Mail, Lock, Eye, EyeOff, Zap, Link2, AlertTriangle } from 'lucide-react';
import './Login.css';

const TRADES = [
  { from: 'Priya S.', to: 'Ravi M.', amt: '2.4 kWh', hash: '0x3f4a...2b9c', price: '₹6.40' },
  { from: 'Arjun K.', to: 'Neha T.', amt: '1.8 kWh', hash: '0xa1e2...7f03', price: '₹6.20' },
  { from: 'Dev P.', to: 'Meera J.', amt: '3.1 kWh', hash: '0x8c91...4d55', price: '₹6.60' },
  { from: 'Anita R.', to: 'Kiran L.', amt: '0.9 kWh', hash: '0x2d3e...8a11', price: '₹6.35' },
  { from: 'Sanjay B.', to: 'Rahul V.', amt: '2.2 kWh', hash: '0xf7b4...9e32', price: '₹6.55' },
];

export default function Login() {
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
  
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwdVisible, setPwdVisible] = useState(false);
  const [remembered, setRemembered] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  useEffect(() => {
    // ── BG canvas ──
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

      // Left panel glow
      const gr = c.createRadialGradient(W * 0.25, H * 0.5, 0, W * 0.25, H * 0.5, 350);
      gr.addColorStop(0, 'rgba(0,255,135,0.04)'); gr.addColorStop(1, 'transparent');
      c.fillStyle = gr; c.fillRect(0, 0, W, H);
      animationId = requestAnimationFrame(drawBg);
    }
    drawBg();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  useEffect(() => {
    // ── Live feed ──
    let feedIdx = 0;
    
    function addFeedItem() {
      const t = TRADES[feedIdx % TRADES.length];
      feedIdx++;
      setFeed(prev => {
        const newFeed = [t, ...prev];
        return newFeed.slice(0, 3);
      });
    }

    addFeedItem(); addFeedItem(); addFeedItem();
    const feedInterval = setInterval(addFeedItem, 3500);

    // ── Live metrics ──
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
    showToast('Welcome back to the Grid!');
    setTimeout(() => { navigate('/dashboard'); }, 1800);
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim()) { showError('Please enter your email address.'); return; }
    if (!pwd) { showError('Please enter your password.'); return; }
    if (!email.includes('@')) { showError('Please enter a valid email address.'); return; }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pwd })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      login(data.user, data.token);
      showSuccess();
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
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
        body: JSON.stringify({ wallet_address: address })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Wallet login failed');

      login(data.user, data.token);
      showSuccess();
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOAuth = () => {
    showToast('Redirecting to Google...');
    window.location.href = `${API_BASE_URL}/api/users/auth/google`;
  };

  return (
    <div className="login-page-container">
      <canvas id="bgCanvas" ref={canvasRef}></canvas>

      <div className="login-wrap">

        {/* ── LEFT PANEL ── */}
        <div className="left-panel">
          <div className="orb orb1"></div>
          <div className="orb orb2"></div>

          {/* Logo */}
          <Link to="/" className="left-logo" style={{ animation: 'l-fade-up .5s ease both' }}>
            <div className="logo-mark" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={20} fill="#ffffff" color="#ffffff" />
            </div>
            EnergyGrid
          </Link>

          {/* Main text */}
          <div className="left-main">
            <div className="left-tagline">Decentralized Solar Trading</div>
            <h1 className="left-title">
              Trade energy.<br/>
              <span className="accent">Save the planet.</span><br/>
              Earn real money.
            </h1>
            <p className="left-desc">
              Join 284 households already trading surplus solar power with their neighbors — powered by AI forecasting and blockchain settlement.
            </p>

            <div className="metrics-strip">
              <div className="metric-row">
                <div className="metric-left">
                  <div className="metric-icon" style={{ background: 'rgba(0,255,135,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sun size={14} color="var(--green)" />
                  </div>
                  <div>
                    <div className="metric-label">Live solar production</div>
                    <div className="metric-val" style={{ color: 'var(--green)' }}>{solarVal} kWh</div>
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--green)', fontFamily: 'var(--mono)' }}>▲ 12%</div>
              </div>
              <div className="metric-row">
                <div className="metric-left">
                  <div className="metric-icon" style={{ background: 'rgba(0,229,204,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Leaf size={14} color="var(--teal)" />
                  </div>
                  <div>
                    <div className="metric-label">CO₂ saved today</div>
                    <div className="metric-val" style={{ color: 'var(--teal)' }}>142 kg</div>
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--teal)', fontFamily: 'var(--mono)' }}>▲ 7%</div>
              </div>
              <div className="metric-row">
                <div className="metric-left">
                  <div className="metric-icon" style={{ background: 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IndianRupee size={14} color="var(--amber)" />
                  </div>
                  <div>
                    <div className="metric-label">Market price now</div>
                    <div className="metric-val" style={{ color: 'var(--amber)' }}>₹ {priceVal.toFixed(2)} / kWh</div>
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: priceDelta > 0 ? 'var(--green)' : '#ff6b6b', fontFamily: 'var(--mono)' }}>{priceDelta > 0 ? '▲ up' : (priceDelta < 0 ? '▼ dn' : '↔')}</div>
              </div>
            </div>
          </div>

          {/* Live feed */}
          <div className="live-feed" style={{ animation: 'l-fade-up .7s .35s ease both' }}>
            <div className="feed-label">
              <div className="feed-dot"></div>
              Live Trades
            </div>
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

        {/* ── RIGHT PANEL ── */}
        <div className="right-panel">
          
          {/* Success overlay */}
          <div className={`success-overlay ${showSuccessOverlay ? 'show' : ''}`}>
            <div className="success-check">✓</div>
            <div className="success-title">Welcome back!</div>
            <div className="success-sub">Redirecting to your dashboard…</div>
          </div>

          <div className="login-card">
            <div className="login-greeting">
              <div className="login-welcome">Sign in to continue</div>
              <div className="login-card-title">Welcome<br/>back</div>
              <div className="login-sub">Enter your credentials to access the trading platform.</div>
            </div>

            <form className="login-form" onSubmit={handleLogin}>
              
              {/* Email */}
              <div className="input-group">
                <label className="input-label">Email address</label>
                <div className="input-wrap">
                  <span className="input-icon" style={{ display: 'flex', alignItems: 'center' }}><Mail size={14} /></span>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={`form-input ${errorMsg ? 'error' : ''}`} style={{ borderColor: email === 'demo@energygrid.app' ? 'var(--green)' : undefined }} placeholder="you@example.com" autoComplete="email" />
                </div>
              </div>

              {/* Password */}
              <div className="input-group">
                <label className="input-label">Password</label>
                <div className="input-wrap">
                  <span className="input-icon" style={{ display: 'flex', alignItems: 'center' }}><Lock size={14} /></span>
                  <input type={pwdVisible ? 'text' : 'password'} value={pwd} onChange={e => setPwd(e.target.value)} className={`form-input ${errorMsg ? 'error' : ''}`} style={{ borderColor: pwd === 'demo1234' ? 'var(--green)' : undefined }} placeholder="••••••••" autoComplete="current-password" />
                  <button type="button" onClick={() => setPwdVisible(!pwdVisible)} className="pwd-toggle" tabIndex="-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{pwdVisible ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div className="form-row">
                <div className="remember-wrap" onClick={() => setRemembered(!remembered)}>
                  <div className={`custom-checkbox ${remembered ? 'checked' : ''}`}></div>
                  <span className="remember-label">Remember me</span>
                </div>
                <a href="#" className="forgot-link">Forgot password?</a>
              </div>

              {/* Error message */}
              <div className={`error-msg ${errorMsg ? 'show' : ''}`}>
                <span style={{ display: 'flex', alignItems: 'center' }}><AlertTriangle size={13} /></span>
                <span>{errorMsg || 'Invalid credentials. Please try again.'}</span>
              </div>

              {/* Submit */}
              <button disabled={loading} type="submit" className={`submit-btn ${loading ? 'loading' : ''}`}>
                <span className="btn-text">Sign In</span>
                <div className="btn-spinner">
                  <div className="spinner"></div>
                </div>
              </button>

              {/* Divider */}
              <div className="divider">
                <div className="div-line"></div>
                <span className="div-text">or continue with</span>
                <div className="div-line"></div>
              </div>

              {/* Google Button */}
              <button type="button" className="google-btn" onClick={handleGoogleOAuth}>
                <span className="google-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </span>
                Sign in with Google
              </button>



              {/* Wallet connect */}
              <div className="wallet-row">
                <button type="button" onClick={() => walletConnect('MetaMask')} className="wallet-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="16" height="16" viewBox="0 0 318.6 318.6" xmlns="http://www.w3.org/2000/svg">
                    <polygon fill="#e2761b" stroke="#e2761b" points="274.1,35.5 174.6,109.4 193,65.8"/>
                    <polygon fill="#e4761b" stroke="#e4761b" points="44.4,35.5 143.1,110.1 125.6,65.8"/>
                    <polygon fill="#e4761b" stroke="#e4761b" points="238.3,206.8 211.8,247.4 268.5,263 284.8,207.7"/>
                    <polygon fill="#e4761b" stroke="#e4761b" points="33.9,207.7 50.1,263 106.8,247.4 80.3,206.8"/>
                    <polygon fill="#e4761b" stroke="#e4761b" points="103.6,138.2 87.8,162.1 144.1,164.6 142.1,104.1"/>
                    <polygon fill="#e4761b" stroke="#e4761b" points="214.9,138.2 175.9,103.4 174.6,164.6 230.8,162.1"/>
                    <polygon fill="#e4761b" stroke="#e4761b" points="106.8,247.4 140.6,230.9 111.4,208.1"/>
                    <polygon fill="#e4761b" stroke="#e4761b" points="177.9,230.9 211.8,247.4 207.1,208.1"/>
                    <polygon fill="#d7c1b3" stroke="#d7c1b3" points="211.8,247.4 177.9,230.9 180.6,253 180.3,262.3"/>
                    <polygon fill="#d7c1b3" stroke="#d7c1b3" points="106.8,247.4 138.3,262.3 138.1,253 140.6,230.9"/>
                    <polygon fill="#233447" stroke="#233447" points="138.8,193.5 110.6,185.2 130.5,176.1"/>
                    <polygon fill="#233447" stroke="#233447" points="179.8,193.5 188,176.1 207.9,185.2"/>
                    <polygon fill="#cd6116" stroke="#cd6116" points="106.8,247.4 111.6,206.8 80.3,207.7"/>
                    <polygon fill="#cd6116" stroke="#cd6116" points="207,206.8 211.8,247.4 238.3,207.7"/>
                    <polygon fill="#cd6116" stroke="#cd6116" points="230.8,162.1 174.6,164.6 179.8,193.5 188,176.1 207.9,185.2"/>
                    <polygon fill="#cd6116" stroke="#cd6116" points="110.6,185.2 130.5,176.1 138.8,193.5 144.1,164.6 87.8,162.1"/>
                    <polygon fill="#e4751f" stroke="#e4751f" points="87.8,162.1 138.8,193.5 111.4,208.1"/>
                    <polygon fill="#e4751f" stroke="#e4751f" points="207.1,208.1 179.8,193.5 230.8,162.1"/>
                    <polygon fill="#e4751f" stroke="#e4751f" points="144.1,164.6 138.8,193.5 146.3,232.8 148,180.5"/>
                    <polygon fill="#e4751f" stroke="#e4751f" points="174.6,164.6 170.7,180.4 172.6,232.8 179.8,193.5"/>
                    <polygon fill="#f6851b" stroke="#f6851b" points="179.8,193.5 172.6,232.8 177.9,230.9 207.1,208.1"/>
                    <polygon fill="#f6851b" stroke="#f6851b" points="111.4,208.1 140.6,230.9 146.3,232.8 138.8,193.5"/>
                    <polygon fill="#c0ad9e" stroke="#c0ad9e" points="180.3,262.3 180.6,253 178.1,250.8 140.4,250.8 138.1,253 138.3,262.3 106.8,247.4 117.8,256.4 140.1,271.9 178.4,271.9 200.8,256.4 211.8,247.4"/>
                    <polygon fill="#161616" stroke="#161616" points="177.9,230.9 172.6,226.9 146.3,226.9 140.6,230.9 138.1,253 140.4,250.8 178.1,250.8 180.6,253"/>
                    <polygon fill="#763d16" stroke="#763d16" points="278.3,114.2 286.8,73.4 274.1,35.5 177.9,106.9 214.9,138.2 267.2,153.5 278.8,140 273.6,136.2 281.8,128.8 275.4,123.8 283.6,117.6"/>
                    <polygon fill="#763d16" stroke="#763d16" points="31.8,73.4 40.3,114.2 35,117.6 43.2,123.8 36.8,128.8 45,136.2 39.8,140 51.3,153.5 103.6,138.2 140.6,106.9 44.4,35.5"/>
                    <polygon fill="#f6851b" stroke="#f6851b" points="267.2,153.5 214.9,138.2 230.8,162.1 207.1,208.1 238.3,207.7 284.8,207.7"/>
                    <polygon fill="#f6851b" stroke="#f6851b" points="103.6,138.2 51.3,153.5 33.9,207.7 80.3,207.7 111.4,208.1 87.8,162.1"/>
                    <polygon fill="#f6851b" stroke="#f6851b" points="174.6,164.6 177.9,106.9 193.1,65.8 125.6,65.8 140.6,106.9 144.1,164.6 146.3,180.6 146.3,226.9 172.6,226.9 172.6,180.6"/>
                  </svg>
                  MetaMask
                </button>
                <button type="button" onClick={() => walletConnect('WalletConnect')} className="wallet-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Link2 size={13} /> WalletConnect
                </button>
              </div>

              {/* Sign up */}
              <div className="signup-prompt">
                New to EnergyGrid? <Link to="/signup" className="signup-link">Create an account →</Link>
              </div>
            </form>
          </div>
        </div>

      </div>{/* login-wrap */}
    </div>
  );
}
