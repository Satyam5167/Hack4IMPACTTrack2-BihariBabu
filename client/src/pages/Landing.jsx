import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useToast } from '../contexts/ToastContext';
import './Landing.css';

export default function Landing() {
  const { showToast } = useToast();
  const sparkChartRef = useRef(null);

  useEffect(() => {
    // ── Counter animation ──
    function countUp(id, target, suffix = '', duration = 2000) {
      const el = document.getElementById(id);
      if (!el) return;
      let start = 0;
      const step = target / duration * 16;
      const timer = setInterval(() => {
        start = Math.min(start + step, target);
        el.textContent = Math.floor(start).toLocaleString() + suffix;
        if (start >= target) clearInterval(timer);
      }, 16);
    }

    const t = setTimeout(() => {
      countUp('c1', 14700, '+');
      countUp('c2', 284, '');
      countUp('c3', 5800, 'kg');
    }, 400);

    return () => {
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    // ── Sparkline chart ──
    const sc = sparkChartRef.current;
    if (!sc) return;

    sc.innerHTML = '';

    const heights = [30, 45, 65, 50, 75, 85, 60, 90, 70, 80, 95, 75, 65, 80, 70];
    heights.forEach((h, i) => {
      const b = document.createElement('div');
      b.className = 'bar-spark' + (i === heights.length - 1 ? ' hi' : '');
      b.style.height = h + '%';
      sc.appendChild(b);
    });

    // ── Animate sparkline ──
    const chartInterval = setInterval(() => {
      const bars = sc.querySelectorAll('.bar-spark');
      bars.forEach(b => {
        const newH = Math.max(20, Math.min(100, parseInt(b.style.height) + (Math.random() * 20 - 10)));
        b.style.height = newH + '%';
      });
    }, 2000);

    return () => clearInterval(chartInterval);
  }, []);

  const revealProps = {
    initial: { opacity: 0, y: 50, scale: 0.9 },
    whileInView: { opacity: 1, y: 0, scale: 1 },
    viewport: { once: false, amount: 0.15 },
    transition: { type: "spring", stiffness: 100, damping: 15, duration: 0.6 }
  };

  return (
    <div className="landing-page-container">
      <div className="wrap">

        {/* NAV */}
        <motion.nav 
          initial={{ y: -20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          transition={{ duration: 0.6 }}
        >
          <Link to="/" className="nav-logo">
            <div className="logo-mark">⚡</div>
            EnergyGrid
          </Link>
          <div className="nav-links">
            <a href="#how" className="nav-link">How it works</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="#community" className="nav-link">Community</a>
            <Link to="/login" className="nav-cta">Launch App →</Link>
          </div>
        </motion.nav>

        {/* HERO */}
        <section className="hero">
          {/* Floating cards */}
          <motion.div className="hero-float float-1" initial={{ opacity: 0, scale: 0.5, x: -50 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.2 }}>
            <motion.div className="float-card" whileHover={{ scale: 1.1, rotate: 2 }} transition={{ type: "spring", stiffness: 300 }}>
              <div className="float-label">Live trade</div>
              <div className="float-val g">+3.2 kWh</div>
              <div className="float-trend">⚡ Priya → Ravi · ₹6.40</div>
            </motion.div>
          </motion.div>
          <motion.div className="hero-float float-2" initial={{ opacity: 0, scale: 0.5, y: -50 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.4 }}>
            <motion.div className="float-card" whileHover={{ scale: 1.1, rotate: -2 }} transition={{ type: "spring", stiffness: 300 }}>
              <div className="float-label">AI Forecast</div>
              <div className="float-val a">8.4 kWh</div>
              <div className="float-trend" style={{ color: 'var(--text2)' }}>next 4 hours ↑</div>
            </motion.div>
          </motion.div>
          <motion.div className="hero-float float-3" initial={{ opacity: 0, scale: 0.5, x: 50 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.6 }}>
            <motion.div className="float-card" whileHover={{ scale: 1.1, rotate: 2 }} transition={{ type: "spring", stiffness: 300 }}>
              <div className="float-label">CO₂ Saved Today</div>
              <div className="float-val b">142 kg</div>
              <div className="float-trend">🌱 microgrid total</div>
            </motion.div>
          </motion.div>

          <motion.div style={{ maxWidth: '780px', width: '100%' }} initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}>
            <div className="hero-eyebrow">
              <div className="eyebrow-dot"></div>
              P2P SOLAR ENERGY TRADING · LIVE ON SEPOLIA
            </div>

            <h1 className="hero-title">
              <span className="line1">Your Roof.</span>
              <span className="line2">Your Market.</span>
            </h1>

            <p className="hero-sub">
              Trade surplus solar energy directly with your neighbors. AI predicts availability, blockchain ensures trust. No middlemen, no waste.
            </p>

            <div className="hero-actions">
              <Link to="/login">
                <motion.div className="btn-primary" style={{ display: "inline-block" }} whileHover={{ scale: 1.1, translateY: -4 }} whileTap={{ scale: 0.9 }}>Start Trading Free</motion.div>
              </Link>
              <a href="#how" style={{ textDecoration: 'none' }}>
                <motion.div className="btn-outline" style={{ display: "inline-block" }} whileHover={{ scale: 1.1, translateY: -4 }} whileTap={{ scale: 0.9 }}>See how it works</motion.div>
              </a>
            </div>

            <div className="hero-stats">
              <div className="h-stat">
                <span className="h-stat-num" id="c1">0</span>
                <span className="h-stat-label">kWh Traded</span>
              </div>
              <div className="h-stat">
                <span className="h-stat-num" id="c2">0</span>
                <span className="h-stat-label">Households Live</span>
              </div>
              <div className="h-stat">
                <span className="h-stat-num" id="c3">0</span>
                <span className="h-stat-label">CO₂ Saved (kg)</span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* STATS BAND */}
        <motion.div className="stats-band" {...revealProps} transition={{ type: "spring", stiffness: 120, damping: 15 }}>
          <div className="stats-inner">
            <div className="big-stat"><div className="big-num">14.7k</div><div className="big-label">kWh Traded</div></div>
            <div className="big-stat"><div className="big-num">284</div><div className="big-label">Active Homes</div></div>
            <div className="big-stat"><div className="big-num">5.8t</div><div className="big-label">CO₂ Offset</div></div>
            <div className="big-stat"><div className="big-num">₹2.1L</div><div className="big-label">Earned by Sellers</div></div>
          </div>
        </motion.div>

        {/* HOW IT WORKS */}
        <section className="section" id="how">
          <motion.div {...revealProps}>
            <div className="section-eyebrow">How it works</div>
            <h2 className="section-title">Four steps to your<br />first trade</h2>
            <p className="section-sub">From your solar panels to your neighbor's meter — fully automated, fully transparent.</p>
          </motion.div>

          <motion.div className="steps-grid" {...revealProps} transition={{ ...revealProps.transition, delay: 0.1 }}>
            <div className="step">
              <div className="step-num">01 —</div>
              <div className="step-icon" style={{ background: 'rgba(0,255,135,0.08)' }}>☀️</div>
              <div className="step-title">Simulate Solar</div>
              <div className="step-desc">Your panel's output is modeled using an irradiance curve — time of day, weather, and panel size.</div>
              <div className="step-connector"></div>
            </div>
            <div className="step">
              <div className="step-num">02 —</div>
              <div className="step-icon" style={{ background: 'rgba(14,165,233,0.08)' }}>🤖</div>
              <div className="step-title">AI Forecasts</div>
              <div className="step-desc">Our ML model predicts your production 48 hours ahead with a confidence band so you plan trades early.</div>
              <div className="step-connector"></div>
            </div>
            <div className="step">
              <div className="step-num">03 —</div>
              <div className="step-icon" style={{ background: 'rgba(245,158,11,0.08)' }}>🔄</div>
              <div className="step-title">Order Book Matches</div>
              <div className="step-desc">A double-auction engine matches buyers and sellers by price-time priority. No manual negotiation needed.</div>
              <div className="step-connector"></div>
            </div>
            <div className="step">
              <div className="step-num">04 —</div>
              <div className="step-icon" style={{ background: 'rgba(0,229,204,0.08)' }}>🔗</div>
              <div className="step-title">On-Chain Settlement</div>
              <div className="step-desc">Every settled trade is logged on Sepolia with a verifiable TX hash and CO₂ credit. Immutable audit trail.</div>
            </div>
          </motion.div>
        </section>

        {/* FEATURES */}
        <section className="section" id="features">
          <div className="features-layout">
            <motion.div {...revealProps}>
              <div className="section-eyebrow">Platform Features</div>
              <h2 className="section-title">Built for the<br />decentralized grid</h2>
              <p className="section-sub" style={{ marginBottom: '32px' }}>Every component designed to make local energy markets real, not theoretical.</p>

              <div className="feature-list">
                <div className="feature-item">
                  <div className="feature-icon" style={{ background: 'rgba(0,255,135,0.08)' }}>🤖</div>
                  <div className="feature-text">
                    <div className="feature-title">AI-Powered Forecasting</div>
                    <div className="feature-desc">Prophet/LSTM model trained on historical production. 48h predictions with confidence bands shown right on the dashboard.</div>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon" style={{ background: 'rgba(245,158,11,0.08)' }}>⚖️</div>
                  <div className="feature-text">
                    <div className="feature-title">Bounded Dynamic Pricing</div>
                    <div className="feature-desc">Price discovery via double auction. Floor ₹2 — ceiling ₹15. No negative prices, no market manipulation.</div>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon" style={{ background: 'rgba(0,229,204,0.08)' }}>🌱</div>
                  <div className="feature-text">
                    <div className="feature-title">Carbon Credit Tracking</div>
                    <div className="feature-desc">Every traded kWh earns 0.4 kg CO₂ credit. Track your environmental impact and share your green badge.</div>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon" style={{ background: 'rgba(14,165,233,0.08)' }}>🔋</div>
                  <div className="feature-text">
                    <div className="feature-title">Community Battery Pool</div>
                    <div className="feature-desc">Shared 50 kWh virtual buffer absorbs excess when no buyer is present. Keeps the microgrid stable 24/7.</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Dashboard mockup */}
            <motion.div {...revealProps} transition={{ ...revealProps.transition, delay: 0.15 }}>
              <div className="dash-preview">
                <div className="dash-preview-bar">
                  <div className="db-dot" style={{ background: '#ff5f57' }}></div>
                  <div className="db-dot" style={{ background: '#ffbd2e' }}></div>
                  <div className="db-dot" style={{ background: '#28ca41' }}></div>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text3)', marginLeft: '8px' }}>energygrid.app/dashboard</span>
                </div>
                <div className="dash-inner">
                  <div className="dash-cards-row">
                    <div className="dash-mini-card">
                      <div className="dmc-label">Solar</div>
                      <div className="dmc-val" style={{ color: 'var(--green)' }}>8.4 kWh</div>
                    </div>
                    <div className="dash-mini-card">
                      <div className="dmc-label">Surplus</div>
                      <div className="dmc-val" style={{ color: 'var(--amber)' }}>3.3 kWh</div>
                    </div>
                    <div className="dash-mini-card">
                      <div className="dmc-label">CO₂ Saved</div>
                      <div className="dmc-val" style={{ color: 'var(--teal)' }}>284 kg</div>
                    </div>
                  </div>
                  <div className="dash-chart-mock" id="sparkChart" ref={sparkChartRef}></div>
                  <div className="dash-ob-row">
                    <div className="ob-mini">
                      <div className="ob-mini-title" style={{ color: 'var(--red,#f87171)' }}>↑ SELL</div>
                      <div className="ob-mini-row"><span style={{ color: '#f87171' }}>₹6.35</span><span style={{ color: 'var(--text2)' }}>1.2 kWh</span></div>
                      <div className="ob-mini-row"><span style={{ color: '#f87171' }}>₹6.50</span><span style={{ color: 'var(--text2)' }}>2.4 kWh</span></div>
                      <div className="ob-mini-row"><span style={{ color: '#f87171' }}>₹6.70</span><span style={{ color: 'var(--text2)' }}>0.8 kWh</span></div>
                    </div>
                    <div className="ob-mini">
                      <div className="ob-mini-title" style={{ color: 'var(--green)' }}>↓ BUY</div>
                      <div className="ob-mini-row"><span style={{ color: 'var(--green)' }}>₹6.20</span><span style={{ color: 'var(--text2)' }}>2.8 kWh</span></div>
                      <div className="ob-mini-row"><span style={{ color: 'var(--green)' }}>₹6.05</span><span style={{ color: 'var(--text2)' }}>1.6 kWh</span></div>
                      <div className="ob-mini-row"><span style={{ color: 'var(--green)' }}>₹5.90</span><span style={{ color: 'var(--text2)' }}>0.9 kWh</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* COMMUNITY */}
        <section className="section" id="community">
          <motion.div {...revealProps}>
            <div className="section-eyebrow">Community</div>
            <h2 className="section-title">Real households,<br />real savings</h2>
          </motion.div>

          <div className="households-grid">
            <motion.div className="household-card" {...revealProps}>
              <div className="hh-top">
                <div className="hh-avatar" style={{ background: 'linear-gradient(135deg,#1565c0,#42a5f5)' }}>AK</div>
                <div><div className="hh-name">Arjun Kulkarni</div><div className="hh-loc">Koramangala, Bengaluru</div></div>
              </div>
              <div className="hh-quote">"My 5 kW rooftop was idle after noon. Now I sell 2–3 kWh daily and cover my electricity bill completely."</div>
              <div className="hh-stats">
                <div><div className="hh-stat-val">₹1,840</div><div className="hh-stat-l">earned this month</div></div>
                <div><div className="hh-stat-val">47 kg</div><div className="hh-stat-l">CO₂ offset</div></div>
              </div>
            </motion.div>
            <motion.div className="household-card" {...revealProps} transition={{ ...revealProps.transition, delay: 0.1 }}>
              <div className="hh-top">
                <div className="hh-avatar" style={{ background: 'linear-gradient(135deg,#6a1b9a,#ab47bc)' }}>PS</div>
                <div><div className="hh-name">Priya Sharma</div><div className="hh-loc">Banjara Hills, Hyderabad</div></div>
              </div>
              <div className="hh-quote">"The AI prediction is eerily accurate. I set limit orders the evening before and wake up to settled trades."</div>
              <div className="hh-stats">
                <div><div className="hh-stat-val">₹3,210</div><div className="hh-stat-l">earned this month</div></div>
                <div><div className="hh-stat-val">98</div><div className="hh-stat-l">reputation score</div></div>
              </div>
            </motion.div>
            <motion.div className="household-card" {...revealProps} transition={{ ...revealProps.transition, delay: 0.2 }}>
              <div className="hh-top">
                <div className="hh-avatar" style={{ background: 'linear-gradient(135deg,#00695c,#26a69a)' }}>RM</div>
                <div><div className="hh-name">Ravi Menon</div><div className="hh-loc">Indiranagar, Bengaluru</div></div>
              </div>
              <div className="hh-quote">"As a buyer I get cheaper power than the grid rate during peak afternoon hours. Win-win for the whole block."</div>
              <div className="hh-stats">
                <div><div className="hh-stat-val">₹940</div><div className="hh-stat-l">saved this month</div></div>
                <div><div className="hh-stat-val">28 kg</div><div className="hh-stat-l">CO₂ offset</div></div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="cta-section">
          <div className="cta-glow"></div>
          <motion.div className="cta-box" {...revealProps}>
            <div className="section-eyebrow" style={{ textAlign: 'center' }}>Join the waitlist</div>
            <div className="cta-title">Ready to trade<br />your sunshine?</div>
            <div className="cta-sub">Connect your rooftop. Join your neighborhood microgrid. Start earning.</div>
            <div className="cta-form">
              <input type="email" className="cta-input" placeholder="your@email.com" />
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <motion.div className="btn-primary" style={{ whiteSpace: 'nowrap' }} whileHover={{ scale: 1.1, translateY: -4 }} whileTap={{ scale: 0.9 }} onClick={() => showToast('🚀', 'Welcome to the waitlist!')}>Get Early Access</motion.div>
              </Link>
            </div>
            <div className="cta-hint">No credit card required · Sepolia testnet · Open source</div>
          </motion.div>
        </section>

        {/* FOOTER */}
        <footer>
          <div className="footer-left">
            <div className="logo-mark" style={{ width: '24px', height: '24px', fontSize: '12px' }}>⚡</div>
            <span className="footer-copy">© 2025 EnergyGrid · Built for Hackathon</span>
          </div>
          <div className="footer-links">
            <a href="#" className="footer-link">GitHub</a>
            <a href="#" className="footer-link">Whitepaper</a>
            <Link to="/login" className="footer-link">Launch App</Link>
          </div>
        </footer>

      </div>{/* wrap */}
    </div>
  );
}
