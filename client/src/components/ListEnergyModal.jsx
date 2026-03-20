import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createEnergyListing } from '../api';
import { useToast } from '../contexts/ToastContext';

export default function ListEnergyModal({ isOpen, onClose, maxSurplus, onFinish }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ amount: '', price: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.price) {
      return showToast('❌', 'Please enter both amount and price');
    }

    if (+formData.amount > maxSurplus) {
       return showToast('❌', `Insufficient surplus. Max: ${maxSurplus} kWh`);
    }

    setLoading(true);
    try {
      const res = await createEnergyListing(+formData.amount, +formData.price);
      if (res.error) throw new Error(res.error);
      
      showToast('🎉', 'Energy listed in marketplace!');
      onFinish && onFinish(res.listing);
      onClose();
      setFormData({ amount: '', price: '' });
    } catch (err) {
      showToast('❌', err.message || 'Failed to create listing');
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
              boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 40px rgba(245,158,11,0.05)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                 <div style={{ fontSize: '24px' }}>🛒</div>
                 <h2 style={{ fontFamily: 'var(--display)', fontSize: '20px', fontWeight: 800 }}>List Surplus Energy</h2>
              </div>
              <button 
                onClick={onClose} 
                style={{ border: 'none', background: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '20px' }}
              >
                &times;
              </button>
            </div>

            <div style={{ 
              background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)',
              borderRadius: '10px', padding: '12px', marginBottom: '24px'
            }}>
              <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AVAILABLE TO SELL</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--amber)', fontFamily: 'var(--mono)' }}>{maxSurplus.toFixed(1)} kWh</div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="input-group">
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text2)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Amount to Sell (kWh)</label>
                <input 
                  type="number" step="0.1"
                  value={formData.amount}
                  onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))}
                  placeholder="e.g. 2.0"
                  autoFocus
                  style={{
                    width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: '10px', padding: '12px 14px', color: 'var(--text)', outline: 'none',
                    fontSize: '14px', fontFamily: 'var(--mono)'
                  }}
                />
              </div>

              <div className="input-group">
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text2)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Price per Unit (₹)</label>
                <input 
                  type="number" step="0.1"
                  value={formData.price}
                  onChange={(e) => setFormData(p => ({ ...p, price: e.target.value }))}
                  placeholder="e.g. 4.5"
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
                  width: '100%', background: 'var(--amber)', color: '#1a1000',
                  border: 'none', borderRadius: '10px', padding: '14px',
                  fontWeight: 700, marginTop: '10px', fontSize: '14px', cursor: 'pointer',
                  opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
                  boxShadow: '0 8px 24px rgba(245,158,11,0.2)'
                }}
              >
                {loading ? 'Listing...' : 'Confirm Listing'}
              </motion.button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
