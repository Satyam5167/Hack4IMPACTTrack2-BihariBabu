# EnergyGrid Web Server (Backend)

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Solidity](https://img.shields.io/badge/Solidity-Smart_Contracts-363636?style=for-the-badge&logo=solidity)

</div>

Welcome to the backend application for **EnergyGrid**! This is a robust Express.js REST API that powers the P2P Energy Trading marketplace, securely handles Web3 Blockchain transactions, connects to a PostgreSQL database, and pipes meteorological data to the AI microservice.

---

## Overview

The EnergyGrid Node.js server acts as the primary orchestrator for the platform. 

It handles:
- **Authentication & Sessions:** Secure passport/cookie-based JWT authentication and Google OAuth integration.
- **REST APIs:** Serving endpoints for user profiles, energy trading marketplace data, community pool analytics, and CO2 environmental impact stats.
- **Web3 Blockchain Operations:** Using `ethers.js`/`web3` to interface directly with compiled Solidity smart contracts (found in the `BlockChain/` directory) for creating and executing direct peer-to-peer energy transactions.
- **AI Microservice Bridge:** Validates and relays requests to the standalone Python Flask (`ml/`) service for physics-based and statistical AI solar forecasting.

---

## Folder Structure

The structural philosophy enforces strict separation of concerns following an MVC-like pattern.

```text
server/
├── server.js               ← Main Node.js/Express entry point
├── package.json            ← Dependencies and scripts
├── .env                    ← Environment variables (Secrets, DB URIs, RPC endpoints)
│
├── controllers/            ← Business Logic
│   ├── authController.js   ← JWT issuance, Google OAuth callbacks, user creation
│   ├── energyController.js ← Core marketplace logic, Impact stats, Community Pool calcs
│   └── forecastController.js ← Bridging requests to the Python AI microservice
│
├── routes/                 ← Express Router Definitions
│   ├── authRoutes.js       ← /auth/*
│   ├── energyRoutes.js     ← /api/energy/* (Marketplace, stats, impact)
│   └── forecastRoutes.js   ← /api/forecast/*
│
├── middleware/             ← Request Interceptors
│   └── authMiddleware.js   ← Verifies JWT cookies, blocks unauthorized access
│
├── utils/                  ← Shared Helpers
│   ├── db.js               ← PostgreSQL Connection Pool setup (via `pg`)
│   └── web3.js             ← Ethers provider and Smart Contract ABI loaders
│
├── BlockChain/             ← Solidity Smart Contracts
│   ├── contracts/          ← Raw `.sol` files (EnergyTrade.sol)
│   ├── build/              ← Compiled ABIs (`EnergyTrade.json`)
│   └── migrations/         ← Truffle deployment scripts
│
└── ml/                     ← Autonomous AI Microservice
    ├── api.py              ← Flask server (runs on port 5001)
    ├── readme.md           ← Dedicated AI README (Physics + SciPy Math)
    └── requirements.txt    ← Python environment dependencies
```

---

## Key API Groupings

### Authentication (`/auth`)
- `GET /auth/google` - Redirects to Google OAuth 2.0.
- `GET /auth/verify` - Returns the currently logged-in user profile.
- `POST /auth/logout` - Clears the HTTP-Only JWT cookie.

### Energy & Marketplace (`/api/energy`)
- `POST /api/energy/record` - Records hardware smart meter reads or virtual production.
- `POST /api/energy/listings` - Creates an active P2P energy contract for sale.
- `POST /api/energy/buy` - Executes a purchase via the Web3 Smart Contract.
- `GET /api/energy/pool` - Aggregates community surplus against a 500kWh battery capacity.
- `GET /api/energy/impact` - Generates 7-day chronological CO2 offset history.

### AI Forecasting (`/api/forecast`)
- `GET /api/forecast/predict` - Forwards the `user_id` to the Python microservice to get 48-hour PVLib/SciPy generation limits.

---

## Blockchain Integration

The marketplace runs purely peer-to-peer on a blockchain layer (e.g. Sepolia / Polygon). 
1. When a user creates a listing, an **Off-chain SQL record** is made for rapid UI querying.
2. When a buyer executes a purchase, the frontend signs a payload using **MetaMask**.
3. The Node.js server listens to or verifies the **On-chain Transaction Hash** against the `EnergyTrade.json` ABI loaded from the `BlockChain/build/` directory.

---

## Setup & Run Instructions

Ensure [Node.js](https://nodejs.org/) (version 18+) and [PostgreSQL](https://postgresql.org) are installed.

### 1. Install Dependencies
```bash
# Inside the `server` directory
npm install
```

### 2. Configure Environment Variables
Create a `.env` file referencing `.env.example`. You will need:
- `DATABASE_URL` for PostgreSQL.
- `JWT_SECRET` for Auth.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` for social logins.
- `RPC_URL` and `DEPLOYED_SMART_CONTRACT` ID for the Web3 ABI.

### 3. Start Development Server
```bash
# Uses nodemon to hot-reload the backend on port 4000
npm run dev
```
*(Optionally, start the standalone AI environment in `ml/` via `python api.py` on port 5001 if testing forecasting).*

---

<div align="center">
<b>Developed with care for the Hack4Impact Initiative</b>
</div>
