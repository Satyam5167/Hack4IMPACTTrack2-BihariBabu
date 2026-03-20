# server/ml/api.py

from flask import Flask, request, jsonify
from dotenv import load_dotenv
import pvlib
import pandas as pd
import numpy as np
from scipy.signal import savgol_filter
import requests
from datetime import datetime, timezone
import psycopg2
import os
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError

# Load environment variables from ml/.env
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

app = Flask(__name__)

# ── Config from env ────────────────────────────────────────────────
DB_URI             = os.environ.get("DB_URI")
OPEN_METEO_URL     = os.environ.get("OPEN_METEO_URL", "https://api.open-meteo.com/v1/forecast")
OPEN_METEO_TIMEOUT = int(os.environ.get("OPEN_METEO_TIMEOUT", 10))
DEFAULT_ALTITUDE_M = float(os.environ.get("DEFAULT_ALTITUDE_M", 920))
FLASK_PORT         = int(os.environ.get("FLASK_PORT", 5001))
FLASK_DEBUG        = os.environ.get("FLASK_DEBUG", "False").lower() == "true"

# ── Geocoder (singleton) ───────────────────────────────────────────
_geolocator = Nominatim(user_agent="energygrid_ai/1.0")


def geocode_location(location_text: str):
    """Convert free-text location to (latitude, longitude) via Nominatim."""
    try:
        result = _geolocator.geocode(location_text, timeout=10)
    except (GeocoderTimedOut, GeocoderServiceError) as exc:
        raise ValueError(f"Geocoding service error: {exc}") from exc

    if result is None:
        raise ValueError(f'Could not geocode location: "{location_text}"')

    return result.latitude, result.longitude


# ── DB helpers ─────────────────────────────────────────────────────
def get_user_data(user_id):
    """
    Fetch user location text + solar panel specs from DB.
    Returns dict or None if missing.
    """
    conn = psycopg2.connect(DB_URI)
    cur  = conn.cursor()

    cur.execute("SELECT location FROM users WHERE id = %s", (user_id,))
    user_row = cur.fetchone()

    cur.execute(
        """
        SELECT panel_kw, panel_tilt, panel_azimuth, panel_efficiency
        FROM   solar_panels
        WHERE  user_id = %s
        """,
        (user_id,)
    )
    panel_row = cur.fetchone()
    cur.close()
    conn.close()

    if not user_row or not panel_row or not user_row[0]:
        return None

    return {
        "location_text":    user_row[0],
        "panel_kw":         float(panel_row[0]),
        "panel_tilt":       float(panel_row[1]),
        "panel_azimuth":    float(panel_row[2]),
        "panel_efficiency": float(panel_row[3]),
    }


# ── Step 1: Fetch 48h weather from Open-Meteo ─────────────────────
def fetch_weather(latitude, longitude):
    params = {
        "latitude":  latitude,
        "longitude": longitude,
        "hourly": [
            "global_tilted_irradiance",
            "direct_radiation",
            "diffuse_radiation",
            "temperature_2m",
            "cloud_cover",
            "precipitation",
            "wind_speed_10m"
        ],
        "forecast_days": 3,
        "timezone": "Asia/Kolkata",
        "tilt":    15,
        "azimuth": 180
    }

    res = requests.get(OPEN_METEO_URL, params=params, timeout=OPEN_METEO_TIMEOUT)
    res.raise_for_status()
    data = res.json()["hourly"]

    df = pd.DataFrame({
        "timestamp":     pd.to_datetime(data["time"]),
        "gti":           data["global_tilted_irradiance"],
        "direct_rad":    data["direct_radiation"],
        "diffuse_rad":   data["diffuse_radiation"],
        "temperature":   data["temperature_2m"],
        "cloud_cover":   data["cloud_cover"],
        "precipitation": data["precipitation"],
        "wind_speed":    data["wind_speed_10m"]
    })

    return df.head(48)


# ── Step 2: pvlib physics model ───────────────────────────────────
def pvlib_production(weather_df, panel, latitude, longitude):
    location = pvlib.location.Location(
        latitude=latitude,
        longitude=longitude,
        tz="Asia/Kolkata",
        altitude=DEFAULT_ALTITUDE_M
    )

    solar_pos = location.get_solarposition(weather_df["timestamp"])

    poa = pvlib.irradiance.get_total_irradiance(
        surface_tilt=panel["panel_tilt"],
        surface_azimuth=panel["panel_azimuth"],
        solar_zenith=solar_pos["apparent_zenith"],
        solar_azimuth=solar_pos["azimuth"],
        dni=weather_df["direct_rad"].values,
        ghi=weather_df["gti"].values,
        dhi=weather_df["diffuse_rad"].values
    )

    cell_temp = pvlib.temperature.faiman(
        poa_global=poa["poa_global"],
        temp_air=weather_df["temperature"].values,
        wind_speed=weather_df["wind_speed"].values
    )

    panel_area      = panel["panel_kw"] * 1000 / 200   # m²
    temp_coeff      = -0.004                             # -0.4%/°C above 25°C
    temp_correction = 1 + temp_coeff * (cell_temp - 25)

    dc_power_w = (
        poa["poa_global"]
        * panel_area
        * panel["panel_efficiency"]
        * temp_correction
    )

    production_kwh = (dc_power_w / 1000).clip(lower=0)

    weather_df = weather_df.copy()
    weather_df["pvlib_kwh"] = production_kwh.values
    return weather_df


# ── Step 3: Savitzky-Golay smoothing + uncertainty bands ──────────
def smooth_forecast(weather_df):
    """
    Smooth the physics output with Savitzky-Golay filter (replaces Prophet).
    Uncertainty band is cloud-cover-driven: cloudier → wider band.
    This is fully numpy/scipy — no Stan/cmdstanpy required.
    """
    raw = weather_df["pvlib_kwh"].values.copy()
    n   = len(raw)

    # Only smooth if there is meaningful signal (daytime hours)
    # window_length must be odd and <= n
    win = min(9, n if n % 2 == 1 else n - 1)
    if win >= 3 and raw.max() > 0.01:
        smoothed = savgol_filter(raw, window_length=win, polyorder=2)
        smoothed = np.clip(smoothed, 0, None)
    else:
        smoothed = raw.copy()

    # Cloud-cover-driven uncertainty: 0% cloud → ±5%, 100% cloud → ±40%
    cloud_frac = weather_df["cloud_cover"].values / 100.0          # 0–1
    uncertainty_frac = 0.05 + cloud_frac * 0.35                    # 5%–40%
    band = smoothed * uncertainty_frac

    yhat_upper = smoothed + band
    yhat_lower = np.clip(smoothed - band, 0, None)

    return smoothed, yhat_lower, yhat_upper


# ── Step 4: Confidence score per hour ────────────────────────────
def compute_confidence(smoothed, yhat_lower, yhat_upper, weather_df):
    """
    Confidence % = how narrow the uncertainty band is relative to peak output,
    penalised by cloud cover and precipitation.
    Night hours (near-zero output) always get 100% (trivially confident).
    """
    peak = smoothed.max()

    if peak < 0.01:
        return np.full(len(smoothed), 100.0)

    band_width           = yhat_upper - yhat_lower
    relative_uncertainty = band_width / (peak + 1e-6)
    cloud_penalty        = weather_df["cloud_cover"].values / 200.0  # 0–0.5 extra penalty
    rain_penalty         = np.clip(weather_df["precipitation"].values * 0.1, 0, 0.2)

    confidence = (1 - relative_uncertainty - cloud_penalty - rain_penalty) * 100
    confidence = np.clip(confidence, 10, 99)

    # Night hours: trivially confident (output ≈ 0 as expected)
    night_mask = smoothed < 0.001
    confidence[night_mask] = 99.0

    return np.round(confidence, 1)


# ── MAIN ENDPOINT ─────────────────────────────────────────────────
@app.route("/predict", methods=["POST"])
def predict():
    body    = request.json or {}
    user_id = body.get("user_id")

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    # 1. Get panel + location text from DB
    data = get_user_data(user_id)
    if not data:
        return jsonify({
            "error": "User not found or profile incomplete (missing location or panel info)"
        }), 404

    try:
        # 2. Geocode location text → lat/lng
        latitude, longitude = geocode_location(data["location_text"])

    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    try:
        # 3. Fetch weather
        weather_df = fetch_weather(latitude, longitude)

        # 4. Physics-based production estimate (pvlib)
        weather_df = pvlib_production(weather_df, data, latitude, longitude)

        # 5. Smoothing + uncertainty bands (scipy, no Stan)
        smoothed, yhat_lower, yhat_upper = smooth_forecast(weather_df)

        # 6. Confidence score per hour
        confidence = compute_confidence(smoothed, yhat_lower, yhat_upper, weather_df)

        # 7. Build hourly response
        result = []
        for i in range(len(weather_df)):
            result.append({
                "hour":        weather_df["timestamp"].iloc[i].strftime("%Y-%m-%dT%H:%M:%S"),
                "yhat":        round(float(smoothed[i]), 3),
                "yhat_lower":  round(float(yhat_lower[i]), 3),
                "yhat_upper":  round(float(yhat_upper[i]), 3),
                "confidence":  round(float(confidence[i]), 1),
                "cloud_cover": round(float(weather_df["cloud_cover"].iloc[i]), 1),
                "temperature": round(float(weather_df["temperature"].iloc[i]), 1)
            })

        total_predicted = round(sum(r["yhat"] for r in result), 2)
        avg_confidence  = round(sum(r["confidence"] for r in result) / len(result), 1)
        peak_hour       = max(result, key=lambda r: r["yhat"])

        return jsonify({
            "user_id":      user_id,
            "panel_kw":     data["panel_kw"],
            "location":     data["location_text"],
            "latitude":     latitude,
            "longitude":    longitude,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "summary": {
                "total_predicted_kwh": total_predicted,
                "avg_confidence_pct":  avg_confidence,
                "peak_hour":           peak_hour["hour"],
                "peak_kwh":            peak_hour["yhat"]
            },
            "forecast": result
        })

    except requests.exceptions.RequestException:
        return jsonify({"error": "Weather API unavailable"}), 503
    except Exception as exc:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


# ── Health check ──────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "EnergyGrid AI"})


if __name__ == "__main__":
    app.run(port=FLASK_PORT, debug=FLASK_DEBUG)