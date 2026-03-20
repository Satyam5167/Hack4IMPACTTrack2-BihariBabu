# 🤖 EnergyGrid AI Service — Solar Production Forecasting Microservice

<div align="center">

![AI Service](https://img.shields.io/badge/EnergyGrid-AI%20Forecasting%20Service-00e676?style=for-the-badge&logoColor=black)

[![Python](https://img.shields.io/badge/Python-3.11-3776ab?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.0.3-000000?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![Prophet](https://img.shields.io/badge/Prophet-1.1.5-0064FF?style=flat-square)](https://facebook.github.io/prophet/)
[![pvlib](https://img.shields.io/badge/pvlib-0.11.0-orange?style=flat-square)](https://pvlib-python.readthedocs.io)
[![Team](https://img.shields.io/badge/Team-BihariBabu-00e5cc?style=flat-square)](https://github.com/)

</div>

---

## 📋 Overview

This is the standalone AI microservice for the EnergyGrid P2P solar trading platform. It runs as a **separate Python Flask server on port 5001** and is called by the Node.js backend via HTTP.

Given a `user_id`, it:
1. Fetches that user's **solar panel specs and GPS location** from PostgreSQL
2. Pulls a **live 48-hour weather forecast** from the Open-Meteo API (free, no API key)
3. Runs a **pvlib physics model** to estimate hourly solar production using real irradiance equations
4. Runs **Facebook Prophet** on top for smoothing and uncertainty quantification
5. Returns **48 hourly predictions** with `yhat`, `yhat_lower`, `yhat_upper`, and a **confidence percentage** per hour

> *This is not a toy random number generator — pvlib is the same physics library used by NREL (US National Renewable Energy Laboratory) and academic solar researchers worldwide.*

---

## 🧠 How the Model Works

### The Two-Layer Approach

Most solar forecasting services use either physics OR machine learning. EnergyGrid uses **both in sequence** — each layer does what it's best at:

```
Layer 1 — Physics (pvlib)
─────────────────────────
"What SHOULD this panel produce given the laws of physics 
 and today's weather?"

  Real sun position (azimuth + zenith) for this GPS coordinate
  + Panel orientation (tilt + azimuth angle)
  + Irradiance hitting the tilted surface (POA model)
  + Cell temperature correction (efficiency drops when hot)
  → Hourly kWh estimate grounded in physical reality

Layer 2 — Statistical (Prophet)
────────────────────────────────
"Given the physics estimate, how do we smooth it 
 and quantify our uncertainty?"

  Takes pvlib output as baseline signal (y variable)
  + Cloud cover, temperature, precipitation as regressors
  + Daily seasonality pattern learned from the data
  → yhat (smoothed prediction)
  → yhat_lower / yhat_upper (80% confidence band)
  → Confidence % derived from band width relative to peak
```

### Why Not Just pvlib?

pvlib gives a single point estimate — it has no concept of uncertainty. On a day forecast as "30% cloud cover," the actual cloud movement could mean anything from 0.5× to 1.2× the physics prediction. Prophet wraps that uncertainty into a confidence band that your trading engine can act on.

### Why Not Just an ML Model (LSTM etc.)?

Pure ML models need months of historical readings per household to generalize. pvlib needs **zero historical data** — it works from physics on day one for any new user who joins the platform. This is critical for cold-start.

---

## 📐 Physics Model — Detailed

### Step 1: Solar Position

```
pvlib.location.Location(lat, lng, tz, altitude)
    → get_solarposition(timestamps)
    → apparent_zenith (angle from vertical)
    → azimuth (compass direction of sun)
```

The sun's position changes every minute. pvlib calculates it precisely for any coordinate and timestamp using the NREL SPA (Solar Position Algorithm).

### Step 2: Plane of Array (POA) Irradiance

```
pvlib.irradiance.get_total_irradiance(
    surface_tilt,     ← panel tilt angle (from users table)
    surface_azimuth,  ← panel facing direction (from users table)
    solar_zenith,
    solar_azimuth,
    dni,              ← Direct Normal Irradiance (from Open-Meteo)
    ghi,              ← Global Horizontal Irradiance (from Open-Meteo)
    dhi               ← Diffuse Horizontal Irradiance (from Open-Meteo)
)
→ poa_global (W/m²) — actual irradiance hitting the tilted panel surface
```

A south-facing 15° tilted panel in Bengaluru receives ~12% more annual irradiance than a flat horizontal panel. POA accounts for this precisely.

### Step 3: Cell Temperature Correction

```
pvlib.temperature.faiman(poa_global, temp_air, wind_speed)
→ cell_temp (°C)

temp_correction = 1 + (-0.004) × (cell_temp - 25)
```

Monocrystalline silicon loses **0.4% efficiency per °C above 25°C**. A panel running at 60°C (common on a still summer afternoon) is 14% less efficient than its rated spec. Most simple calculators ignore this — EnergyGrid accounts for it.

### Step 4: DC Power Output

```
panel_area (m²) = panel_kw × 1000 / 200
  └─ assumes 200W per m² — standard for monocrystalline panels

dc_power_kw = poa_global × panel_area × panel_efficiency × temp_correction / 1000
production_kwh = dc_power_kw.clip(lower=0)
  └─ clip negatives (can occur at very low sun angles due to floating point)
```

---

## 📊 Confidence Score — How It's Calculated

```python
band_width           = yhat_upper - yhat_lower
relative_uncertainty = band_width / peak_production
confidence           = (1 - relative_uncertainty) × 100
confidence           = clamp(confidence, 10, 99)
```

| Scenario | Cloud Cover | Confidence | Meaning |
|---|---|---|---|
| Clear summer afternoon | 0–5% | 88–95% | Safe to pre-list 80% of surplus |
| Partly cloudy | 20–40% | 65–75% | Pre-list 60% conservatively |
| Overcast | 60–80% | 35–50% | Pre-list 40% only |
| Heavy rain / storm | >80% | 10–25% | Minimal pre-listing, hold back |
| Night hours (0 production) | any | 99% | Confident it's zero |

This confidence score directly drives the **auto sell-order sizing** in the Node.js matching engine:

```
confidence ≥ 85% → list 80% of predicted surplus
confidence ≥ 70% → list 60%
confidence ≥ 50% → list 40%
confidence  < 50% → list 20%
```

---

## 🗂️ Project Structure

```
ai_service/
│
├── app.py                    ← Flask entry point — routes only, no business logic
├── config.py                 ← Loads .env, exports all config constants
│
├── services/
│   ├── __init__.py
│   ├── database.py           ← Fetches user panel specs from PostgreSQL
│   ├── weather.py            ← Open-Meteo API — 48h weather forecast
│   ├── solar.py              ← pvlib physics model — hourly kWh estimate
│   └── forecast.py           ← Prophet smoothing + confidence scoring
│
├── models/
│   ├── __init__.py
│   └── schemas.py            ← Pydantic v2 request/response validation
│
├── utils/
│   ├── __init__.py
│   └── helpers.py            ← Rounding, clipping, date formatting utils
│
├── tests/
│   ├── test_weather.py       ← Mocked Open-Meteo tests
│   ├── test_solar.py         ← pvlib output validation
│   └── test_forecast.py      ← Prophet output + confidence tests
│
├── requirements.txt
├── .env.example
└── Dockerfile
```

---

## 🔌 API Reference

### `POST /predict`

Takes a `user_id`, runs the full pipeline, returns 48-hour forecast.

**Request:**
```json
{
  "user_id": 42
}
```

**Response `200 OK`:**
```json
{
  "user_id": 42,
  "panel_kw": 5.0,
  "location": {
    "lat": 12.97,
    "lng": 77.59
  },
  "generated_at": "2025-03-21T06:00:00+00:00",
  "summary": {
    "total_predicted_kwh": 28.40,
    "avg_confidence_pct": 76.3,
    "peak_hour": "2025-03-21T12:00:00",
    "peak_kwh": 4.820
  },
  "forecast": [
    {
      "hour": "2025-03-21T06:00:00",
      "yhat": 0.120,
      "yhat_lower": 0.000,
      "yhat_upper": 0.310,
      "confidence": 62.1,
      "cloud_cover": 15.0,
      "temperature": 22.4
    },
    {
      "hour": "2025-03-21T12:00:00",
      "yhat": 4.820,
      "yhat_lower": 4.210,
      "yhat_upper": 5.440,
      "confidence": 88.7,
      "cloud_cover": 5.0,
      "temperature": 31.2
    },
    {
      "hour": "2025-03-21T20:00:00",
      "yhat": 0.000,
      "yhat_lower": 0.000,
      "yhat_upper": 0.000,
      "confidence": 99.0,
      "cloud_cover": 80.0,
      "temperature": 25.1
    }
  ]
}
```

**Response field reference:**

| Field | Type | Description |
|-------|------|-------------|
| `summary.total_predicted_kwh` | float | Sum of all 48 yhat values |
| `summary.avg_confidence_pct` | float | Mean confidence across all 48 hours |
| `summary.peak_hour` | string | ISO timestamp of highest production hour |
| `summary.peak_kwh` | float | kWh at peak hour |
| `forecast[].yhat` | float | Point estimate — expected production (kWh) |
| `forecast[].yhat_lower` | float | Lower bound of 80% confidence band |
| `forecast[].yhat_upper` | float | Upper bound of 80% confidence band |
| `forecast[].confidence` | float | Confidence % (10–99). Higher = narrower band |
| `forecast[].cloud_cover` | float | Cloud cover % from Open-Meteo (0–100) |
| `forecast[].temperature` | float | Air temperature °C from Open-Meteo |

---

**Error Responses:**

| Status | Condition | Response body |
|--------|-----------|---------------|
| `400` | Missing or non-integer `user_id` | `{ "error": "user_id must be an integer" }` |
| `404` | User not found in DB | `{ "error": "User 42 not found" }` |
| `503` | Open-Meteo API unreachable | `{ "error": "Weather API unavailable" }` |
| `500` | Any unexpected error | `{ "error": "<message>" }` |

---

### `GET /health`

Liveness check. Called by Node.js backend before routing requests.

**Response `200 OK`:**
```json
{
  "status": "ok",
  "service": "EnergyGrid AI",
  "timestamp": "2025-03-21T06:00:00+00:00"
}
```

---

## ⚙️ Request Pipeline (Internal Flow)

```
POST /predict { user_id: 42 }
        │
        ▼
┌───────────────────────────────┐
│ 1. Validate request           │  ← Pydantic schema check
│    user_id must be int        │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ 2. database.get_user_data()   │  ← SELECT from users table
│    → lat, lng, panel_kw,      │     raises ValueError if not found
│      tilt, azimuth, efficiency│
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ 3. weather.fetch_weather()    │  ← Open-Meteo free API
│    → 48-row DataFrame         │     GHI, DNI, DHI, cloud, temp,
│      (one row per hour)       │     wind, precipitation
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ 4. solar.run_pvlib()          │  ← Physics simulation
│    → adds pvlib_kwh column    │     Sun position → POA irradiance
│      to weather DataFrame     │     → cell temp → DC power → kWh
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ 5. forecast.run_prophet()     │  ← Statistical smoothing
│    → forecast DataFrame       │     pvlib_kwh as y variable
│      with yhat, lower, upper  │     weather cols as regressors
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ 6. forecast.compute_          │  ← Confidence scoring
│    confidence()               │     band_width / peak_production
│    → confidence Series        │     clipped to 10–99%
└──────────────┬────────────────┘
               │
               ▼
        Build JSON response
        48 items in forecast[]
        + summary object
               │
               ▼
        Return 200 OK
```

---

## 🗄️ Database Connection

The service reads from the **existing `users` table** in the shared PostgreSQL database. It never writes to the database — read-only access.

**Query executed:**
```sql
SELECT latitude, longitude, panel_kw, panel_tilt, panel_azimuth, panel_efficiency
FROM users
WHERE id = %s
```

**Connection:** psycopg2, opened and closed per request. No connection pool — this service handles low-frequency forecast requests (not high-frequency trading data).

---

## 🌦️ Weather Data — Open-Meteo

[Open-Meteo](https://open-meteo.com/) is a free, open-source weather API with no API key required. It provides hourly forecasts up to 16 days ahead using ECMWF and DWD models.

**Fields fetched:**

| Open-Meteo Field | Unit | Used for |
|---|---|---|
| `global_tilted_irradiance` | W/m² | Primary irradiance input to pvlib |
| `direct_radiation` | W/m² | DNI component for POA calculation |
| `diffuse_radiation` | W/m² | DHI component for POA calculation |
| `temperature_2m` | °C | Cell temperature correction + Prophet regressor |
| `cloud_cover` | % | Prophet regressor — biggest production modifier |
| `precipitation` | mm | Prophet regressor — zero-production signal |
| `wind_speed_10m` | km/h | Faiman cell temperature model |

**No API key. No rate limit for reasonable usage. Free forever.**

---

## 🚀 Getting Started

### Prerequisites

```
Python >= 3.11
PostgreSQL >= 14 (shared with main backend)
pip
```

### 1. Clone and Navigate

```bash
cd energygrid/ai_service
```

### 2. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate        # Linux / macOS
venv\Scripts\activate           # Windows
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

> ⚠️ Prophet installation can take 2–3 minutes — it compiles Stan under the hood. This is normal.

### 4. Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:
```env
DB_URI=postgresql://user:password@localhost:5432/energygrid
FLASK_PORT=5001
FLASK_DEBUG=false
OPEN_METEO_URL=https://api.open-meteo.com/v1/forecast
OPEN_METEO_TIMEOUT=10
PROPHET_INTERVAL_WIDTH=0.80
PROPHET_CHANGEPOINT_PRIOR=0.01
DEFAULT_ALTITUDE_M=920
```

### 5. Run (Development)

```bash
python app.py
# → Running on http://localhost:5001
```

### 6. Run (Production)

```bash
gunicorn --bind 0.0.0.0:5001 --workers 2 --timeout 60 app:app
```

### 7. Run with Docker

```bash
docker build -t energygrid-ai .
docker run -p 5001:5001 --env-file .env energygrid-ai
```

---

## 🧪 Testing

```bash
pytest tests/ -v
```

**Test coverage:**

| Test File | What It Tests |
|---|---|
| `test_weather.py` | Mocked Open-Meteo response, 48 rows, no NaN, error handling |
| `test_solar.py` | pvlib output shape, all values ≥ 0, peak at solar noon, zero at night |
| `test_forecast.py` | Prophet output shape, yhat_lower ≤ yhat ≤ yhat_upper, confidence 10–99 |

```bash
# Run individual test files
pytest tests/test_weather.py -v
pytest tests/test_solar.py -v
pytest tests/test_forecast.py -v

# Run with coverage report
pip install pytest-cov
pytest tests/ --cov=services --cov-report=term-missing
```

---

## 📦 Dependencies

```
flask==3.0.3              Web framework
prophet==1.1.5            Time-series forecasting (Meta)
pvlib==0.11.0             Solar physics simulation (NREL)
pandas==2.2.2             DataFrame operations
numpy==1.26.4             Numerical operations
requests==2.32.3          Open-Meteo HTTP client
psycopg2-binary==2.9.9    PostgreSQL driver
pydantic==2.7.1           Request/response validation
python-dotenv==1.0.1      .env file loading
gunicorn==22.0.0          Production WSGI server
```

---

## 🔗 Integration with Node.js Backend

The Node.js backend calls this service from `server/services/aiService.js`:

```javascript
const axios = require('axios');

async function getForecast(userId) {
  const response = await axios.post(
    `${process.env.AI_SERVICE_URL}/predict`,
    { user_id: userId },
    { timeout: 15000 }
  );
  return response.data;
}

module.exports = { getForecast };
```

**When is it called:**

| Trigger | Action |
|---|---|
| User logs into dashboard | Fetch forecast for their user_id |
| Cron job at 11 PM daily | Pre-fetch forecast for all active users |
| User manually refreshes chart | Re-fetch latest forecast |
| New user registration | Initial forecast on first login |

**How forecast feeds the trading engine:**

```javascript
// server/services/matchingEngine.js

const forecast = await getForecast(userId);

// Auto-size sell orders based on confidence
forecast.forecast
  .filter(h => h.yhat > 0.1)
  .forEach(h => {
    const fraction =
      h.confidence >= 85 ? 0.80 :
      h.confidence >= 70 ? 0.60 :
      h.confidence >= 50 ? 0.40 : 0.20;

    createLimitSellOrder({
      userId,
      hour:  h.hour,
      units: +(h.yhat * fraction).toFixed(2)
    });
  });
```

---

## 📈 Model Accuracy Metrics

Evaluate your model after collecting real production data:

```python
from sklearn.metrics import mean_absolute_error, mean_squared_error
import numpy as np

# After collecting actual vs predicted data
mae      = mean_absolute_error(y_actual, y_pred)
rmse     = mean_squared_error(y_actual, y_pred, squared=False)
coverage = np.mean((y_actual >= y_lower) & (y_actual <= y_upper))

print(f"MAE:      {mae:.3f} kWh")
print(f"RMSE:     {rmse:.3f} kWh")
print(f"Coverage: {coverage:.1%}  (target: ~80% for 80% interval)")
```

**Target benchmarks for a 5 kW panel:**

| Metric | Target | Meaning |
|---|---|---|
| MAE | < 0.30 kWh | Average error under 300 Wh per hour |
| RMSE | < 0.50 kWh | Large errors are rare |
| Coverage | 75–85% | 80% of actuals fall inside the confidence band |

---

## 🔮 Future Improvements

- [ ] **LSTM model** — replace Prophet with a trained LSTM for higher accuracy once historical data accumulates
- [ ] **Per-household model persistence** — save fitted Prophet models to disk, retrain weekly instead of per-request
- [ ] **Redis caching** — cache forecast output for 30 minutes per user to avoid redundant API + model calls
- [ ] **Consumption forecasting** — add a second endpoint `/predict/consumption` to forecast demand alongside supply
- [ ] **Monte Carlo Dropout** — implement uncertainty quantification for the LSTM upgrade path
- [ ] **Microservice health metrics** — expose `/metrics` endpoint for Prometheus scraping
- [ ] **Multi-location weather** — batch Open-Meteo calls for all active users in a single API request

---

## 🏷️ Part of EnergyGrid Platform

This microservice is one of four services in the EnergyGrid stack:

| Service | Port | Tech | Purpose |
|---|---|---|---|
| **React Frontend** | 3000 | React + Tailwind | Dashboard + Marketplace UI |
| **Node.js Backend** | 5000 | Express + Socket.io | API + Matching Engine |
| **AI Service** ← you are here | 5001 | Flask + pvlib + Prophet | Solar Forecasting |
| **PostgreSQL** | 5432 | PostgreSQL 14 | Persistent data store |

---

<div align="center">

**🤖 EnergyGrid AI Service · Team BihariBabu**

*Intelligent Renewable & Smart Energy Systems*

pvlib × Prophet × Open-Meteo · Physics-grounded · Uncertainty-aware

</div>