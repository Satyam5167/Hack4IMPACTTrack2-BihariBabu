import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Zap, Wallet, ChevronRight, CheckCircle, AlertCircle,
  Save
} from 'lucide-react';
import { useAuth } from '../App';
import { useToast } from '../contexts/ToastContext';
import { updateUserProfile, getSolarPanel, upsertSolarPanel } from '../api';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [location, setLocation] = useState('');
  const [savingLoc, setSavingLoc] = useState(false);

  const [panel, setPanel] = useState({ panel_kw: '', panel_tilt: '15', panel_azimuth: '180', panel_efficiency: '0.18' });
  const [savingPanel, setSavingPanel] = useState(false);
  const [loadingPanel, setLoadingPanel] = useState(true);

  useEffect(() => {
    if (user?.location) setLocation(user.location);
  }, [user]);

  useEffect(() => {
    getSolarPanel().then(res => {
      if (res.panel) {
        setPanel({
          panel_kw:         res.panel.panel_kw,
          panel_tilt:       res.panel.panel_tilt,
          panel_azimuth:    res.panel.panel_azimuth,
          panel_efficiency: res.panel.panel_efficiency,
        });
      }
    }).finally(() => setLoadingPanel(false));
  }, []);

  const saveLocation = async () => {
    if (!location.trim()) return showToast('Warning', 'Please enter a location');
    setSavingLoc(true);
    const res = await updateUserProfile(location.trim());
    setSavingLoc(false);
    if (res.user) { updateUser(res.user); showToast('Success', 'Location saved'); }
    else showToast('Error', res.error || 'Failed to save location');
  };

  const savePanel = async () => {
    if (!panel.panel_kw) return showToast('Warning', 'Panel capacity is required');
    setSavingPanel(true);
    const res = await upsertSolarPanel({
      panel_kw:         parseFloat(panel.panel_kw),
      panel_tilt:       parseFloat(panel.panel_tilt) || 15,
      panel_azimuth:    parseFloat(panel.panel_azimuth) || 180,
      panel_efficiency: parseFloat(panel.panel_efficiency) || 0.18,
    });
    setSavingPanel(false);
    if (res.panel) showToast('Success', 'Panel info saved');
    else showToast('Error', res.error || 'Failed to save panel');
  };

  if (!user) return null;

  const profileComplete = user.location && panel.panel_kw;

  const card = {
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: '16px', padding: '24px 26px', marginBottom: '20px',
  };

  const label = {
    display: 'block', fontSize: '11px', color: 'var(--text3)',
    textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600,
    marginBottom: '8px', fontFamily: 'var(--mono)',
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    background: 'var(--bg2)', border: '1px solid var(--border)',
    color: 'var(--text)', fontSize: '13px', fontFamily: 'var(--body)',
    outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
  };

  const saveBtn = (color) => ({
    display: 'inline-flex', alignItems: 'center', gap: '7px',
    padding: '9px 20px', borderRadius: '10px', cursor: 'pointer',
    background: `${color}0d`, border: `1px solid ${color}33`,
    color, fontSize: '13px', fontWeight: 600, fontFamily: 'var(--body)',
    transition: 'all 0.2s',
  });

  return (
    <motion.div className="page-pad" style={{ padding: '32px 28px', maxWidth: '680px', margin: '0 auto' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
    >
      {/* Avatar + header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '28px' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0,
          background: user.picture ? 'transparent' : 'linear-gradient(135deg, #1565c0, #42a5f5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px', fontWeight: 700, color: 'white',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)', overflow: 'hidden',
        }}>
          {user.picture
            ? <img src={user.picture} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (user.name?.slice(0, 2).toUpperCase() || '??')}
        </div>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--display)', margin: '0 0 2px' }}>{user.name}</h2>
          <div style={{ fontSize: '13px', color: 'var(--text2)' }}>{user.email}</div>
          <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontFamily: 'var(--mono)' }}>
            {profileComplete
              ? <><CheckCircle size={12} color="var(--green)" /> <span style={{ color: 'var(--green)' }}>Profile complete — AI Forecast unlocked</span></>
              : <><AlertCircle size={12} color="var(--amber)" /> <span style={{ color: 'var(--amber)' }}>Complete location &amp; panel info to unlock AI Forecast</span></>
            }
          </div>
        </div>
      </div>

      {/* Section 1: Location */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0,229,204,0.08)', border: '1px solid rgba(0,229,204,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MapPin size={15} color="var(--teal)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', fontFamily: 'var(--display)' }}>Location</div>
            <div style={{ fontSize: '12px', color: 'var(--text2)' }}>Used to calculate solar irradiance for your area</div>
          </div>
        </div>

        <label style={label}>Your City / District</label>
        <input
          style={inputStyle}
          value={location}
          onChange={e => setLocation(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && saveLocation()}
          placeholder='e.g. "Bengaluru, India" or "Patna, Bihar"'
          onFocus={e => e.target.style.borderColor = 'var(--teal)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <p style={{ fontSize: '11px', color: 'var(--text3)', margin: '8px 0 0', fontFamily: 'var(--mono)' }}>
          Enter your city or district. Used to look up solar irradiance data.
        </p>
        <div style={{ marginTop: '16px' }}>
          <motion.button onClick={saveLocation} disabled={savingLoc}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{ ...saveBtn('var(--teal)'), opacity: savingLoc ? 0.6 : 1 }}
          >
            <Save size={13} /> {savingLoc ? 'Saving...' : 'Save Location'}
          </motion.button>
        </div>
      </div>

      {/* Section 2: Solar Panel */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={15} color="var(--amber)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', fontFamily: 'var(--display)' }}>Solar Panel Specs</div>
            <div style={{ fontSize: '12px', color: 'var(--text2)' }}>Used by the physics model to estimate your production</div>
          </div>
        </div>

        {loadingPanel ? (
          <div className="skeleton" style={{ width: '100%', height: '100px', borderRadius: '10px' }} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {[
              { key: 'panel_kw',         label: 'Capacity (kW) *', placeholder: 'e.g. 5',    type: 'number', step: '0.1', min: '0' },
              { key: 'panel_efficiency', label: 'Efficiency (0–1)', placeholder: 'e.g. 0.18', type: 'number', step: '0.01', min: '0.01', max: '1' },
              { key: 'panel_tilt',       label: 'Tilt Angle (°)',  placeholder: 'e.g. 15',   type: 'number', min: '0', max: '90' },
              { key: 'panel_azimuth',    label: 'Azimuth (°)',     placeholder: '180 = south', type: 'number', min: '0', max: '360' },
            ].map(field => (
              <div key={field.key}>
                <label style={label}>{field.label}</label>
                <input
                  style={inputStyle}
                  type={field.type} min={field.min} max={field.max} step={field.step}
                  value={panel[field.key]}
                  onChange={e => setPanel(p => ({ ...p, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  onFocus={e => e.target.style.borderColor = 'var(--amber)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
            ))}
          </div>
        )}

        <p style={{ fontSize: '11px', color: 'var(--text3)', margin: '12px 0 0', fontFamily: 'var(--mono)' }}>
          * Required. Tilt: 15° typical for Indian rooftops. Azimuth: 180° = south-facing.
        </p>
        <div style={{ marginTop: '16px' }}>
          <motion.button onClick={savePanel} disabled={savingPanel || loadingPanel}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{ ...saveBtn('var(--amber)'), opacity: (savingPanel || loadingPanel) ? 0.6 : 1 }}
          >
            <Save size={13} /> {savingPanel ? 'Saving...' : 'Save Panel Info'}
          </motion.button>
        </div>
      </div>

      {/* Wallet */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={15} color="var(--amber)" />
          </div>
          <div style={{ fontWeight: 700, fontSize: '15px', fontFamily: 'var(--display)' }}>Connected Wallet</div>
        </div>
        {user.wallet_address
          ? <div style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--amber)', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.18)', padding: '12px 16px', borderRadius: '10px', wordBreak: 'break-all' }}>{user.wallet_address}</div>
          : <div style={{ fontSize: '13px', color: 'var(--text2)' }}>No wallet connected. Connect one via the navbar.</div>
        }
      </div>

      {/* CTA to AI Forecast */}
      {profileComplete && (
        <div style={{ textAlign: 'center', marginTop: '4px' }}>
          <motion.button onClick={() => navigate('/ai-forecast')}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            style={{ padding: '12px 32px', borderRadius: '12px', cursor: 'pointer', background: 'linear-gradient(135deg, var(--green2), var(--teal))', border: 'none', color: '#001a0a', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--body)', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 20px rgba(0,255,135,0.2)' }}
          >
            View AI Forecast <ChevronRight size={15} />
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
