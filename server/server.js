import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import passport from './utils/passport.js';
import userRoutes from './routes/userRoutes.js';
import energyRoutes from './routes/energyRoutes.js';
import forecastRoutes from './routes/forecastRoutes.js';
dotenv.config();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT; 

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://energygr1d.netlify.app',
    'https://hack4impacttrack2-biharibabu.onrender.com',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/energy', energyRoutes);
app.use('/api/forecast', forecastRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
