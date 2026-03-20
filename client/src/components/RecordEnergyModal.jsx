import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { recordEnergyReading } from '../api';
import { useToast } from '../contexts/ToastContext';

export default function RecordEnergyModal({ isOpen, onClose, onFinish }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ produced: '', consumed: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.produced || !formData.consumed) {
      return showToast('❌', 'Please enter both values');
    }

    setLoading(true);
    try {
      const res = await recordEnergyReading(+formData.produced, +formData.consumed);
      if (res.error) throw new Error(res.error);
      
      showToast('⚡', 'Reading recorded! Surplus updated.');
      onFinish && onFinish(res.reading);
      onClose();
      setFormData({ produced: '', consumed: '' }); // Reset
    } catch (err) {
      showToast('❌', err.message || 'Failed to record reading');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(12px)', background: 'rgba(0,4,8,0.7)'
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            style={{
              width: '90%', maxWidth: '400px',
              background: 'var(--card)', border: '1px solid var(--border2)',
              borderRadius: '20px', padding: '32px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 40px rgba(0,255,135,0.05)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                 <div style={{ fontSize: '24px' }}>⚡</div>
                 <h2 style={{ fontFamily: 'var(--display)', fontSize: '20px', fontWeight: 800 }}>Record Daily Energy</h2>
              </div>
              <button 
                onClick={onClose} 
                style={{ border: 'none', background: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '20px' }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '24px', lineHeight: 1.5 }}>
              Input your meter readings for today. This will calculate your tradeable surplus for the marketplace.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="input-group">
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text2)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Produced (kWh)</label>
                <input 
                  type="number" step="0.1"
                  value={formData.produced}
                  onChange={(e) => setFormData(p => ({ ...p, produced: e.target.value }))}
                  placeholder="e.g. 12.5"
                  autoFocus
                  style={{
                    width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: '10px', padding: '12px 14px', color: 'var(--text)', outline: 'none',
                    fontSize: '14px', fontFamily: 'var(--mono)'
                  }}
                />
              </div>

              <div className="input-group">
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text2)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Consumed (kWh)</label>
                <input 
                  type="number" step="0.1"
                  value={formData.consumed}
                  onChange={(e) => setFormData(p => ({ ...p, consumed: e.target.value }))}
                  placeholder="e.g. 5.2"
                  style={{
                    width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: '10px', padding: '12px 14px', color: 'var(--text)', outline: 'none',
                    fontSize: '14px', fontFamily: 'var(--mono)'
                  }}
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02, translateY: -2 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', background: 'var(--green)', color: '#001a0a',
                  border: 'none', borderRadius: '10px', padding: '14px',
                  fontWeight: 700, marginTop: '10px', fontSize: '14px', cursor: 'pointer',
                  opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
                  boxShadow: '0 8px 24px rgba(0,255,135,0.2)'
                }}
              >
                {loading ? 'Processing...' : 'Record & Update Surplus'}
              </motion.button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
