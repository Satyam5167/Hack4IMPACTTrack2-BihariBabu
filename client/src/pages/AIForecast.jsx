import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Bot, Target, Zap, TrendingUp, Star, Cloud, Thermometer,
  Clock, AlertTriangle, RefreshCw, MapPin, Lock, CheckCircle, Circle
} from 'lucide-react';
import { useAuth } from '../App';
import { useToast } from '../contexts/ToastContext';
import { getForecast, getSolarPanel } from '../api';

// ── Confidence Badge ───────────────────────────────────────────────
function ConfidenceBadge({ value }) {
  const color = value >= 80 ? '#00ff87' : value >= 60 ? '#f59e0b' : '#ff4d6d';
  return (
    <span style={{
      fontSize: '10px', padding: '2px 7px', borderRadius: '10px',
      background: `${color}1a`, border: `1px solid ${color}40`,
      color, fontFamily: 'var(--mono)', fontWeight: 600,
    }}>{value}%</span>
  );
}

// ── 48h Bar Chart ─────────────────────────────────────────────────
function HourChart({ forecast }) {
  if (!forecast?.length) return null;
  const maxY = Math.max(...forecast.map(h => h.yhat), 0.1);

  return (
    <div style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '80px', padding: '0 4px' }}>
        {forecast.map((h, i) => {
          const pct  = (h.yhat / maxY) * 100;
          const conf = h.confidence;
          const color = conf >= 80 ? 'var(--green)' : conf >= 60 ? 'var(--amber)' : 'var(--red)';
          const hour  = new Date(h.hour).getHours();
          const isNight = hour < 6 || hour >= 20;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(isNight ? 0 : 2, pct)}%` }}
                transition={{ duration: 0.6, delay: i * 0.01, type: 'spring', bounce: 0 }}
                style={{
                  width: '100%', borderRadius: '3px 3px 0 0',
                  background: isNight ? 'rgba(255,255,255,0.04)' : color,
                  opacity: isNight ? 1 : 0.7 + (conf / 333),
                  minHeight: '2px',
                  boxShadow: isNight ? 'none' : `0 0 6px ${color}60`,
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', padding: '4px 4px 0' }}>
        {forecast.map((h, i) => {
          const hour = new Date(h.hour).getHours();
          const show = i % 6 === 0;
          return (
            <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '9px', color: 'var(--text3)', fontFamily: 'var(--mono)', opacity: show ? 1 : 0 }}>
              {show ? `${String(hour).padStart(2, '0')}h` : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Gate screen ───────────────────────────────────────────────────
function IncompleteGate({ missing }) {
  const navigate = useNavigate();
  const items = [
    { icon: MapPin, label: 'Location', desc: 'Your city for irradiance data', done: missing === 'panel' },
    { icon: Zap,    label: 'Panel Specs', desc: 'kW, tilt, azimuth, efficiency', done: missing === 'location' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '40px 20px' }}
    >
      <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
        <Lock size={32} color="var(--red)" />
      </div>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>AI Forecast Locked</h2>
      <p style={{ color: 'var(--text2)', fontSize: '13px', maxWidth: '400px', lineHeight: 1.7, marginBottom: '28px' }}>
        To generate a personalised solar forecast, we need your{' '}
        <span style={{ color: 'var(--amber)', fontWeight: 600 }}>
          {missing === 'location' ? 'location' : missing === 'panel' ? 'solar panel specs' : 'location and solar panel specs'}
        </span>{' '}from your profile.
      </p>
      <motion.button onClick={() => navigate('/profile')}
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
        style={{ padding: '11px 28px', borderRadius: '12px', cursor: 'pointer', background: 'linear-gradient(135deg, var(--green2), var(--teal))', border: 'none', color: '#001a0a', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--body)', display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        Complete Profile
      </motion.button>

      <div style={{ marginTop: '36px', display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {items.map(({ icon: Icon, label, desc, done }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', borderRadius: '12px', background: 'var(--card)', border: `1px solid ${done ? 'rgba(0,255,135,0.2)' : 'var(--border)'}` }}>
            {done
              ? <CheckCircle size={18} color="var(--green)" />
              : <Circle size={18} color="var(--text3)" />}
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: done ? 'var(--green)' : 'var(--text)' }}>{label}</div>
              <div style={{ fontSize: '11px', color: 'var(--text2)' }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export default function AIForecast() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [state, setState] = useState('loading');
  const [gateMissing, setGateMissing] = useState(null);
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const panelRes  = await getSolarPanel();
      const hasLocation = !!user?.location;
      const hasPanel    = !!panelRes.panel;

      if (!hasLocation && !hasPanel) { setState('gate'); setGateMissing('both');     return; }
      if (!hasLocation)              { setState('gate'); setGateMissing('location'); return; }
      if (!hasPanel)                 { setState('gate'); setGateMissing('panel');    return; }

      const forecastRes = await getForecast();

      if (forecastRes.error === 'profile_incomplete') {
        setState('gate'); setGateMissing(forecastRes.missing); return;
      }
      if (forecastRes.error) {
        setState('error'); showToast('Error', forecastRes.error); return;
      }

      setData(forecastRes);
      setState('ready');
    } catch (err) {
      setState('error');
      console.error(err);
    }
  }, [user]);

  useEffect(() => { if (user) load(); }, [user, load]);

  const card = {
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: '14px', padding: '20px 24px',
  };

  // ── Loading skeleton ───────────────────────────────────────────
  if (state === 'loading') return (
    <div style={{ padding: '32px 28px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
        {Array(4).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: '90px', borderRadius: '14px' }} />)}
      </div>
      <div className="skeleton" style={{ height: '160px', borderRadius: '14px', marginBottom: '20px' }} />
      <div className="skeleton" style={{ height: '300px', borderRadius: '14px' }} />
    </div>
  );

  if (state === 'gate')  return <IncompleteGate missing={gateMissing} />;

  // ── Error state ────────────────────────────────────────────────
  if (state === 'error') return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <AlertTriangle size={28} color="var(--amber)" />
      </div>
      <h3 style={{ fontFamily: 'var(--display)', marginBottom: '10px' }}>Could not load forecast</h3>
      <p style={{ color: 'var(--text2)', marginBottom: '24px', fontSize: '13px' }}>Make sure the Python AI service is running on port 5001.</p>
      <motion.button onClick={load} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
        style={{ padding: '10px 24px', borderRadius: '10px', cursor: 'pointer', background: 'rgba(0,255,135,0.08)', border: '1px solid rgba(0,255,135,0.2)', color: 'var(--green)', fontSize: '13px', fontFamily: 'var(--body)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
      >
        <RefreshCw size={14} /> Retry
      </motion.button>
    </div>
  );

  // ── Ready ──────────────────────────────────────────────────────
  const { summary, forecast, location, panel_kw } = data;
  const next48 = forecast ?? [];

  const statCards = [
    { label: '48h Predicted', value: `${summary.total_predicted_kwh} kWh`, icon: Zap,       color: 'var(--green)' },
    { label: 'Avg Confidence', value: `${summary.avg_confidence_pct}%`,   icon: Target,     color: 'var(--teal)' },
    { label: 'Peak Hour',      value: new Date(summary.peak_hour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), icon: Star, color: 'var(--amber)' },
    { label: 'Peak Output',    value: `${summary.peak_kwh} kWh`,          icon: TrendingUp, color: 'var(--purple)' },
  ];

  return (
    <motion.div className="page-pad" style={{ padding: '24px 28px', maxWidth: '1100px', margin: '0 auto' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--green2), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(0,255,135,0.3)' }}>
            <Bot size={18} color="#001a0a" />
          </div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '22px', fontWeight: 700 }}>AI Solar Forecast</h1>
          <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '20px', background: 'rgba(0,255,135,0.08)', color: 'var(--green)', border: '1px solid rgba(0,255,135,0.2)', fontFamily: 'var(--mono)', fontWeight: 600 }}>LIVE · 48H</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text2)', fontSize: '12px' }}>
          <MapPin size={12} />
          <span>{location}</span>
          <span style={{ margin: '0 4px', color: 'var(--border)' }}>·</span>
          <Zap size={12} />
          <span>{panel_kw} kW panel</span>
          <span style={{ margin: '0 4px', color: 'var(--border)' }}>·</span>
          <span>pvlib + scipy</span>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }} className="dash-grid-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, type: 'spring' }}
              style={{ ...card, display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: `${s.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={14} color={s.color} />
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</span>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--mono)', color: s.color }}>{s.value}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Chart */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        style={{ ...card, marginBottom: '20px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <span style={{ fontFamily: 'var(--display)', fontSize: '14px', fontWeight: 600 }}>48-Hour Production Chart</span>
          <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--mono)', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--green)', display: 'inline-block' }} />High</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--amber)', display: 'inline-block' }} />Medium</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--red)', display: 'inline-block' }} />Low</span>
          </div>
        </div>
        <HourChart forecast={next48} />
      </motion.div>

      {/* Forecast Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Clock size={15} color="var(--text2)" />
          <span style={{ fontFamily: 'var(--display)', fontSize: '14px', fontWeight: 600 }}>Hourly Forecast — Next 48 Hours</span>
        </div>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '580px' }}>
            <thead>
              <tr>
                {[
                  { label: 'Hour',           icon: Clock       },
                  { label: 'Predicted (kWh)', icon: Zap        },
                  { label: 'Min',             icon: null       },
                  { label: 'Max',             icon: null       },
                  { label: 'Confidence',      icon: Target     },
                  { label: 'Cloud',           icon: Cloud      },
                  { label: 'Temp',            icon: Thermometer},
                ].map(({ label, icon: Icon }) => (
                  <th key={label} style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500, padding: '8px 12px', borderBottom: '1px solid var(--border)', textAlign: 'left', fontFamily: 'var(--mono)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {Icon && <Icon size={10} />}{label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {next48.map((h, i) => {
                const dt      = new Date(h.hour);
                const isNow   = i === 0;
                const isNight = dt.getHours() < 6 || dt.getHours() >= 20;
                return (
                  <tr key={i} style={{
                    borderBottom: i === next48.length - 1 ? 'none' : '1px solid rgba(30,45,61,0.4)',
                    background: isNow ? 'rgba(0,255,135,0.03)' : 'transparent',
                    opacity: isNight ? 0.5 : 1,
                  }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: '11px', color: isNow ? 'var(--green)' : 'var(--text2)', whiteSpace: 'nowrap' }}>
                      {isNow && <span style={{ marginRight: '4px', color: 'var(--green)' }}>▶</span>}
                      {dt.toLocaleDateString([], { month: 'short', day: 'numeric' })} {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--green)', fontWeight: 700 }}>{h.yhat.toFixed(3)}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text2)' }}>{h.yhat_lower.toFixed(3)}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text2)' }}>{h.yhat_upper.toFixed(3)}</td>
                    <td style={{ padding: '8px 12px' }}><ConfidenceBadge value={h.confidence} /></td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--blue)' }}>{h.cloud_cover}%</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text2)' }}>{h.temperature}°C</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
