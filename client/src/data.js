export const HOUSES = ['Arjun K.','Priya S.','Ravi M.','Neha T.','Dev P.','Anita R.','Sanjay B.','Meera J.','Kiran L.','Rahul V.'];
export const HOUSE_COLORS = ['#1565c0','#6a1b9a','#00695c','#e65100','#1b5e20','#880e4f','#37474f','#4527a0','#0d47a1','#1a237e'];
export const HASHES = ['0x3f4a...2b9c','0xa1e2...7f03','0x8c91...4d55','0x2d3e...8a11','0xf7b4...9e32','0x5c6d...1f44','0xb3a2...6c78','0x9e1f...3a99','0x4d5c...2e67','0x7a8b...5f01'];

function rand(min, max) { return +(min + (Math.random() * (max - min))).toFixed(2); }

export const leaders = [
  { name: 'Priya S.', score: 98, color: '#6a1b9a' },
  { name: 'Ravi M.', score: 95, color: '#00695c' },
  { name: 'Arjun K.', score: 91, color: '#1565c0' },
  { name: 'Neha T.', score: 87, color: '#e65100' },
  { name: 'Dev P.', score: 82, color: '#1b5e20' },
];

export const sellOrders = [
  { price: 6.35, units: 1.2, user: 'P.S.', rep: 98 },
  { price: 6.50, units: 2.4, user: 'R.M.', rep: 95 },
  { price: 6.70, units: 0.8, user: 'A.K.', rep: 91 },
  { price: 6.85, units: 3.1, user: 'N.T.', rep: 87 },
  { price: 7.00, units: 1.5, user: 'D.P.', rep: 82 },
];

export const buyOrders = [
  { price: 6.20, units: 2.8, user: 'M.J.', rep: 79 },
  { price: 6.05, units: 1.6, user: 'K.L.', rep: 74 },
  { price: 5.90, units: 0.9, user: 'R.V.', rep: 88 },
  { price: 5.75, units: 4.2, user: 'A.R.', rep: 93 },
  { price: 5.60, units: 1.1, user: 'S.B.', rep: 70 },
];

export function generateTrades() {
  return Array.from({ length: 10 }, (_, i) => {
    const si = Math.floor(Math.random() * 10);
    const bi = (si + 1 + Math.floor(Math.random() * 9)) % 10;
    const units = rand(0.5, 3.5);
    const price = rand(4.5, 8.5);
    return {
      time: `${String(14 - i).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      seller: HOUSES[si], sellerColor: HOUSE_COLORS[si],
      buyer: HOUSES[bi], buyerColor: HOUSE_COLORS[bi],
      units, price, co2: +(units * 0.4).toFixed(2),
      hash: HASHES[i % HASHES.length],
      status: i < 8 ? 'Settled' : 'Pending'
    };
  });
}

export function sineWave(i, amp, shift = 0) {
  const h = i % 24;
  const noise = +(Math.random() * 0.4 - 0.2).toFixed(2);
  return Math.max(0, +(amp * Math.sin((h - 6) * Math.PI / 12) + shift + noise).toFixed(2));
}

export const forecastLabels = Array.from({ length: 48 }, (_, i) => {
  const h = i % 24; return h + ':00';
});
