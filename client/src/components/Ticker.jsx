export default function Ticker({ id }) {
  const tickerItems = [
    '⚡ Arjun sold 2.1 kWh to Priya @ ₹6.5 — 0.84 kg CO₂ saved',
    '⚡ Ravi sold 1.8 kWh to Neha @ ₹6.2 — 0.72 kg CO₂ saved',
    '⚡ Dev sold 3.0 kWh to Anita @ ₹7.1 — 1.2 kg CO₂ saved',
    '⚡ Sanjay sold 0.9 kWh to Meera @ ₹5.8 — 0.36 kg CO₂ saved',
    '⚡ Kiran sold 2.5 kWh to Rahul @ ₹6.9 — 1.0 kg CO₂ saved',
  ];
  const doubled = [...tickerItems, ...tickerItems];

  return (
    <div style={{
      marginTop: '16px',
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: '10px', overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '8px 14px', borderBottom: '1px solid var(--border)',
        fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px',
      }}>
        <div className="live-dot" />
        Live Trade Feed
      </div>
      <div style={{ display: 'flex', overflow: 'hidden', padding: '8px 0' }}>
        <div className="ticker-track">
          {doubled.map((item, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontSize: '11px', color: 'var(--text2)',
            }}>
              <span style={{ color: 'var(--amber)' }}>⚡</span>
              {item.replace('⚡ ', '')}
              {i < doubled.length - 1 && <span style={{ color: 'var(--border2)', margin: '0 8px' }}>|</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
