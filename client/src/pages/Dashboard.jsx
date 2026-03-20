import { useRef, useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import ForecastChart from '../components/ForecastChart';
import Ticker from '../components/Ticker';
import RecordEnergyModal from '../components/RecordEnergyModal';
import ListEnergyModal from '../components/ListEnergyModal';
import { generateTrades, leaders } from '../data';
import { useToast } from '../contexts/ToastContext';
import { getEnergySurplus } from '../api';

// Animated Number Component
function AnimatedNumber({ value, format = (v) => v.toFixed(1) }) {
  const nodeRef = useRef(null);
  const count = useMotionValue(0);
  const rounded = useTransform(count, (lat) => format(lat));

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.5, type: 'spring', bounce: 0 });
    return () => controls.stop();
  }, [value, count]);

  return <motion.span ref={nodeRef}>{rounded}</motion.span>;
}

const trades = generateTrades();

export default function Dashboard() {
  const { showToast } = useToast();
  const chartRef = useRef(null);
  const [stats, setStats] = useState({ prod: 0, cons: 0, surplus: 0, co2: 284 });
  const [modalOpen, setModalOpen] = useState(false);
  const [listModalOpen, setListModalOpen] = useState(false);

  const fetchRealData = async () => {
    try {
      const res = await getEnergySurplus();
      if (res.produced !== undefined) {
         setStats({
           prod: +res.produced,
           cons: +res.consumed,
           surplus: +res.surplus,
           co2: +(+res.produced * 0.45).toFixed(1) // 0.45 kg of CO2 saved per kWh produced
         });
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    }
  }

  useEffect(() => {
    fetchRealData();
    // Only simulate chart changes now, the cards are strictly backend-driven
    const interval = setInterval(() => {
      if (chartRef.current) {
        const last = chartRef.current.data.datasets[2].data;
        last[47] = +(Math.max(0, last[47] + (Math.random() * 0.3 - 0.1)).toFixed(2));
        chartRef.current.update('none');
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    { label: 'Solar Production', icon: '☀️', value: stats.prod, unit: 'kWh total', color: 'green' },
    { label: 'Energy Consumed', icon: '🔌', value: stats.cons, unit: 'kWh total', color: 'blue' },
    { label: 'Surplus Available', icon: '⚡', value: stats.surplus, unit: 'kWh tradeable', color: 'amber', action: 'List ↗' },
    { label: 'CO₂ Saved', icon: '🌱', value: Math.floor(stats.co2), unit: 'kg total offset', color: 'teal' },
  ];

  const colorMap = {
    green: { border: 'var(--green)', icon: 'rgba(0,255,135,0.08)', value: 'var(--green)' },
    blue: { border: 'var(--blue)', icon: 'rgba(14,165,233,0.08)', value: 'var(--blue)' },
    amber: { border: 'var(--amber)', icon: 'rgba(245,158,11,0.08)', value: 'var(--amber)' },
    teal: { border: 'var(--teal)', icon: 'rgba(0,229,204,0.08)', value: 'var(--teal)' },
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 350, damping: 20 } }
  };

  return (
    <motion.div className="page-pad" style={{ padding: '24px 28px' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      
      {/* Dashboard Header */}
      <div className="dash-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: '200px' }}>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '4px' }}>System Overview</h1>
          <p style={{ fontSize: '12px', color: 'var(--text2)' }}>Live energy monitoring and P2P trading activity</p>
        </div>
        
        <div className="dash-header-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <motion.button
            whileHover={{ scale: 1.05, translateY: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setModalOpen(true)}
            className="btn-glass"
            style={{
              background: 'rgba(0,255,135,0.06)', color: 'var(--green)', border: '1px solid rgba(0,255,135,0.15)',
              borderRadius: '10px', padding: '10px 18px', fontWeight: 700,
              fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '16px' }}>⚡</span>
            Record Today
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, translateY: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setListModalOpen(true)}
            className="btn-primary"
            style={{
              background: 'var(--amber)', color: '#1a1000', border: 'none',
              borderRadius: '10px', padding: '10px 18px', fontWeight: 700,
              fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
              cursor: 'pointer', boxShadow: '0 8px 20px rgba(245,158,11,0.15)'
            }}
          >
            <span style={{ fontSize: '16px' }}>🛒</span>
            Sell Surplus
          </motion.button>
        </div>
      </div>

      {/* Stats Row */}
      <motion.div className="dash-grid-4" style={{ marginBottom: '20px' }} variants={container} initial="hidden" animate="show">
        {statCards.map((s, i) => {
          const c = colorMap[s.color];
          const isListing = s.action === 'List ↗';
          return (
            <motion.div key={i} variants={item} className="stat-card" 
              whileHover={{ y: -8, scale: 1.03, borderColor: 'var(--border2)' }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: '14px', padding: '18px 20px',
              position: 'relative', overflow: 'hidden',
              cursor: 'default',
            }}
            >
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', borderRadius: '14px 0 0 14px', background: c.border }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text2)', fontWeight: 500, letterSpacing: '0.4px', textTransform: 'uppercase' }}>{s.label}</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', background: c.icon }}>{s.icon}</div>
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1, marginBottom: '6px', color: c.value }}>
                <AnimatedNumber value={s.value} format={v => i === 3 ? Math.floor(v) : v.toFixed(1)} />
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text3)', marginBottom: '4px' }}>{s.unit}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                {s.trend ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontFamily: 'var(--mono)' }}>
                    <span style={{ color: s.trendUp ? 'var(--green)' : 'var(--red)' }}>{s.trend}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text3)', marginLeft: '4px' }}>{s.sub}</span>
                  </div>
                ) : (
                  <span style={{ fontSize: '10px', color: 'var(--text3)' }}>Cumulative data</span>
                )}
                {s.action && (
                  <motion.button 
                    whileHover={{ scale: 1.1, x: 5 }} 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => isListing ? setListModalOpen(true) : setModalOpen(true)}
                    style={{
                      background: isListing ? 'var(--amber)' : 'rgba(245,158,11,0.1)', 
                      color: isListing ? '#1a1000' : 'var(--amber)', 
                      border: isListing ? 'none' : '1px solid rgba(245,158,11,0.2)',
                      borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                      boxShadow: isListing ? '0 4px 12px rgba(245,158,11,0.2)' : 'none'
                    }}
                  >
                    {s.action}
                  </motion.button>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Mid Row */}
      <div className="dash-grid-2" style={{ marginBottom: '20px' }}>
        <ForecastChart chartRef={chartRef} />

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Pool Gauge */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontFamily: 'var(--display)', fontSize: '15px', fontWeight: 600 }}>Community Pool</span>
              <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '20px', fontFamily: 'var(--mono)', fontWeight: 500, background: 'rgba(14,165,233,0.1)', color: 'var(--blue)', border: '1px solid rgba(14,165,233,0.2)' }}>42/50 kWh</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '140px', height: '80px' }}>
                <svg width="140" height="80" viewBox="0 0 140 80">
                  <path d="M 15 75 A 55 55 0 0 1 125 75" fill="none" stroke="var(--border2)" strokeWidth="10" strokeLinecap="round" />
                  <motion.path 
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, type: 'spring', bounce: 0, delay: 0.5 }}
                    d="M 15 75 A 55 55 0 0 1 125 75" fill="none" stroke="url(#gaugeGrad)" strokeWidth="10" strokeLinecap="round" strokeDasharray="173" strokeDashoffset="35" 
                  />
                  <defs>
                    <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="var(--green2)" />
                      <stop offset="100%" stopColor="var(--teal)" />
                    </linearGradient>
                  </defs>
                </svg>
                <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--green)', lineHeight: 1, fontFamily: 'var(--mono)' }}>84%</div>
                  <div style={{ fontSize: '10px', color: 'var(--text3)' }}>capacity</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '14px', width: '100%' }}>
                {[
                  { label: 'Stored', value: '42 kWh', color: 'var(--green)' },
                  { label: 'Capacity', value: '50 kWh', color: 'var(--text)' },
                  { label: 'Surplus In', value: '+2.1', color: 'var(--blue)' },
                  { label: 'Drawn Out', value: '-0.8', color: 'var(--amber)' },
                ].map(p => (
                  <div key={p.label} style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{p.label}</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '2px', fontFamily: 'var(--mono)', color: p.color }}>{p.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Carbon Impact */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontFamily: 'var(--display)', fontSize: '15px', fontWeight: 600 }}>Carbon Impact</span>
              <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '20px', fontFamily: 'var(--mono)', fontWeight: 500, background: 'rgba(0,229,204,0.1)', color: 'var(--teal)', border: '1px solid rgba(0,229,204,0.2)' }}>THIS MONTH</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', margin: '8px 0' }}>
              <span style={{ fontSize: '36px', fontWeight: 700, color: 'var(--teal)', letterSpacing: '-1px', fontFamily: 'var(--mono)' }}>
                <AnimatedNumber value={stats.co2} format={v => Math.floor(v)} />
              </span>
              <span style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '6px' }}>kg CO₂</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '12px' }}>≈ <span style={{ color: 'var(--teal)', fontWeight: 600 }}>{(stats.co2 / 21).toFixed(1)} trees</span> planted equivalent</div>
            <div style={{ fontSize: '10px', color: 'var(--text3)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Daily savings</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', height: '36px' }}>
              {[{ h: '50%', d: 'M' }, { h: '65%', d: 'T' }, { h: '45%', d: 'W' }, { h: '80%', d: 'T' }, { h: '70%', d: 'F' }, { h: '55%', d: 'S' }, { h: '90%', d: 'S' }].map((b, idx) => (
                <motion.div key={idx} 
                  initial={{ height: 0 }}
                  animate={{ height: b.h }}
                  transition={{ duration: 0.8, delay: 0.5 + idx * 0.05, type: 'spring' }}
                  style={{
                  flex: 1, borderRadius: '3px 3px 0 0',
                  background: idx === 6 ? 'rgba(0,229,204,0.7)' : 'rgba(0,229,204,0.25)',
                  position: 'relative',
                }}>
                  <span style={{ position: 'absolute', bottom: '-14px', left: '50%', transform: 'translateX(-50%)', fontSize: '9px', color: 'var(--text3)', whiteSpace: 'nowrap' }}>{b.d}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="dash-grid-bottom">
        {/* Trade History */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px' }}>
            <span style={{ fontFamily: 'var(--display)', fontSize: '15px', fontWeight: 600 }}>Recent Trades</span>
            <span style={{
              fontSize: '10px', padding: '3px 8px', borderRadius: '20px',
              fontFamily: 'var(--mono)', fontWeight: 500,
              background: 'rgba(0,255,135,0.08)', color: 'var(--green)', border: '1px solid rgba(0,255,135,0.2)',
            }}>10 TRADES</span>
          </div>
          <div className="trade-table-wrap">
          <table className="trade-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Time', 'Seller', 'Buyer', 'Units', 'Price', 'CO₂', 'TX Hash', 'Status'].map(h => (
                  <th key={h} style={{
                    fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase',
                    letterSpacing: '0.6px', fontWeight: 500, padding: '10px 14px',
                    borderBottom: '1px solid var(--border)', textAlign: 'left',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((t, i) => (
                <motion.tr key={i} 
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)', scale: 1.01, originX: 0 }}
                  transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
                  style={{
                  borderBottom: i === trades.length - 1 ? 'none' : '1px solid rgba(30,45,61,0.4)',
                }}
                >
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text3)' }}>{t.time}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: 'white', background: t.sellerColor, flexShrink: 0 }}>{t.seller[0]}</div>
                      <span>{t.seller}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: 'white', background: t.buyerColor, flexShrink: 0 }}>{t.buyer[0]}</div>
                      <span>{t.buyer}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--amber)' }}>{t.units}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--green)' }}>₹{t.price}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--green3)' }}>{t.co2} kg</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--blue)', cursor: 'pointer' }}
                    onClick={() => { navigator.clipboard?.writeText(t.hash).catch(() => { }); showToast('✓', 'TX hash copied to clipboard'); }}
                    title="Click to copy"
                  >{t.hash}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      fontSize: '10px', padding: '3px 8px', borderRadius: '20px',
                      fontFamily: 'var(--mono)', fontWeight: 500, display: 'inline-block',
                      ...(t.status === 'Settled'
                        ? { background: 'rgba(0,255,135,0.08)', color: 'var(--green)', border: '1px solid rgba(0,255,135,0.2)' }
                        : { background: 'rgba(245,158,11,0.08)', color: 'var(--amber)', border: '1px solid rgba(245,158,11,0.2)' }),
                    }}>{t.status}</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        {/* Leaderboard */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0' }}>
            <span style={{ fontFamily: 'var(--display)', fontSize: '15px', fontWeight: 600 }}>Top Traders</span>
            <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '20px', fontFamily: 'var(--mono)', fontWeight: 500, background: 'rgba(245,158,11,0.08)', color: 'var(--amber)', border: '1px solid rgba(245,158,11,0.2)' }}>REPUTATION</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 16px 16px' }}>
            {leaders.map((l, i) => (
              <div key={l.name} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 10px', borderRadius: '8px',
                background: 'var(--bg3)', border: '1px solid transparent',
                transition: 'border-color .2s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, color: i === 0 ? 'var(--amber)' : 'var(--text3)', width: '16px', fontFamily: 'var(--mono)' }}>{i === 0 ? '👑' : i + 1}</span>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: 'white', background: l.color }}>{l.name[0]}</div>
                <span style={{ flex: 1, fontSize: '12px', fontWeight: 500 }}>{l.name}</span>
                <div style={{ width: '50px', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${l.score}%` }}
                    transition={{ duration: 1, delay: 0.5 + i * 0.1, type: 'spring' }}
                    style={{ height: '4px', borderRadius: '2px', background: 'linear-gradient(90deg, var(--green2), var(--green3))' }} 
                  />
                </div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: 600, color: 'var(--green)' }}>{l.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Ticker />

      <RecordEnergyModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onFinish={fetchRealData}
      />

      <ListEnergyModal
        isOpen={listModalOpen}
        onClose={() => setListModalOpen(false)}
        maxSurplus={stats.surplus}
        onFinish={fetchRealData}
      />
    </motion.div>
  );
}
