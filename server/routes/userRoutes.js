import express from 'express';
import passport from 'passport';
import { signup, login, googleLogin, walletLogin, linkWallet, getMe, logout, updateProfile, getSolarPanel, upsertSolarPanel } from '../controllers/userController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/wallet', walletLogin);
router.put('/wallet/link', authenticate, linkWallet);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.get('/panel', authenticate, getSolarPanel);
router.put('/panel', authenticate, upsertSolarPanel);
router.post('/logout', logout);

// Google OAuth Redirect-based
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback',
  (req, res, next) => {
    const failureUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login` : 'https://energygr1d.netlify.app/login';
    passport.authenticate('google', { failureRedirect: failureUrl, session: false })(req, res, next);
  },
  googleLogin
);

export default router;
