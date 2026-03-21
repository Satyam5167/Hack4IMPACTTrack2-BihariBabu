import { API_BASE_URL, getToken } from './apiBase';

const fetchWithAuth = async (url, options = {}) => {
  const token = getToken();
  const headers = {
    ...options.headers,
    'Authorization': token ? `Bearer ${token}` : '',
  };
  return fetch(url, { ...options, headers });
};

export const recordEnergyReading = async (produced, consumed) => {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/energy/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ produced_amount: produced, consumed_amount: consumed }),
  });
  return response.json();
};

export const getEnergySurplus = async () => {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/energy/surplus`);
  return response.json();
};

export const getEnergyReadings = async () => {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/energy/readings`);
  return response.json();
};

export const createEnergyListing = async (amount, pricePerUnit, type = 'sell') => {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/energy/listings/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, price_per_unit: pricePerUnit, type }),
  });
  return response.json();
};

export const getActiveListings = async () => {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/energy/listings/active`);
  return response.json();
};

export const buyEnergyListing = async (listingId, ethAmount, txHash, amountKwhToBuy) => {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/energy/listings/buy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listingId, ethAmount, txHash, amountKwhToBuy }),
  });
  return response.json();
};

export const getUserOrders = async () => {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/energy/orders`);
  return response.json();
};

export const getRecentTrades = async () => {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/energy/trades/recent`);
  return response.json();
};

export const getTopTraders = async () => {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/energy/trades/top`);
  return response.json();
};

export const getMarketStats = async () => {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/energy/stats`);
  return response.json();
};

export const getPoolStats = async () => {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/energy/pool`);
  return response.json();
};

export const getImpactStats = async () => {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/energy/impact`);
  return response.json();
};

export const updateUserProfile = async (location) => {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/users/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location }),
  });
  return response.json();
};

export const getSolarPanel = async () => {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/users/panel`);
  return response.json();
};

export const upsertSolarPanel = async (data) => {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/users/panel`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const getForecast = async () => {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/forecast`);
  return response.json();
};
