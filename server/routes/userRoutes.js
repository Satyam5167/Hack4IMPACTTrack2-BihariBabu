import express from 'express';
import passport from 'passport';
import { signup, login, googleLogin, walletLogin, linkWallet, getMe, logout } from '../controllers/userController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/wallet', walletLogin);
router.put('/wallet/link', authenticate, linkWallet);
router.get('/me', authenticate, getMe);
router.post('/logout', logout);

// Google OAuth Redirect-based
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  googleLogin // Reuse or create a specialized callback handler
);

export default router;
