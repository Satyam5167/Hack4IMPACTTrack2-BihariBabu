import express from 'express';
import { recordReading, getSurplus, getReadings, createListing, getUserListings, getAllActiveListings, buyListing } from '../controllers/energyController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate); // Secure all energy-related routes

router.post('/record', recordReading);
router.get('/surplus', getSurplus);
router.get('/readings', getReadings);
router.post('/listings/create', createListing);
router.get('/listings/me', getUserListings);
router.get('/listings/active', getAllActiveListings);
router.post('/listings/buy', buyListing);

export default router;
