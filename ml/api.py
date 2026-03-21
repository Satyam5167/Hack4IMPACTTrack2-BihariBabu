# api.py — cleaned up, no DB, no geocoding

from flask import Flask, request, jsonify
from dotenv import load_dotenv
import pvlib
import pandas as pd
import numpy as np
from scipy.signal import savgol_filter
import requests
from datetime import datetime, timezone
import os

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

app = Flask(__name__)

OPEN_METEO_URL     = os.environ.get("OPEN_METEO_URL", "https://api.open-meteo.com/v1/forecast")
OPEN_METEO_TIMEOUT = int(os.environ.get("OPEN_METEO_TIMEOUT", 10))
DEFAULT_ALTITUDE_M = float(os.environ.get("DEFAULT_ALTITUDE_M", 920))
FLASK_PORT         = int(os.environ.get("PORT", 5001))
FLASK_DEBUG        = os.environ.get("FLASK_DEBUG", "False").lower() == "true"


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
    panel_area      = panel["panel_kw"] * 1000 / 200
    temp_coeff      = -0.004
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


def smooth_forecast(weather_df):
    raw = weather_df["pvlib_kwh"].values.copy()
    n   = len(raw)
    win = min(9, n if n % 2 == 1 else n - 1)
    if win >= 3 and raw.max() > 0.01:
        smoothed = savgol_filter(raw, window_length=win, polyorder=2)
        smoothed = np.clip(smoothed, 0, None)
    else:
        smoothed = raw.copy()
    cloud_frac       = weather_df["cloud_cover"].values / 100.0
    uncertainty_frac = 0.05 + cloud_frac * 0.35
    band             = smoothed * uncertainty_frac
    yhat_upper       = smoothed + band
    yhat_lower       = np.clip(smoothed - band, 0, None)
    return smoothed, yhat_lower, yhat_upper


def compute_confidence(smoothed, yhat_lower, yhat_upper, weather_df):
    peak = smoothed.max()
    if peak < 0.01:
        return np.full(len(smoothed), 100.0)
    band_width           = yhat_upper - yhat_lower
    relative_uncertainty = band_width / (peak + 1e-6)
    cloud_penalty        = weather_df["cloud_cover"].values / 200.0
    rain_penalty         = np.clip(weather_df["precipitation"].values * 0.1, 0, 0.2)
    confidence           = (1 - relative_uncertainty - cloud_penalty - rain_penalty) * 100
    confidence           = np.clip(confidence, 10, 99)
    confidence[smoothed < 0.001] = 99.0
    return np.round(confidence, 1)


# ── MAIN ENDPOINT ─────────────────────────────────────────────────
@app.route("/predict", methods=["POST"])
def predict():

    body = request.get_json(force=True, silent=True)

    if not body:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    # ── Validate all required fields ────────────────────────────────
    required = ["latitude", "longitude", "panel_kw",
                "panel_tilt", "panel_azimuth", "panel_efficiency"]

    missing = [f for f in required if body.get(f) is None]
    if missing:
        return jsonify({
            "error":    f"Missing required fields: {', '.join(missing)}",
            "received": list(body.keys())
        }), 400

    # ── Build panel dict ────────────────────────────────────────────
    try:
        latitude  = float(body["latitude"])
        longitude = float(body["longitude"])
        panel = {
            "panel_kw":         float(body["panel_kw"]),
            "panel_tilt":       float(body["panel_tilt"]),
            "panel_azimuth":    float(body["panel_azimuth"]),
            "panel_efficiency": float(body["panel_efficiency"]),
        }
        user_id = body.get("user_id", "unknown")

    except (ValueError, TypeError) as e:
        return jsonify({"error": f"Invalid field value: {str(e)}"}), 400

    # ── Run pipeline ────────────────────────────────────────────────
    try:
        weather_df             = fetch_weather(latitude, longitude)
        weather_df             = pvlib_production(weather_df, panel, latitude, longitude)
        smoothed, yhat_lower, yhat_upper = smooth_forecast(weather_df)
        confidence             = compute_confidence(smoothed, yhat_lower, yhat_upper, weather_df)

    except requests.exceptions.RequestException:
        return jsonify({"error": "Weather API unavailable"}), 503
    except Exception as exc:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500

    # ── Build response ──────────────────────────────────────────────
    result = []
    for i in range(len(weather_df)):
        result.append({
            "hour":        weather_df["timestamp"].iloc[i].strftime("%Y-%m-%dT%H:%M:%S"),
            "yhat":        round(float(smoothed[i]), 3),
            "yhat_lower":  round(float(yhat_lower[i]), 3),
            "yhat_upper":  round(float(yhat_upper[i]), 3),
            "confidence":  round(float(confidence[i]), 1),
            "cloud_cover": round(float(weather_df["cloud_cover"].iloc[i]), 1),
            "temperature": round(float(weather_df["temperature"].iloc[i]), 1),
        })

    total_predicted = round(sum(r["yhat"] for r in result), 2)
    avg_confidence  = round(sum(r["confidence"] for r in result) / len(result), 1)
    peak_hour       = max(result, key=lambda r: r["yhat"])

    return jsonify({
        "user_id":      user_id,
        "panel_kw":     panel["panel_kw"],
        "location": {
            "lat": latitude,
            "lng": longitude,
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total_predicted_kwh": total_predicted,
            "avg_confidence_pct":  avg_confidence,
            "peak_hour":           peak_hour["hour"],
            "peak_kwh":            peak_hour["yhat"],
        },
        "forecast": result
    })


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status":    "ok",
        "service":   "EnergyGrid AI",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=FLASK_DEBUG)

