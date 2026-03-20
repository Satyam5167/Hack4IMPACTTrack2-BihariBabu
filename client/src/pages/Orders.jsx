import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getUserOrders } from '../api';
import { useAuth } from '../App';

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await getUserOrders();
        if (data.orders) {
          setOrders(data.orders);
        }
      } catch (err) {
        console.error("Failed to fetch orders", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  return (
    <motion.div className="page-pad" style={{ padding: '32px 28px', maxWidth: '800px', margin: '0 auto' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 24px', fontFamily: 'var(--display)' }}>Order History</h2>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text2)' }}>Loading history...</div>
      ) : orders.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', background: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
           <div style={{ fontSize: '32px', marginBottom: '16px' }}>📋</div>
           <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>No orders yet</div>
           <div style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '4px' }}>You haven't bought or sold any energy on the marketplace.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {orders.map((order) => {
            const isPurchase = order.buyer_id === user.id;
            const date = new Date(order.created_at).toLocaleString();
            
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, fontFamily: 'var(--mono)', textTransform: 'uppercase',
                      background: isPurchase ? 'rgba(0,255,135,0.1)' : 'rgba(255,75,109,0.1)',
                      color: isPurchase ? 'var(--green)' : 'var(--red)'
                    }}>
                      {isPurchase ? 'Bought' : 'Sold'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{date}</span>
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text2)' }}>
                    {isPurchase ? `Purchased from ${order.seller_name}` : `Sold to ${order.buyer_name}`}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--mono)', color: isPurchase ? 'var(--green)' : 'var(--red)' }}>
                   {isPurchase ? '+' : '-'}{order.amount_kwh} kWh
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
                    Cost: ₹{(parseFloat(order.amount_kwh) * parseFloat(order.price_inr)).toFixed(2)}
                  </div>
                  {order.tx_hash && (
                     <a href={`https://sepolia.etherscan.io/tx/${order.tx_hash}`} target="_blank" rel="noreferrer" style={{ fontSize: '10px', color: 'var(--blue)', textDecoration: 'none', background: 'rgba(14,165,233,0.1)', padding: '2px 6px', borderRadius: '4px', marginTop: '2px' }}>
                       View on Explorer ↗
                     </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
