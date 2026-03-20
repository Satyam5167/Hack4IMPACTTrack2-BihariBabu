import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import Ticker from '../components/Ticker';
import { sellOrders, buyOrders } from '../data';
import { useToast } from '../contexts/ToastContext';
import { getActiveListings, buyEnergyListing } from '../api';
import { getEthToInrRate, calculateEthForInr } from '../utils/currency';

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

export default function Marketplace() {
  const { showToast } = useToast();
  const [marketPrice, setMarketPrice] = useState(6.50);
  const [priceBlink, setPriceBlink] = useState(false);
  const [orderMode, setOrderMode] = useState('sell');
  const [orderUnits, setOrderUnits] = useState('');
  const [orderPrice, setOrderPrice] = useState('');
  const [co2Preview, setCo2Preview] = useState('0.00 kg');
  const [countdown, setCountdown] = useState(272);
  const [liveListings, setLiveListings] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchListings();

    const cdInterval = setInterval(() => {
      setCountdown(s => { const next = s - 1; return next < 0 ? 300 : next; });
    }, 1000);

    const priceInterval = setInterval(() => {
      if (Math.random() < 0.3) {
        const newP = Math.max(4, Math.min(9, 6.50 + (Math.random() * 0.8 - 0.4)));
        setMarketPrice(+newP.toFixed(2));
        setPriceBlink(true);
        setTimeout(() => setPriceBlink(false), 1000);
      }
    }, 3000);

    return () => { clearInterval(cdInterval); clearInterval(priceInterval); };
  }, []);

  const fetchListings = async () => {
    try {
      const data = await getActiveListings();
      if (data.listings) {
        setLiveListings(data.listings);
      }
    } catch (err) {
      console.error("Failed to fetch listings", err);
    }
  };

  const handleBuyListing = async (listing) => {
    try {
      setIsProcessing(true);
      showToast('⌛', 'Calculating ETH rate...', 'info');
      
      const ethRate = await getEthToInrRate();
      const totalInr = parseFloat(listing.amount) * parseFloat(listing.price_per_unit);
      const ethNeeded = calculateEthForInr(totalInr, ethRate);
      
      showToast('⏳', `Processing on-chain transaction via backend relayer (~${ethNeeded} ETH)...`, 'info');
      
      // Notify backend to execute the smart contract trade
      const res = await buyEnergyListing(listing.id, ethNeeded);
      
      if (res.error) {
         showToast('❌', res.error);
         return;
      }
      showToast('✅', `Successfully purchased ${listing.amount} kWh from ${listing.seller_name}!`);
      
      fetchListings(); // Refresh list

    } catch (err) {
      console.error("Backend Web3 Error:", err);
      showToast('❌', err.message || 'Transaction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const cd = { m: Math.floor(countdown / 60), s: countdown % 60 };

  const handleSetOrderMode = (mode) => setOrderMode(mode);

  const handleUnitsChange = (v) => {
    setOrderUnits(v);
    setCo2Preview(`${(parseFloat(v || 0) * 0.4).toFixed(2)} kg`);
  };

  const placeOrder = () => {
    const units = parseFloat(orderUnits);
    const price = parseFloat(orderPrice);
    if (!units || !price) { showToast('⚠', 'Please enter units and price'); return; }
    if (price < 2 || price > 15) { showToast('⚠', 'Price must be between ₹2 and ₹15'); return; }
    showToast('⚡', `${orderMode === 'sell' ? 'Sell' : 'Buy'} order placed: ${units} kWh @ ₹${price}`);
    setOrderUnits(''); setOrderPrice(''); setCo2Preview('0.00 kg');
    const newP = Math.max(4, Math.min(9, 6.50 + (Math.random() * 0.4 - 0.2)));
    setMarketPrice(+newP.toFixed(2));
    setPriceBlink(true);
    setTimeout(() => setPriceBlink(false), 1000);
  };

  const bestAsk = Math.min(...sellOrders.map(o => o.price));
  const bestBid = Math.max(...buyOrders.map(o => o.price));
  const spread = (bestAsk - bestBid).toFixed(2);
  const mid = ((bestAsk + bestBid) / 2).toFixed(2);
  const maxSell = Math.max(...sellOrders.map(o => o.units));
  const maxBuy = Math.max(...buyOrders.map(o => o.units));

  return (
    <motion.div className="page-pad" style={{ padding: '24px 28px' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      {/* Market bar */}
      <div className="market-bar" style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '10px 20px', marginBottom: '16px',
      }}>
        {[
          {
            label: 'Current Market Price',
            content: (
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={marketPrice}
                  initial={{ opacity: 0, y: -20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={priceBlink ? 'price-blink' : ''} style={{ fontSize: '22px', fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--mono)', letterSpacing: '-0.5px' }}
                >
                  ₹ {marketPrice.toFixed(2)}
                </motion.div>
              </AnimatePresence>
            )
          },
          { label: 'Next Auction', content: <div style={{ fontFamily: 'var(--mono)', fontSize: '15px', color: 'var(--amber)' }}>{String(cd.m).padStart(2, '0')}:{String(cd.s).padStart(2, '0')}</div> },
          { label: 'Your Surplus', content: <div style={{ fontSize: '11px', color: 'var(--text2)' }}><span style={{ color: 'var(--text)', fontWeight: 500 }}><AnimatedNumber value={3.3} /> kWh</span> available to sell</div> },
          { label: '24h Volume', content: <div style={{ fontSize: '11px', color: 'var(--text2)' }}><span style={{ color: 'var(--text)', fontWeight: 500 }}><AnimatedNumber value={147.8} /> kWh</span> traded</div> },
          { label: 'Active Traders', content: <div style={{ fontSize: '11px', color: 'var(--text2)' }}><span style={{ color: 'var(--text)', fontWeight: 500 }}><AnimatedNumber value={12} format={v => Math.floor(v)} /></span> online now</div> },
        ].map((item, i) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {i > 0 && <div style={{ width: '1px', height: '32px', background: 'var(--border)' }} />}
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>{item.label}</div>
              {item.content}
            </div>
          </div>
        ))}
      </div>

      <div className="market-grid">
        {/* Order Book */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 16px 0', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--display)', fontSize: '15px', fontWeight: 600 }}>Order Book</span>
            <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '20px', fontFamily: 'var(--mono)', fontWeight: 500, background: 'rgba(14,165,233,0.1)', color: 'var(--blue)', border: '1px solid rgba(14,165,233,0.2)' }}>LIVE</span>
          </div>
          <div style={{ padding: '0 16px 10px', fontSize: '10px', color: 'var(--text3)' }}>Sorted by price — best ask vs best bid</div>
          <div className="order-book-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--border)' }}>
            <div style={{ background: 'var(--card)', padding: '8px 12px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--red)', background2: 'rgba(255,75,109,0.04)' }}>↑ SELL ORDERS</div>
            <div style={{ background: 'var(--card)', padding: '8px 12px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--green)', backgroundColor: 'rgba(0,255,135,0.04)' }}>↓ BUY ORDERS</div>
            {/* Replace static sell orders with LIVE Database Listings */}
            {liveListings.length === 0 ? (
               <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--text3)', fontFamily: 'var(--font)' }}>
                 No live sell offers available right now.
               </div>
            ) : liveListings.slice(0, 5).map((listing, i) => {
              const maxL = Math.max(...liveListings.map(l => parseFloat(l.amount)));
              return (
                <AnimatePresence key={`live-l-${listing.id}`}>
                <motion.div layout animate={{ opacity: 1 }} initial={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ background: 'var(--card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', borderBottom: '1px solid rgba(30,45,61,0.4)', position: 'relative', overflow: 'hidden' }}>
                  <motion.div layout style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${(parseFloat(listing.amount) / maxL) * 60 + 20}%`, background: 'rgba(255,75,109,0.06)', pointerEvents: 'none' }} />
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: 600, color: 'var(--red)' }}>₹{parseFloat(listing.price_per_unit).toFixed(2)}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text2)' }}>{listing.amount} kWh</div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--body)' }}>{listing.seller_name.slice(0,6)}...</div>
                    </div>
                    {listing.seller_wallet && (
                       <button 
                         onClick={() => handleBuyListing(listing)}
                         disabled={isProcessing}
                         style={{
                           padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--red)',
                           background: 'rgba(255,75,109,0.1)', color: 'var(--red)', cursor: 'pointer',
                           fontSize: '10px', fontWeight: 700, fontFamily: 'var(--body)', textTransform: 'uppercase'
                         }}
                       >
                         Buy
                       </button>
                    )}
                  </div>
                </motion.div>
                </AnimatePresence>
              );
            })}
            
            {/* Keeping Buy Orders (Bids) Dummy since backend handles sell listings only right now */}
            {Array.from({ length: 5 }, (_, i) => {
              const b = buyOrders[i];
              return (
                <AnimatePresence key={`sp-${i}`}>
                <motion.div layout key={`b${i}`} animate={{ opacity: 1 }} initial={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ gridColumn: 2, background: 'var(--card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', borderBottom: '1px solid rgba(30,45,61,0.4)', position: 'relative', overflow: 'hidden' }}>
                  <motion.div layout style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${b.units / maxBuy * 60 + 20}%`, background: 'rgba(0,255,135,0.06)', pointerEvents: 'none' }} />
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: 500, color: 'var(--green)' }}>₹{b.price.toFixed(2)}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text2)' }}>{b.units} kWh</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                    <div style={{ fontSize: '9px', padding: '2px 5px', borderRadius: '3px', background: 'rgba(179,136,255,0.1)', color: 'var(--purple)', fontFamily: 'var(--mono)' }}>{b.rep}</div>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px', fontWeight: 700, color: 'white', background: '#1b5e20' }}>{b.user[0]}</div>
                  </div>
                </motion.div>
                </AnimatePresence>
              );
            })}
            <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '6px', fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--amber)', background: 'rgba(255,171,64,0.06)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
              Spread: ₹<AnimatedNumber value={parseFloat(spread)} format={v => v.toFixed(2)} /> &nbsp;|&nbsp; Mid: ₹<AnimatedNumber value={parseFloat(mid)} format={v => v.toFixed(2)} />
            </div>
          </div>
        </div>

        {/* Place Order */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', height: 'fit-content' }}>
          <div style={{ padding: '16px 20px 0' }}>
            <span style={{ fontFamily: 'var(--display)', fontSize: '15px', fontWeight: 600 }}>Place Order</span>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Toggle */}
            <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: '8px', padding: '3px' }}>
              {['sell', 'buy'].map(mode => (
                <motion.button key={mode} onClick={() => handleSetOrderMode(mode)} 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                  flex: 1, padding: '7px', border: 'none', borderRadius: '6px',
                  fontFamily: 'var(--font)', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', transition: 'all .2s',
                  ...(orderMode === mode
                    ? mode === 'sell'
                      ? { background: 'rgba(255,75,109,0.15)', color: 'var(--red)' }
                      : { background: 'rgba(0,255,135,0.15)', color: 'var(--green)' }
                    : { background: 'none', color: 'var(--text2)' }),
                }}>{mode.toUpperCase()}</motion.button>
              ))}
            </div>

            {/* Units */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Units (kWh)</label>
              <input type="number" value={orderUnits} onChange={e => handleUnitsChange(e.target.value)} placeholder="0.00" step="0.1" style={{
                background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px',
                padding: '9px 12px', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: '13px',
                outline: 'none', width: '100%',
              }}
                onFocus={e => e.target.style.borderColor = 'var(--green)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <div style={{ fontSize: '10px', color: 'var(--text3)' }}>Available: 3.3 kWh surplus</div>
            </div>

            {/* Price */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Price (₹ / kWh)</label>
              <input type="number" value={orderPrice} onChange={e => setOrderPrice(e.target.value)} placeholder="6.50" step="0.10" style={{
                background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px',
                padding: '9px 12px', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: '13px',
                outline: 'none', width: '100%',
              }}
                onFocus={e => e.target.style.borderColor = 'var(--green)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <div style={{ fontSize: '10px', color: 'var(--text3)' }}>Market: ₹6.50 · Floor: ₹2 · Ceil: ₹15</div>
            </div>

            {/* CO2 preview */}
            <div style={{
              background: 'rgba(0,229,204,0.06)', border: '1px solid rgba(0,229,204,0.15)',
              borderRadius: '8px', padding: '10px 12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: '11px', color: 'var(--text2)' }}>🌱 CO₂ Impact</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', color: 'var(--green3)', fontWeight: 600 }}>{co2Preview}</span>
            </div>

            {/* Place button */}
            <motion.button onClick={placeOrder} 
              whileHover={{ scale: 1.05, translateY: -2 }}
              whileTap={{ scale: 0.95 }}
              style={{
              padding: '11px', border: 'none', borderRadius: '8px',
              fontFamily: 'var(--font)', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', width: '100%',
              ...(orderMode === 'sell'
                ? { background: 'linear-gradient(135deg, #cc2c47, var(--red))', color: '#fff' }
                : { background: 'linear-gradient(135deg, var(--green2), var(--green3))', color: '#000' }),
            }}
            >
              PLACE {orderMode.toUpperCase()} ORDER
            </motion.button>
          </div>
        </div>
      </div>

      <Ticker />
    </motion.div>
  );
}
