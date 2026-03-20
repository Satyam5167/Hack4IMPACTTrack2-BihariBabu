import pool from '../utils/db.js';
import fetch from 'node-fetch';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'https://hack4impacttrack2-biharibabu-1.onrender.com';

async function geocodeLocation(locationText) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationText)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(`Could not geocode location: "${locationText}"`);
  }
  const { latitude, longitude } = data.results[0];
  return { latitude, longitude };
}

export const getForecast = async (req, res) => {
  try {
    // 1. Check user has location set
    const userRes = await pool.query('SELECT location FROM users WHERE id = $1', [req.userId]);
    if (!userRes.rows[0]?.location) {
      return res.status(400).json({ error: 'profile_incomplete', missing: 'location' });
    }

    // 2. Check user has panel specs
    const panelRes = await pool.query('SELECT * FROM solar_panels WHERE user_id = $1', [req.userId]);
    if (!panelRes.rows[0]) {
      return res.status(400).json({ error: 'profile_incomplete', missing: 'panel' });
    }

    const panel = panelRes.rows[0];
    const location = userRes.rows[0].location;

    // 3. Geocode location text → lat/lng
    const { latitude, longitude } = await geocodeLocation(location);

    // 4. Call Python AI service
    const aiRes = await fetch(`${AI_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: req.userId,
        latitude,
        longitude,
        panel_kw: parseFloat(panel.panel_kw),
        panel_tilt: parseFloat(panel.panel_tilt),
        panel_azimuth: parseFloat(panel.panel_azimuth),
        panel_efficiency: parseFloat(panel.panel_efficiency),
      }),
      timeout: 30000,
    });

    if (!aiRes.ok) {
      const err = await aiRes.json().catch(() => ({}));
      return res.status(aiRes.status).json({ error: err.error || 'AI service error' });
    }

    const forecast = await aiRes.json();
    res.json({ ...forecast, location, latitude, longitude });

  } catch (err) {
    if (err.message.includes('geocode')) {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(503).json({ error: 'AI service is unavailable. Please try again later.' });
    }
    console.error('getForecast error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
