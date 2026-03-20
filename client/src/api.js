import { API_BASE_URL } from './apiBase';

export const recordEnergyReading = async (produced, consumed) => {
  const response = await fetch(`${API_BASE_URL}/api/energy/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ produced_amount: produced, consumed_amount: consumed }),
    credentials: 'include'
  });
  return response.json();
};

export const getEnergySurplus = async () => {
  const response = await fetch(`${API_BASE_URL}/api/energy/surplus`, {
    credentials: 'include'
  });
  return response.json();
};

export const getEnergyReadings = async () => {
  const response = await fetch(`${API_BASE_URL}/api/energy/readings`, {
    credentials: 'include'
  });
  return response.json();
};

export const createEnergyListing = async (amount, pricePerUnit, type = 'sell') => {
  const response = await fetch(`${API_BASE_URL}/api/energy/listings/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, price_per_unit: pricePerUnit, type }),
    credentials: 'include'
  });
  return response.json();
};

export const getActiveListings = async () => {
  const response = await fetch(`${API_BASE_URL}/api/energy/listings/active`, {
    credentials: 'include'
  });
  return response.json();
};

export const buyEnergyListing = async (listingId, ethAmount, txHash, amountKwhToBuy) => {
  const response = await fetch(`${API_BASE_URL}/api/energy/listings/buy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listingId, ethAmount, txHash, amountKwhToBuy }),
    credentials: 'include'
  });
  return response.json();
};

export const getUserOrders = async () => {
  const response = await fetch(`${API_BASE_URL}/api/energy/orders`, {
    credentials: 'include'
  });
  return response.json();
};

export const getRecentTrades = async () => {
  const response = await fetch(`${API_BASE_URL}/api/energy/trades/recent`, {
    credentials: 'include'
  });
  return response.json();
};

export const getTopTraders = async () => {
  const response = await fetch(`${API_BASE_URL}/api/energy/trades/top`, {
    credentials: 'include'
  });
  return response.json();
};

export const getMarketStats = async () => {
  const response = await fetch(`${API_BASE_URL}/api/energy/stats`, {
    credentials: 'include'
  });
  return response.json();
};

export const getPoolStats = async () => {
  const response = await fetch(`${API_BASE_URL}/api/energy/pool`, {
    credentials: 'include'
  });
  return response.json();
};

export const getImpactStats = async () => {
  const response = await fetch(`${API_BASE_URL}/api/energy/impact`, {
    credentials: 'include'
  });
  return response.json();
};

export const updateUserProfile = async (location) => {
  const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location }),
    credentials: 'include'
  });
  return response.json();
};

export const getSolarPanel = async () => {
  const response = await fetch(`${API_BASE_URL}/api/users/panel`, {
    credentials: 'include'
  });
  return response.json();
};

export const upsertSolarPanel = async (data) => {
  const response = await fetch(`${API_BASE_URL}/api/users/panel`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });
  return response.json();
};

export const getForecast = async () => {
  const response = await fetch(`${API_BASE_URL}/api/forecast`, {
    credentials: 'include'
  });
  return response.json();
};
