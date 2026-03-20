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
import ForecastChart from '../components/ForecastChart';

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

// ── Gate screen ───────────────────────────────────────────────────
function IncompleteGate({ missing }) {
  const navigate = useNavigate();
  const items = [
    { icon: MapPin, label: 'Location', desc: 'Your city for irradiance data', done: missing === 'panel' },
    { icon: Zap, label: 'Panel Specs', desc: 'kW, tilt, azimuth, efficiency', done: missing === 'location' },
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
      const panelRes = await getSolarPanel();
      const hasLocation = !!user?.location;
      const hasPanel = !!panelRes.panel;

      if (!hasLocation && !hasPanel) { setState('gate'); setGateMissing('both'); return; }
      if (!hasLocation) { setState('gate'); setGateMissing('location'); return; }
      if (!hasPanel) { setState('gate'); setGateMissing('panel'); return; }

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
    <div className="page-pad" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div className="dash-grid-4" style={{ marginBottom: '20px' }}>
        {Array(4).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: '90px', borderRadius: '14px' }} />)}
      </div>
      <div className="skeleton" style={{ height: '160px', borderRadius: '14px', marginBottom: '20px' }} />
      <div className="skeleton" style={{ height: '300px', borderRadius: '14px' }} />
    </div>
  );

  if (state === 'gate') return <IncompleteGate missing={gateMissing} />;

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
    { label: '48h Predicted', value: `${summary.total_predicted_kwh} kWh`, icon: Zap, color: 'var(--green)' },
    { label: 'Avg Confidence', value: `${summary.avg_confidence_pct}%`, icon: Target, color: 'var(--teal)' },
    { label: 'Peak Hour', value: new Date(summary.peak_hour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), icon: Star, color: 'var(--amber)' },
    { label: 'Peak Output', value: `${summary.peak_kwh} kWh`, icon: TrendingUp, color: 'var(--purple)' },
  ];

  return (
    <motion.div className="page-pad" style={{ maxWidth: '1100px', margin: '0 auto' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--green2), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(0,255,135,0.3)' }}>
              <Bot size={18} color="#001a0a" />
            </div>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: '22px', fontWeight: 700 }}>AI Solar Forecast</h1>
          </div>
          <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '20px', background: 'rgba(0,255,135,0.08)', color: 'var(--green)', border: '1px solid rgba(0,255,135,0.2)', fontFamily: 'var(--mono)', fontWeight: 600 }}>LIVE · 48H</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text2)', fontSize: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={12} />
            <span>{location}</span>
          </div>
          <span style={{ margin: '0 2px', color: 'var(--border)', opacity: 0.5 }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Zap size={12} />
            <span>{panel_kw} kW panel</span>
          </div>
          <span style={{ margin: '0 2px', color: 'var(--border)', opacity: 0.5 }}>|</span>
          <span style={{ opacity: 0.8 }}>pvlib AI</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="dash-grid-4" style={{ marginBottom: '20px' }}>
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


      {/* Interactive Forecast Chart */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} style={{ marginBottom: '20px' }}>
        <ForecastChart forecast={next48} />
      </motion.div>
    </motion.div>
  );
}
