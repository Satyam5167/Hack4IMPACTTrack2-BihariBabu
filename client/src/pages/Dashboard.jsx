import { useRef, useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Sun, Plug, Zap, Leaf, ShoppingCart } from 'lucide-react';
import Ticker from '../components/Ticker';
import RecordEnergyModal from '../components/RecordEnergyModal';
import ListEnergyModal from '../components/ListEnergyModal';
import { useToast } from '../contexts/ToastContext';
import { getEnergySurplus, getRecentTrades, getTopTraders, getPoolStats, getImpactStats } from '../api';

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

export default function Dashboard() {
  const { showToast } = useToast();
  const [stats, setStats] = useState({ prod: 0, cons: 0, surplus: 0, co2: 284 });
  const [modalOpen, setModalOpen] = useState(false);
  const [listModalOpen, setListModalOpen] = useState(false);
  const [recentTrades, setRecentTrades] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [poolStats, setPoolStats] = useState({ stored: 0, capacity: 500, percentage: 0, inboundToday: 0, outboundToday: 0 });
  const [impactHistory, setImpactHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRealData = async () => {
    try {
      setLoading(true);
      const res = await getEnergySurplus();
      if (res.produced !== undefined) {
        setStats({
          prod: +res.produced,
          cons: +res.consumed,
          surplus: +res.surplus,
          co2: +(+res.produced * 0.45).toFixed(1) // 0.45 kg of CO2 saved per kWh produced
        });
      }

      // Fetch trades
      const tradesRes = await getRecentTrades();
      if (tradesRes.trades) {
        const mappedTrades = tradesRes.trades.map(t => ({
          time: new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          seller: t.seller_name,
          sellerPic: t.seller_picture,
          sellerColor: '#ef4444',
          buyer: t.buyer_name,
          buyerPic: t.buyer_picture,
          buyerColor: '#3b82f6',
          units: t.amount_kwh,
          price: t.price_inr,
          co2: (parseFloat(t.amount_kwh) * 0.45).toFixed(1),
          hash: t.tx_hash.slice(0, 6) + '...' + t.tx_hash.slice(-4),
          fullHash: t.tx_hash,
          status: t.status === 'completed' || t.status === 'sold' ? 'Settled' : 'Pending'
        }));
        setRecentTrades(mappedTrades);
      }

      // Fetch leaders
      const topRes = await getTopTraders();
      if (topRes.topTraders) {
        setLeaders(topRes.topTraders);
      }

      // Fetch pool stats
      const pStats = await getPoolStats();
      if (pStats && pStats.stored !== undefined) {
        setPoolStats(pStats);
      }

      // Fetch impact stats
      const iStats = await getImpactStats();
      if (iStats && iStats.history) {
        setImpactHistory(iStats.history);
      }
    } catch (e) {
      console.error('Failed to fetch dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealData();
  }, []);

  const statCards = [
    { label: 'Solar Production', icon: Sun, value: stats.prod, unit: 'kWh total', color: 'green' },
    { label: 'Energy Consumed', icon: Plug, value: stats.cons, unit: 'kWh total', color: 'blue' },
    { label: 'Surplus Available', icon: Zap, value: stats.surplus, unit: 'kWh tradeable', color: 'amber', action: 'List ↗' },
    { label: 'CO₂ Saved', icon: Leaf, value: Math.floor(stats.co2), unit: 'kg total offset', color: 'teal' },
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
            <Zap size={15} />
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
            <ShoppingCart size={15} />
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
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.icon }}>
                  <s.icon size={15} color={c.value} />
                </div>
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1, marginBottom: '6px', color: c.value }}>
                {loading ? <div className="skeleton" style={{ width: '80px', height: '26px' }} /> : <AnimatedNumber value={s.value} format={v => i === 3 ? Math.floor(v) : v.toFixed(1)} />}
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

      {/* Mid Row — Community Pool + Carbon Impact */}
      <div style={{ display: 'grid', gap: '16px', marginBottom: '20px' }} className="dash-grid-2">
        {/* Pool Gauge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(14,165,233,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={16} color="var(--blue)" />
              </div>
              <h3 style={{ fontFamily: 'var(--display)', fontSize: '16px', fontWeight: 700, letterSpacing: '-0.2px' }}>Community Energy Pool</h3>
            </div>
            <div style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', fontFamily: 'var(--mono)', fontWeight: 600, background: 'rgba(14,165,233,0.08)', color: 'var(--blue)', border: '1px solid rgba(14,165,233,0.15)' }}>{poolStats.stored}/{poolStats.capacity} kWh</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* The Gauge */}
            <div style={{ position: 'relative', width: '150px', height: '85px', marginBottom: '10px' }} className="pool-gauge-container">
              <svg width="150" height="85" viewBox="0 0 150 85">
                <path d="M 20 80 A 55 55 0 0 1 130 80" fill="none" stroke="var(--border)" strokeWidth="12" strokeLinecap="round" />
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: poolStats.percentage / 100 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.8, ease: "easeOut", delay: 0.3 }}
                  d="M 20 80 A 55 55 0 0 1 130 80" fill="none" stroke="url(#poolGrad)" strokeWidth="12" strokeLinecap="round" strokeDasharray="173"
                />
                <defs>
                  <linearGradient id="poolGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--green)" />
                    <stop offset="100%" stopColor="var(--teal)" />
                  </linearGradient>
                </defs>
              </svg>
              <div style={{ position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--green)', lineHeight: 1, fontFamily: 'var(--mono)' }}>{poolStats.percentage}%</div>
                <div style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: '2px' }}>filled</div>
              </div>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px', width: '100%' }}>
              {[
                { label: 'Stored Pool', value: poolStats.stored, unit: 'kWh', color: 'var(--green)' },
                { label: 'Total Cap', value: poolStats.capacity, unit: 'kWh', color: 'var(--text)' },
                { label: 'Inbound Today', value: `+${poolStats.inboundToday}`, unit: 'kWh', color: 'var(--blue)' },
                { label: 'Outbound', value: `-${poolStats.outboundToday}`, unit: 'kWh', color: 'var(--amber)' },
              ].map((p, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ backgroundColor: 'var(--border)', scale: 1.02 }}
                  style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px', transition: 'all 0.2s ease' }}
                >
                  <div style={{ fontSize: '10px', color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{p.label}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--mono)', color: p.color }}>{p.value}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: 600 }}>{p.unit}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

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
            {(impactHistory.length > 0 ? impactHistory : [{ h: '20%', d: 'M' }, { h: '30%', d: 'T' }, { h: '25%', d: 'W' }, { h: '40%', d: 'T' }, { h: '35%', d: 'F' }, { h: '28%', d: 'S' }, { h: '10%', d: 'S' }]).map((b, idx) => (
              <motion.div key={idx}
                initial={{ height: 0 }}
                animate={{ height: b.h }}
                transition={{ duration: 0.8, delay: 0.5 + idx * 0.05, type: 'spring' }}
                style={{
                  flex: 1, borderRadius: '3px 3px 0 0',
                  background: idx === (impactHistory.length > 0 ? impactHistory.length - 1 : 6) ? 'rgba(0,229,204,0.7)' : 'rgba(0,229,204,0.25)',
                  position: 'relative',
                }}>
                <span style={{ position: 'absolute', bottom: '-14px', left: '50%', transform: 'translateX(-50%)', fontSize: '9px', color: 'var(--text3)', whiteSpace: 'nowrap' }}>{b.d}</span>
              </motion.div>
            ))}
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
                {loading ? Array(5).fill(0).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(30,45,61,0.4)' }}>
                    <td colSpan="8" style={{ padding: '10px 14px' }}>
                      <div className="skeleton" style={{ width: '100%', height: '20px' }}></div>
                    </td>
                  </tr>
                )) : recentTrades.map((t, i) => (
                  <motion.tr key={i}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)', scale: 1.01, originX: 0 }}
                    transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
                    style={{
                      borderBottom: i === recentTrades.length - 1 ? 'none' : '1px solid rgba(30,45,61,0.4)',
                    }}
                  >
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text3)' }}>{t.time}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {t.sellerPic ? (
                          <img src={t.sellerPic} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: 'white', background: t.sellerColor, flexShrink: 0 }}>{t.seller[0]}</div>
                        )}
                        <span>{t.seller}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {t.buyerPic ? (
                          <img src={t.buyerPic} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: 'white', background: t.buyerColor, flexShrink: 0 }}>{t.buyer[0]}</div>
                        )}
                        <span>{t.buyer}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--amber)' }}>{t.units}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--green)' }}>₹{t.price}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--green3)' }}>{t.co2} kg</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--blue)', cursor: 'pointer' }}
                      onClick={() => { navigator.clipboard?.writeText(t.fullHash).catch(() => { }); showToast('✓', 'TX hash copied to clipboard'); }}
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
            {loading ? Array(5).fill(0).map((_, i) => (
              <div key={i} className="skeleton" style={{ width: '100%', height: '36px', borderRadius: '8px' }}></div>
            )) : leaders.map((l, i) => (
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
                {l.picture ? (
                  <img src={l.picture} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: 'white', background: l.color }}>{l.name[0]}</div>
                )}
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
