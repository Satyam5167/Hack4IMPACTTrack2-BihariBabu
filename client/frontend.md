# EnergyGrid Web Client (Frontend)

<div align="center">

![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-5%-black?style=for-the-badge&logo=framer)
![Chart.js](https://img.shields.io/badge/Chart.js-1%-FF6384?style=for-the-badge&logo=chartdotjs)

</div>

Welcome to the frontend application for **EnergyGrid**! This is a responsive Single Page Application (SPA) built to provide a premium, dynamic, and intuitive dashboard for Peer-to-Peer (P2P) solar energy trading.

---

## Overview

The EnergyGrid web client is built with **React** via **Vite** for blazing fast HMR and optimized production builds. 

It handles:
- **Real-Time Dashboards:** Visualizations of total generated output, consumed energy, and carbon offset.
- **AI Forecasting Layouts:** Beautiful interactive lines and bar charts providing real predictions using robust confidence intervals.
- **P2P Marketplace Interface:** Allows users to view live energy pool statistics and initiate direct trades.
- **Sleek Aesthetic System:** Incorporates "glassmorphism", dark mode themes, deep gradients, modern typography (custom fonts), and complex micro-animations via Framer Motion.

---

## Folder Structure

The structural philosophy separates reusable components from full-page views and offloads logic to shared API and context providers.

```text
client/
├── public/                 ← Static public assets (Favicon, manifest, etc.)
├── index.html              ← Main HTML entry point
├── package.json            ← Dependencies and scripts
├── vite.config.js          ← Vite bundler configuration
│
└── src/
    ├── main.jsx            ← React Root DOM Rendering
    ├── App.jsx             ← React Router + Application Layout / Routes
    ├── index.css           ← Global CSS (Grid System, Typography, Tailwind classes, Glass themes)
    │
    ├── components/         ← Reusable UI Components
    │   ├── ForecastChart.jsx ← Interactive 48-Hour Chart.js visualization
    │   ├── Navbar.jsx        ← Responsive top-level navigation
    │   ├── ProtectedRoute.jsx← Route guarding based on session auth
    │   ├── ThemeToggle.jsx   ← Dark/Light mode theme switchers
    │   └── ... (Modals, Buttons, etc.)
    │
    ├── pages/              ← Top-level App Routes
    │   ├── LandingPage.jsx   ← Marketing / Entry page before login
    │   ├── Dashboard.jsx     ← Core Dashboard (Pool Stats, Carbon Impact, Trades Table)
    │   ├── AIForecast.jsx    ← Details of AI Production Forecasts
    │   ├── Marketplace.jsx   ← Buying / Selling Order Book interface
    │   └── Leaderboard.jsx   ← Top Traded / High Scorers view
    │
    ├── contexts/           ← React Context Providers (Global State)
    │   ├── AuthContext.jsx   ← User session/JWT handling
    │   └── ToastContext.jsx  ← Global pop-up notifications and toasts
    │
    ├── api.js              ← Client integration with Backend JSON API
    ├── data.js             ← Constants and fallback dummy data (if necessary)
    │
    ├── assets/             ← Images, SVGs, or internal CSS required by specific JS models
    └── utils/              ← Pure functions (e.g., date formatting, math helpers)
```

---

## Design System & Responsiveness

We prioritize **first-impression aesthetics** using carefully constructed vanilla CSS augmented with custom structural grids:

- **Breakpoints:** Specifically designed grid overrides (`index.css`) for `1200px`, `960px` (Tablet), `768px` (Mobile), and `480px` (Small Phone). Everything stacks beautifully.
- **Micro-animations:** Built extensively using `framer-motion` for fluid mount animations, spring transformations, and data-bound interactions (e.g. dynamic gauges, height bars).
- **Glassmorphism:** Consistent frosted interfaces defined globally via CSS custom properties.

---

## API Layer (`api.js`)

All communication to the Node.js backend operates through `src/api.js`. This centralizes `fetch` configurations, handles `.json()` unwrapping, and tightly integrates `credentials: 'include'` for secure passport/cookie-based sessions.

Endpoints generally interact with:
- `/api/energy/pool` (Global grid status)
- `/api/energy/impact` (Weekly graphical historical charting)
- `/api/users/profile` (OAuth data hooks)

---

## Run & Build Instructions

Make sure you've installed [Node.js](https://nodejs.org/) (version 18+ is recommended).

### 1. Install Dependencies
```bash
# Inside the `client` directory
npm install
```

### 2. Start Development Server
```bash
# Spins up the Vite dev server (usually on http://localhost:5173)
npm run dev
```

### 3. Production Build
```bash
# Packages minified code into `dist/`
npm run build
```

---

<div align="center">
<b>Developed with care for the Hack4Impact Initiative</b>
</div>
