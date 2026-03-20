import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../utils/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax', // Use 'none' for cross-site if needed, 'lax' for local
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const signup = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      'INSERT INTO users (name, email, password, auth_provider) VALUES ($1, $2, $3, $4) RETURNING id, name, email',
      [name, email, hashedPassword, 'email']
    );

    const token = jwt.sign({ id: newUser.rows[0].id }, JWT_SECRET, { expiresIn: '7d' });
    
    // Set cookie
    res.cookie('token', token, cookieOptions);
    
    res.status(201).json({ user: newUser.rows[0] });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.rows[0].id }, JWT_SECRET, { expiresIn: '7d' });
    
    // Set cookie
    res.cookie('token', token, cookieOptions);

    res.json({
      user: { id: user.rows[0].id, name: user.rows[0].name, email: user.rows[0].email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const googleLogin = async (req, res) => {
  // Passport-google-oauth20 attaches the user to req.user
  const user = req.user;
  
  if (!user) {
    return res.redirect('http://localhost:5173/login?error=auth_failed');
  }

  try {
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, cookieOptions);
    
    // Redirect back to dashboard or home
    res.redirect('http://localhost:5173/dashboard');
  } catch (error) {
    console.error('Google login callback error:', error);
    res.redirect('http://localhost:5173/login?error=server_error');
  }
};

export const walletLogin = async (req, res) => {
  const { wallet_address } = req.body;

  try {
    if (!wallet_address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    let user = await pool.query('SELECT * FROM users WHERE wallet_address = $1', [wallet_address]);

    if (user.rows.length === 0) {
      user = await pool.query(
        'INSERT INTO users (name, wallet_address, auth_provider) VALUES ($1, $2, $3) RETURNING id, name, wallet_address',
        [wallet_address.substring(0, 6) + '...' + wallet_address.substring(38), wallet_address, 'wallet']
      );
    }

    const token = jwt.sign({ id: user.rows[0].id }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, cookieOptions);
    res.json({ user: user.rows[0] });
  } catch (error) {
    console.error('Wallet login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await pool.query('SELECT id, name, email, wallet_address, picture FROM users WHERE id = $1', [req.userId]);
    
    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    res.json({ user: user.rows[0] });
  } catch (err) {
    console.error('getMe error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const logout = (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
};

export const linkWallet = async (req, res) => {
  const { wallet_address } = req.body;
  if (!wallet_address) return res.status(400).json({ error: 'Wallet address required' });

  try {
    // Check if wallet is already linked to someone else
    const existing = await pool.query('SELECT id FROM users WHERE wallet_address = $1', [wallet_address]);
    if (existing.rows.length > 0 && existing.rows[0].id !== req.userId) {
       return res.status(400).json({ error: 'Wallet already linked to another account' });
    }

    const updatedUser = await pool.query(
      'UPDATE users SET wallet_address = $1 WHERE id = $2 RETURNING id, name, email, wallet_address, picture',
      [wallet_address, req.userId]
    );

    if (updatedUser.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    res.json({ user: updatedUser.rows[0] });
  } catch (err) {
    console.error('Link wallet error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
