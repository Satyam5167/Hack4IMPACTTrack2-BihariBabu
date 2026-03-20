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
    const result = await pool.query(
      `SELECT 
        SUM(produced_amount) as total_produced,
        SUM(consumed_amount) as total_consumed,
        SUM(produced_amount - consumed_amount) as total_surplus 
       FROM energy_readings WHERE user_id = $1`,
      [req.userId]
    );

    const stats = result.rows[0];
    res.json({
      user_id: req.userId,
      produced: stats.total_produced || 0,
      consumed: stats.total_consumed || 0,
      surplus: stats.total_surplus || 0
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
  const { amount, price_per_unit } = req.body;

  if (!amount || !price_per_unit) {
    return res.status(400).json({ error: 'Amount and price are required' });
  }

  try {
    // Basic verification: Check if they have surplus to list
    const surplusResult = await pool.query(
      'SELECT SUM(produced_amount - consumed_amount) as total_surplus FROM energy_readings WHERE user_id = $1',
      [req.userId]
    );
    const currentSurplus = +(surplusResult.rows[0].total_surplus || 0);

    // Also subtract already active listings
    const activeListingsResult = await pool.query(
      "SELECT SUM(amount) as locked_amount FROM listings WHERE user_id = $1 AND status = 'active'",
      [req.userId]
    );
    const lockedAmount = +(activeListingsResult.rows[0].locked_amount || 0);

    if (amount > (currentSurplus - lockedAmount)) {
       return res.status(400).json({ error: `Insufficient surplus. Available: ${(currentSurplus - lockedAmount).toFixed(1)} kWh` });
    }

    const newListing = await pool.query(
      'INSERT INTO listings (user_id, amount, price_per_unit) VALUES ($1, $2, $3) RETURNING *',
      [req.userId, amount, price_per_unit]
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
    const result = await pool.query(
      "SELECT l.*, u.name as seller_name, u.wallet_address as seller_wallet FROM listings l JOIN users u ON l.user_id = u.id WHERE l.status = 'active' ORDER BY l.price_per_unit ASC"
    );
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
