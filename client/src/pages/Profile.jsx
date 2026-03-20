import { motion } from 'framer-motion';
import { useAuth } from '../App';

export default function Profile() {
  const { user } = useAuth();
  
  if (!user) return null;

  return (
    <motion.div className="page-pad" style={{ padding: '32px 28px', maxWidth: '600px', margin: '0 auto' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
        <div style={{
           width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 16px',
           background: user.picture ? `url(${user.picture}) center/cover` : 'linear-gradient(135deg, #1565c0, #42a5f5)',
           display: 'flex', alignItems: 'center', justifyContent: 'center',
           fontSize: '32px', fontWeight: 700, color: 'white',
           boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}>
           {!user.picture && (user.name?.slice(0, 2).toUpperCase() || '??')}
        </div>
        
        <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 4px', fontFamily: 'var(--display)' }}>{user.name}</h2>
        <div style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '24px' }}>{user.email}</div>

        {user.wallet_address ? (
          <div style={{ background: 'rgba(0,255,135,0.05)', border: '1px solid rgba(0,255,135,0.2)', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '11px', color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', fontWeight: 600 }}>Connected Wallet</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '14px', color: 'var(--text)', wordBreak: 'break-all' }}>{user.wallet_address}</div>
          </div>
        ) : (
          <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', padding: '16px', borderRadius: '12px', color: 'var(--amber)', fontSize: '13px' }}>
            No wallet connected.
          </div>
        )}
      </div>
    </motion.div>
  );
}
