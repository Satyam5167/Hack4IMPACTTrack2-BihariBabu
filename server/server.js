import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import passport from './utils/passport.js';
import userRoutes from './routes/userRoutes.js';
import energyRoutes from './routes/energyRoutes.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT; 

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/energy', energyRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
