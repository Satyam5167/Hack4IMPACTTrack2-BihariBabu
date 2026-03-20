import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { getForecast } from '../controllers/forecastController.js';

const router = express.Router();

router.get('/', authenticate, getForecast);

export default router;
