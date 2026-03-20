import pool from '../utils/db.js';
import { processTradeOnChain, verifyTransaction } from '../utils/web3Utils.js';

export const recordReading = async (req, res) => {
  const { produced_amount, consumed_amount } = req.body;

  if (produced_amount === undefined || consumed_amount === undefined) {
    return res.status(400).json({ error: 'Produced and consumed amounts are required' });
  }

  try {
    const newReading = await pool.query(
      'INSERT INTO energy_readings (user_id, produced_amount, consumed_amount) VALUES ($1, $2, $3) RETURNING *',
      [req.userId, produced_amount, consumed_amount]
    );

    res.status(201).json({ reading: newReading.rows[0], message: 'Reading recorded successfully' });
  } catch (error) {
    console.error('Record reading error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getSurplus = async (req, res) => {
  try {
    const [readingsRes, boughtRes, soldRes, activeListingsRes] = await Promise.all([
      pool.query('SELECT SUM(produced_amount) as p, SUM(consumed_amount) as c FROM energy_readings WHERE user_id = $1', [req.userId]),
      pool.query('SELECT SUM(amount_kwh) as b FROM transactions WHERE buyer_id = $1', [req.userId]),
      pool.query('SELECT SUM(amount_kwh) as s FROM transactions WHERE seller_id = $1', [req.userId]),
      pool.query("SELECT SUM(amount) as a FROM listings WHERE user_id = $1 AND status = 'active'", [req.userId])
    ]);

    const produced = +(readingsRes.rows[0]?.p || 0);
    const consumed = +(readingsRes.rows[0]?.c || 0);
    const bought = +(boughtRes.rows[0]?.b || 0);
    const sold = +(soldRes.rows[0]?.s || 0);
    const locked = +(activeListingsRes.rows[0]?.a || 0);

    const availableSurplus = produced - consumed + bought - sold - locked;

    res.json({
      user_id: req.userId,
      produced,
      consumed,
      surplus: Math.max(0, availableSurplus)
    });
  } catch (error) {
    console.error('Get surplus error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getReadings = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM energy_readings WHERE user_id = $1 ORDER BY recorded_at DESC LIMIT 50',
      [req.userId]
    );

    res.json({ readings: result.rows });
  } catch (error) {
    console.error('Get readings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const createListing = async (req, res) => {
  const { amount, price_per_unit, type = 'sell' } = req.body;

  if (!amount || !price_per_unit) {
    return res.status(400).json({ error: 'Amount and price are required' });
  }

  try {
    // Basic verification: Check if they have surplus to list
    const [readingsRes, boughtRes, soldRes, activeListingsRes] = await Promise.all([
      pool.query('SELECT SUM(produced_amount) as p, SUM(consumed_amount) as c FROM energy_readings WHERE user_id = $1', [req.userId]),
      pool.query('SELECT SUM(amount_kwh) as b FROM transactions WHERE buyer_id = $1', [req.userId]),
      pool.query('SELECT SUM(amount_kwh) as s FROM transactions WHERE seller_id = $1', [req.userId]),
      pool.query("SELECT SUM(amount) as a FROM listings WHERE user_id = $1 AND status = 'active'", [req.userId])
    ]);

    const produced = +(readingsRes.rows[0]?.p || 0);
    const consumed = +(readingsRes.rows[0]?.c || 0);
    const bought = +(boughtRes.rows[0]?.b || 0);
    const sold = +(soldRes.rows[0]?.s || 0);
    const lockedAmount = +(activeListingsRes.rows[0]?.a || 0);

    const availableSurplus = produced - consumed + bought - sold - lockedAmount;

    if (amount > availableSurplus) {
      return res.status(400).json({ error: `Insufficient surplus. Available: ${Math.max(0, availableSurplus).toFixed(1)} kWh` });
    }

    const newListing = await pool.query(
      'INSERT INTO listings (user_id, amount, price_per_unit, type) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.userId, amount, price_per_unit, type]
    );

    res.status(201).json({ listing: newListing.rows[0], message: 'Listing created successfully' });
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getUserListings = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM listings WHERE user_id = $1 ORDER BY created_at DESC",
      [req.userId]
    );
    res.json({ listings: result.rows });
  } catch (error) {
    console.error('Get user listings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getAllActiveListings = async (req, res) => {
  try {
    const query = `
      SELECT l.*, u.name as seller_name, u.wallet_address as seller_wallet, u.picture as seller_picture
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE l.status = 'active'
      ORDER BY l.created_at DESC
    `;
    const result = await pool.query(query);
    res.json({ listings: result.rows });
  } catch (error) {
    console.error('Get all listings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const buyListing = async (req, res) => {
  const { listingId, ethAmount, txHash, amountKwhToBuy } = req.body;

  if (!listingId || !ethAmount || !txHash || !amountKwhToBuy) {
    return res.status(400).json({ error: 'listingId, ethAmount, txHash, and amountKwhToBuy are mandatory' });
  }

  try {
    // 1. Get the listing to verify it's active
    const listingRes = await pool.query("SELECT * FROM listings WHERE id = $1 AND status = 'active'", [listingId]);
    if (listingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found or already sold' });
    }
    const listing = listingRes.rows[0];

    // 2. Prevent buying own listing
    if (listing.user_id === req.userId) {
      return res.status(400).json({ error: 'Cannot buy your own listing' });
    }

    // 3. Get seller's wallet from DB
    const sellerRes = await pool.query("SELECT wallet_address FROM users WHERE id = $1", [listing.user_id]);
    const sellerWallet = sellerRes.rows[0]?.wallet_address;
    if (!sellerWallet) {
      return res.status(400).json({ error: 'Seller does not have a wallet connected' });
    }

    // 3.5 Get buyer's wallet from DB
    const buyerRes = await pool.query("SELECT wallet_address FROM users WHERE id = $1", [req.userId]);
    const buyerWallet = buyerRes.rows[0]?.wallet_address;
    if (!buyerWallet) {
      return res.status(400).json({ error: 'Please connect your wallet first' });
    }

    // 3.8 Validate Requested Amount
    const requestedKwh = parseFloat(amountKwhToBuy);
    const availableKwh = parseFloat(listing.amount);
    if (requestedKwh > availableKwh || requestedKwh <= 0) {
      return res.status(400).json({ error: 'Invalid purchase amount' });
    }

    // 4. Verify trade on-chain from frontend txHash
    try {
      const verification = await verifyTransaction(txHash, ethAmount);
      if (!verification.valid) {
        console.error("Verification invalid:", verification.error);
        return res.status(400).json({ error: 'Transaction verification failed: ' + verification.error });
      }
    } catch (blockchainErr) {
      console.error("Blockchain verification failed", blockchainErr);
      return res.status(500).json({ error: 'Failed to verify on-chain transaction: ' + blockchainErr.message });
    }

    // 5. Update listing amount correctly for partial fill
    const newAmount = availableKwh - requestedKwh;
    await pool.query(
      `UPDATE listings 
       SET amount = $1, status = CASE WHEN $1::numeric <= 0 THEN 'sold' ELSE 'active' END 
       WHERE id = $2`,
      [newAmount, listingId]
    );

    // 6. Record transaction in database
    const txRes = await pool.query(
      `INSERT INTO transactions (listing_id, buyer_id, seller_id, amount_kwh, price_inr, eth_amount, tx_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [listingId, req.userId, listing.user_id, requestedKwh, listing.price_per_unit, ethAmount, txHash]
    );

    res.status(200).json({ message: 'Purchase recorded successfully', transaction: txRes.rows[0] });

  } catch (error) {
    console.error('Purchase error:', error);
    res.status(500).json({ error: 'Server error during purchase' });
  }
};

export const getUserOrders = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, 
              b.name as buyer_name, 
              s.name as seller_name 
       FROM transactions t
       JOIN users b ON t.buyer_id = b.id
       JOIN users s ON t.seller_id = s.id
       WHERE t.buyer_id = $1 OR t.seller_id = $1
       ORDER BY t.created_at DESC`,
      [req.userId]
    );
    res.json({ orders: result.rows });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getRecentTrades = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, 
              b.name as buyer_name, b.picture as buyer_picture,
              s.name as seller_name, s.picture as seller_picture
       FROM transactions t
       JOIN users b ON t.buyer_id = b.id
       JOIN users s ON t.seller_id = s.id
       ORDER BY t.created_at DESC
       LIMIT 10`
    );
    res.json({ trades: result.rows });
  } catch (error) {
    console.error('Get recent trades error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getTopTraders = async (req, res) => {
  try {
    const query = `
      SELECT u.id, u.name, u.picture,
        COALESCE((SELECT SUM(amount_kwh) FROM transactions WHERE seller_id = u.id), 0) +
        COALESCE((SELECT SUM(amount_kwh) FROM transactions WHERE buyer_id = u.id), 0) as total_volume
      FROM users u
      WHERE (
        COALESCE((SELECT SUM(amount_kwh) FROM transactions WHERE seller_id = u.id), 0) +
        COALESCE((SELECT SUM(amount_kwh) FROM transactions WHERE buyer_id = u.id), 0)
      ) > 0
      ORDER BY total_volume DESC
      LIMIT 5
    `;
    const result = await pool.query(query);

    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
    const maxVolume = result.rows.length > 0 ? parseFloat(result.rows[0].total_volume) : 1;

    const topTraders = result.rows.map((r, i) => {
      const vol = parseFloat(r.total_volume);
      return {
        name: r.name,
        picture: r.picture,
        color: colors[i % colors.length],
        score: Math.max(5, Math.floor((vol / maxVolume) * 100))
      };
    });

    res.json({ topTraders });
  } catch (error) {
    console.error('Get top traders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getMarketStats = async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        AVG(price_per_unit) as avg_price,
        (SELECT COALESCE(SUM(amount_kwh), 0) FROM transactions WHERE created_at > NOW() - INTERVAL '24 hours') as volume_24h,
        (SELECT COUNT(DISTINCT id) FROM users) as active_traders
      FROM listings 
    `;
    const result = await pool.query(statsQuery);
    const stats = result.rows[0];

    res.json({
      avgPrice: stats.avg_price ? parseFloat(stats.avg_price) : null,
      volume24h: parseFloat(stats.volume_24h),
      activeTraders: parseInt(stats.active_traders)
    });
  } catch (error) {
    console.error('Get market stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getPoolStats = async (req, res) => {
  try {
    const [totalRes, todayRes] = await Promise.all([
      pool.query('SELECT SUM(produced_amount) as p, SUM(consumed_amount) as c FROM energy_readings'),
      pool.query("SELECT SUM(produced_amount) as p, SUM(consumed_amount) as c FROM energy_readings WHERE recorded_at > NOW() - INTERVAL '24 hours'")
    ]);

    const totalProduced = +(totalRes.rows[0]?.p || 0);
    const totalConsumed = +(totalRes.rows[0]?.c || 0);
    const todayProduced = +(todayRes.rows[0]?.p || 0);
    const todayConsumed = +(todayRes.rows[0]?.c || 0);

    // Stored is the net surplus across the community
    const stored = Math.max(0, totalProduced - totalConsumed);
    const capacity = 500; // Community target capacity

    res.json({
      stored: +stored.toFixed(1),
      capacity,
      percentage: Math.min(100, Math.floor((stored / capacity) * 100)),
      inboundToday: +todayProduced.toFixed(1),
      outboundToday: +todayConsumed.toFixed(1)
    });
  } catch (error) {
    console.error('Get pool stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getImpactStats = async (req, res) => {
  try {
    const dailyQuery = `
      SELECT 
        DATE(recorded_at) as date,
        SUM(produced_amount) as amount 
      FROM energy_readings 
      WHERE user_id = $1 AND recorded_at > NOW() - INTERVAL '7 days'
      GROUP BY DATE(recorded_at)
      ORDER BY DATE(recorded_at) ASC
    `;
    const result = await pool.query(dailyQuery, [req.userId]);
    
    // Generate the last 7 days array
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0]; // 'YYYY-MM-DD'
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' })[0]; // 'M', 'T', 'W', etc.
      last7Days.push({ dateStr, dayLabel, amount: 0 });
    }

    // Map result rows to the dates
    result.rows.forEach(r => {
      // PostgreSQL DATE(recorded_at) might include local time format, so we use string slice
      const rDate = new Date(r.date);
      // to avoid timezone issues when converting to ISOString, just take local YYYY-MM-DD
      const rDateStr = new Date(rDate.getTime() - (rDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      
      const match = last7Days.find(d => d.dateStr === rDateStr);
      if (match) {
        match.amount = parseFloat(r.amount);
      }
    });

    const maxVal = Math.max(...last7Days.map(r => r.amount * 0.45), 1);

    const history = last7Days.map(r => ({
      d: r.dayLabel,
      h: Math.max(5, (r.amount * 0.45 / maxVal) * 90).toFixed(0) + '%'
    }));

    res.json({ history });
  } catch (error) {
    console.error('Get impact stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

