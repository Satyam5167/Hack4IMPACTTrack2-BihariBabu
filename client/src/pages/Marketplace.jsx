import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import Ticker from '../components/Ticker';
import { sellOrders, buyOrders } from '../data';
import { useToast } from '../contexts/ToastContext';
import { getActiveListings, buyEnergyListing, getEnergySurplus, createEnergyListing, getMarketStats, getRecentTrades } from '../api';
import { API_BASE_URL } from '../apiBase';
import { getEthToInrRate, calculateEthForInr } from '../utils/currency';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../utils/contract';

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
  const [marketPrice, setMarketPrice] = useState(null);
  const [priceBlink, setPriceBlink] = useState(false);
  const [orderMode, setOrderMode] = useState('sell');
  const [orderUnits, setOrderUnits] = useState('');
  const [orderPrice, setOrderPrice] = useState('');
  const [co2Preview, setCo2Preview] = useState('0.00 kg');
  const [countdown, setCountdown] = useState(272);
  const [liveListings, setLiveListings] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [buyingListing, setBuyingListing] = useState(null);
  const [buyAmount, setBuyAmount] = useState('');
  const [loadingListings, setLoadingListings] = useState(true);
  const [userSurplus, setUserSurplus] = useState(0);
  const [recentTrades, setRecentTrades] = useState([]);
  const [marketStats, setMarketStats] = useState({ avgPrice: 6.50, volume24h: 0, activeTraders: 0 });
  
  // Pagination State
  const ITEMS_PER_PAGE = 5;
  const [sellPage, setSellPage] = useState(1);
  const [tradePage, setTradePage] = useState(1);

  useEffect(() => {
    fetchListings();
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
       const res = await getRecentTrades();
       if (res.trades) setRecentTrades(res.trades);
    } catch (err) {
       console.error("Failed to fetch trades", err);
    }
  };

  const fetchListings = async () => {
    try {
      if (!liveListings.length) setLoadingListings(true);
      const [listData, surplusData, statsData] = await Promise.all([
        getActiveListings(),
        getEnergySurplus(),
        getMarketStats()
      ]);
      
      if (listData.listings) {
        setLiveListings(listData.listings);
      }
      if (surplusData.surplus !== undefined) {
        setUserSurplus(+surplusData.surplus);
      }
      if (statsData) {
        setMarketStats(statsData);
        if (statsData.avgPrice !== null && (marketPrice === null || Math.abs(statsData.avgPrice - marketPrice) > 0.01)) {
          setMarketPrice(statsData.avgPrice);
          setPriceBlink(true);
          setTimeout(() => setPriceBlink(false), 1000);
        } else if (statsData.avgPrice === null) {
          setMarketPrice(null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoadingListings(false);
    }
  };

  const handleBuyListing = async (listing, amountKwhToBuy) => {
    try {
      setIsProcessing(true);
      showToast('⌛', 'Calculating ETH rate...', 'info');

      const ethRate = await getEthToInrRate();
      const totalInr = parseFloat(amountKwhToBuy) * parseFloat(listing.price_per_unit);
      const ethNeeded = calculateEthForInr(totalInr, ethRate);

      if (!window.ethereum) {
        showToast('❌', 'Please install and connect MetaMask!');
        setIsProcessing(false);
        return;
      }

      // Ensure we are on Sepolia Testnet before initializing Ethers
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (currentChainId !== '0xaa36a7') {
        try {
          showToast('⌛', 'Switching to Sepolia network...', 'info');
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }],
          });
          // Wait briefly for MetaMask to apply the switch
          await new Promise(r => setTimeout(r, 1000));
        } catch (error) {
          showToast('❌', 'Please manually switch MetaMask to the Sepolia network');
          setIsProcessing(false);
          return;
        }
      }

      showToast('⌛', 'Please confirm the MetaMask transaction...', 'info');

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Call executeTrade: payable, inputs: _seller, _buyer, _units, _priceINR
      const tx = await contract.executeTrade(
        listing.seller_wallet,
        signer.address,
        Math.floor(parseFloat(amountKwhToBuy)),
        Math.floor(parseFloat(listing.price_per_unit)),
        { value: ethers.parseEther(ethNeeded.toString()) }
      );

      showToast('⏳', `Processing on-chain transaction via MetaMask (~${ethNeeded} ETH)...`, 'info');

      // Wait for the transaction to be fully mined before notifying the backend
      const receipt = await tx.wait();
      console.log("Transaction mined:", receipt);

      // Notify backend to verify and record the trade
      const res = await buyEnergyListing(listing.id, ethNeeded, tx.hash, amountKwhToBuy);

      if (res.error) {
        showToast('❌', res.error);
        return;
      }
      showToast('✅', `Successfully purchased ${amountKwhToBuy} kWh from ${listing.seller_name}!`);

      fetchListings(); // Refresh list

    } catch (err) {
      console.error("Frontend Web3 Error:", err);
      showToast('❌', err.shortMessage || err.message || 'Transaction failed or rejected');
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

  const placeOrder = async () => {
    const units = parseFloat(orderUnits);
    const price = parseFloat(orderPrice);
    if (!units || !price || units <= 0) {
      showToast('⚠', 'Please enter valid positive units and price');
      return;
    }
    if (price < 2 || price > 15) {
      showToast('⚠', 'Price must be between ₹2 and ₹15');
      return;
    }

    if (orderMode === 'sell') {
      if (units > userSurplus) {
        showToast('❌', `Insufficient surplus. Available: ${userSurplus.toFixed(1)} kWh`);
        return;
      }
      try {
        setIsProcessing(true);
        const res = await createEnergyListing(units, price, 'sell');
        if (res.error) {
          showToast('❌', res.error);
        } else {
          showToast('✅', `Public sell listing created: ${units} kWh @ ₹${price}`);
          setOrderUnits('');
          setOrderPrice('');
          setCo2Preview('0.00 kg');
          fetchListings(); // Refresh UI
        }
      } catch (err) {
        showToast('❌', 'Failed to create listing');
      } finally {
        setIsProcessing(false);
      }
    } else {
      // BUY MODE
      // 1. Try to find an immediate match among SELL orders
      const matchingSells = liveListings
        .filter(l => l.type === 'sell' && parseFloat(l.price_per_unit) <= price)
        .sort((a, b) => parseFloat(a.price_per_unit) - parseFloat(b.price_per_unit));

      if (matchingSells.length > 0) {
        const bestMatch = matchingSells[0];
        setBuyingListing(bestMatch);
        setBuyAmount(Math.min(units, parseFloat(bestMatch.amount)).toString());
        showToast('⚡', `Found matching seller: ₹${bestMatch.price_per_unit}/kWh`);
      } else {
        // 2. If no immediate match, place a public BUY order (BID)
        try {
          setIsProcessing(true);
          const res = await createEnergyListing(units, price, 'buy');
          if (res.error) {
            showToast('❌', res.error);
          } else {
            showToast('✅', `Public buy order (Bid) placed: ${units} kWh @ ₹${price}`);
            setOrderUnits('');
            setOrderPrice('');
            setCo2Preview('0.00 kg');
            fetchListings();
          }
        } catch (err) {
          showToast('❌', 'Failed to place buy order');
        } finally {
          setIsProcessing(false);
        }
      }
    }

    // Dynamic price effect (purely visual)
    const newP = Math.max(4, Math.min(9, 6.50 + (Math.random() * 0.4 - 0.2)));
    setMarketPrice(+newP.toFixed(2));
    setPriceBlink(true);
    setTimeout(() => setPriceBlink(false), 1000);
  };

  const sellOffers = liveListings.filter(l => l.type === 'sell').sort((a, b) => parseFloat(a.price_per_unit) - parseFloat(b.price_per_unit));
  const buyBids = liveListings.filter(l => l.type === 'buy').sort((a, b) => parseFloat(b.price_per_unit) - parseFloat(a.price_per_unit));

  const bestAsk = sellOffers.length > 0 ? parseFloat(sellOffers[0].price_per_unit) : 6.50;
  const lastPrice = recentTrades.length > 0 ? parseFloat(recentTrades[0].price_inr) : 6.20;
  
  const spread = Math.abs(bestAsk - lastPrice).toFixed(2);
  const mid = ((bestAsk + lastPrice) / 2).toFixed(2);
  const maxSell = sellOffers.length > 0 ? Math.max(...sellOffers.map(o => parseFloat(o.amount))) : 1;
  const maxTrade = recentTrades.length > 0 ? Math.max(...recentTrades.map(o => parseFloat(o.amount_kwh))) : 1;

  return (
    <motion.div className="page-pad" style={{ padding: '24px 28px' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      {/* Market bar */}
      <div className="market-bar" style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '10px 20px', marginBottom: '16px',
      }}>
        {[
          {
            label: 'Avg Market Price',
            content: (
              <AnimatePresence mode="popLayout">
                {marketPrice !== null ? (
                  <motion.div
                    key={marketPrice}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={priceBlink ? 'price-blink' : ''} style={{ fontSize: '22px', fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--mono)', letterSpacing: '-0.5px' }}
                  >
                    ₹ {marketPrice.toFixed(2)}
                  </motion.div>
                ) : loadingListings ? (
                  <div className="skeleton" style={{ width: '80px', height: '24px', borderRadius: '4px' }} />
                ) : (
                  <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>₹ ---</div>
                )}
              </AnimatePresence>
            )
          },
          { label: 'Your Surplus', content: <div style={{ fontSize: '11px', color: 'var(--text2)' }}><span style={{ color: 'var(--text)', fontWeight: 500 }}>{loadingListings ? <div className="skeleton" style={{ width: '40px', height: '14px', display: 'inline-block', verticalAlign: 'middle' }} /> : <><AnimatedNumber value={userSurplus} /> kWh</>}</span> available</div> },
          { label: '24h Volume', content: <div style={{ fontSize: '11px', color: 'var(--text2)' }}><span style={{ color: 'var(--text)', fontWeight: 500 }}><AnimatedNumber value={marketStats.volume24h} /> kWh</span> traded</div> },
          { label: 'Active Traders', content: <div style={{ fontSize: '11px', color: 'var(--text2)' }}><span style={{ color: 'var(--text)', fontWeight: 500 }}><AnimatedNumber value={marketStats.activeTraders} format={v => Math.floor(v)} /></span> in network</div> },
        ].map((item, i) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {i > 0 && <div style={{ width: '1px', height: '32px', background: 'var(--border)' }} />}
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>{item.label}</div>
              {item.content}
            </div>
          </div>
        ))}
        <div style={{ marginLeft: 'auto' }}>
           <motion.button 
             onClick={() => { fetchListings(); fetchTrades(); }}
             whileHover={{ scale: 1.1, rotate: 180 }}
             whileTap={{ scale: 0.9 }}
             style={{ 
               background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
               borderRadius: '50%', width: '32px', height: '32px', display: 'flex',
               alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--blue)'
             }}
           >
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
               <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
             </svg>
           </motion.button>
        </div>
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
            <div style={{ background: 'var(--card)', padding: '8px 12px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--green)', backgroundColor: 'rgba(0,255,135,0.04)' }}>↓ RECENT BUYS</div>
            {/* Replace static sell orders with LIVE Database Listings */}
            {loadingListings ? Array(5).fill(0).map((_, i) => (
              <div key={`sk-l-${i}`} style={{ background: 'var(--card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', borderBottom: '1px solid rgba(30,45,61,0.4)', position: 'relative', overflow: 'hidden' }}>
                <div>
                  <div className="skeleton" style={{ width: '40px', height: '14px', marginBottom: '4px' }}></div>
                  <div className="skeleton" style={{ width: '60px', height: '12px' }}></div>
                </div>
                <div className="skeleton" style={{ width: '50px', height: '26px', borderRadius: '6px' }}></div>
              </div>
            )) : sellOffers.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--text3)', fontFamily: 'var(--font)' }}>
                No live sell offers available right now.
              </div>
            ) : sellOffers.slice((sellPage - 1) * ITEMS_PER_PAGE, sellPage * ITEMS_PER_PAGE).map((listing, i) => {
              const maxL = Math.max(...sellOffers.map(l => parseFloat(l.amount)));
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {listing.seller_picture ? (
                          <img src={listing.seller_picture} style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: 'white', background: '#ec4899', flexShrink: 0 }}>{listing.seller_name[0]}</div>
                        )}
                        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--body)' }}>{listing.seller_name.slice(0, 6)}...</div>
                      </div>
                    </div>
                    {listing.seller_wallet && (
                       <div style={{ display: 'flex', gap: '4px' }}>
                         <button 
                           onClick={() => {
                             setBuyingListing(listing);
                             setBuyAmount(listing.amount);
                           }}
                           disabled={isProcessing}
                           style={{
                             padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--red)',
                             background: 'rgba(255,75,109,0.1)', color: 'var(--red)', cursor: 'pointer',
                             fontSize: '10px', fontWeight: 700, fontFamily: 'var(--body)', textTransform: 'uppercase'
                           }}
                         >
                           Buy
                         </button>
                       </div>
                    )}
                  </div>
                </motion.div>
                </AnimatePresence>
              );
            })}
            
            {/* Pagination for Sell Orders */}
            {sellOffers.length > ITEMS_PER_PAGE && (
               <div style={{ gridColumn: 1, padding: '4px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg3)', fontSize: '10px', color: 'var(--text3)' }}>
                  <button onClick={() => setSellPage(p => Math.max(1, p - 1))} disabled={sellPage === 1} style={{ background: 'none', border: 'none', color: sellPage === 1 ? 'var(--text3)' : 'var(--blue)', cursor: 'pointer', fontSize: '9px' }}>PREV</button>
                  <span>Page {sellPage} of {Math.ceil(sellOffers.length / ITEMS_PER_PAGE)}</span>
                  <button onClick={() => setSellPage(p => Math.min(Math.ceil(sellOffers.length / ITEMS_PER_PAGE), p + 1))} disabled={sellPage >= Math.ceil(sellOffers.length / ITEMS_PER_PAGE)} style={{ background: 'none', border: 'none', color: sellPage >= Math.ceil(sellOffers.length / ITEMS_PER_PAGE) ? 'var(--text3)' : 'var(--blue)', cursor: 'pointer', fontSize: '9px' }}>NEXT</button>
               </div>
            )}

            {/* RECENT TRADES (Bought Prices) */}
            {loadingListings ? Array(5).fill(0).map((_, i) => (
              <div key={`sk-b-${i}`} style={{ gridColumn: 2, background: 'var(--card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', borderBottom: '1px solid rgba(30,45,61,0.4)', position: 'relative', overflow: 'hidden' }}>
                <div>
                  <div className="skeleton" style={{ width: '40px', height: '14px', marginBottom: '4px' }}></div>
                  <div className="skeleton" style={{ width: '60px', height: '12px' }}></div>
                </div>
              </div>
            )) : recentTrades.length === 0 ? (
              <div style={{ gridColumn: 2, padding: '20px', textAlign: 'center', fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font)' }}>
                No recent trades.
              </div>
            ) : recentTrades.slice((tradePage - 1) * ITEMS_PER_PAGE, tradePage * ITEMS_PER_PAGE).map((trade, i) => {
              return (
                <AnimatePresence key={`live-t-${trade.id}`}>
                  <motion.div layout animate={{ opacity: 1 }} initial={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ gridColumn: 2, background: 'var(--card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', borderBottom: '1px solid rgba(30,45,61,0.4)', position: 'relative', overflow: 'hidden' }}>
                    <motion.div layout style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${(parseFloat(trade.amount_kwh) / maxTrade) * 60 + 20}%`, background: 'rgba(59,130,246,0.06)', pointerEvents: 'none' }} />
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: 600, color: '#3b82f6' }}>₹{parseFloat(trade.price_inr).toFixed(2)}</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text2)' }}>{trade.amount_kwh} kWh</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {trade.buyer_picture ? (
                          <img src={trade.buyer_picture} style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: 'white', background: '#3b82f6', flexShrink: 0 }}>{trade.buyer_name[0]}</div>
                        )}
                        <div style={{ fontSize: '10px', color: 'var(--text)', fontFamily: 'var(--body)' }}>{trade.buyer_name.split(' ')[0]}</div>
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{new Date(trade.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              );
            })}
            
            {/* Pagination for Recent Trades */}
            {recentTrades.length > ITEMS_PER_PAGE && (
               <div style={{ gridColumn: 2, padding: '4px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg3)', fontSize: '10px', color: 'var(--text3)' }}>
                  <button onClick={() => setTradePage(p => Math.max(1, p - 1))} disabled={tradePage === 1} style={{ background: 'none', border: 'none', color: tradePage === 1 ? 'var(--text3)' : 'var(--blue)', cursor: 'pointer', fontSize: '9px' }}>PREV</button>
                  <span>Page {tradePage} of {Math.ceil(recentTrades.length / ITEMS_PER_PAGE)}</span>
                  <button onClick={() => setTradePage(p => Math.min(Math.ceil(recentTrades.length / ITEMS_PER_PAGE), p + 1))} disabled={tradePage >= Math.ceil(recentTrades.length / ITEMS_PER_PAGE)} style={{ background: 'none', border: 'none', color: tradePage >= Math.ceil(recentTrades.length / ITEMS_PER_PAGE) ? 'var(--text3)' : 'var(--blue)', cursor: 'pointer', fontSize: '9px' }}>NEXT</button>
               </div>
            )}
            <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '6px', fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--amber)', background: 'rgba(255,171,64,0.06)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
              Spread: ₹<AnimatedNumber value={parseFloat(spread)} format={v => v.toFixed(2)} /> &nbsp;|&nbsp; Last Trade: ₹<AnimatedNumber value={parseFloat(lastPrice)} format={v => v.toFixed(2)} />
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
              <input type="number" value={orderUnits} onChange={e => handleUnitsChange(e.target.value)} placeholder="0.00" step="0.1" min="0.1" style={{
                background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px',
                padding: '9px 12px', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: '13px',
                outline: 'none', width: '100%',
              }}
                onFocus={e => e.target.style.borderColor = 'var(--green)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <div style={{ fontSize: '10px', color: 'var(--text3)' }}>Available: {userSurplus.toFixed(1)} kWh surplus</div>
            </div>

            {/* Price */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Price (₹ / kWh)</label>
              <input type="number" value={orderPrice} onChange={e => setOrderPrice(e.target.value)} placeholder="6.50" step="0.10" min="2" max="15" style={{
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
              disabled={isProcessing}
              style={{
                padding: '11px', border: 'none', borderRadius: '8px',
                fontFamily: 'var(--font)', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', width: '100%',
                ...(orderMode === 'sell'
                  ? { background: 'linear-gradient(135deg, #cc2c47, var(--red))', color: '#fff' }
                  : { background: 'linear-gradient(135deg, var(--green2), var(--green3))', color: '#000' }),
                ...(isProcessing ? { opacity: 0.7, cursor: 'not-allowed' } : {})
              }}
            >
              {isProcessing ? 'PROCESSING...' : `PLACE ${orderMode.toUpperCase()} ORDER`}
            </motion.button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {buyingListing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                padding: '24px', borderRadius: '16px', width: '320px',
                display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 1001
              }}
            >
              <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text)' }}>Purchase Energy</h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text2)' }}>
                Seller: {buyingListing.seller_name}<br />
                Available: {buyingListing.amount} kWh @ ₹{parseFloat(buyingListing.price_per_unit).toFixed(2)}/kWh
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text3)' }}>Amount to buy (kWh)</label>
                <input
                  type="number"
                  value={buyAmount}
                  onChange={e => setBuyAmount(e.target.value)}
                  max={buyingListing.amount}
                  min={0.1}
                  step={0.1}
                  style={{
                    background: 'var(--bg3)', border: '1px solid var(--border)',
                    padding: '10px', borderRadius: '8px', color: 'var(--text)',
                    fontFamily: 'var(--mono)', outline: 'none'
                  }}
                />
                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>
                  Total: ₹{(parseFloat(buyAmount || 0) * parseFloat(buyingListing.price_per_unit)).toFixed(2)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  onClick={() => setBuyingListing(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}
                >Cancel</button>
                <button
                  onClick={() => {
                    const amt = parseFloat(buyAmount);
                    if (amt > 0 && amt <= parseFloat(buyingListing.amount)) {
                      handleBuyListing(buyingListing, amt);
                      setBuyingListing(null);
                    } else {
                      showToast('❌', 'Invalid amount!');
                    }
                  }}
                  disabled={isProcessing}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--green)', color: 'black', fontWeight: 'bold', cursor: 'pointer' }}
                >{isProcessing ? 'Wait...' : 'Confirm Buy'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Ticker />
    </motion.div>
  );
}
