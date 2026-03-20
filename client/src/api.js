export const API_BASE_URL = 'http://localhost:4000';

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

export const createEnergyListing = async (amount, pricePerUnit) => {
  const response = await fetch(`${API_BASE_URL}/api/energy/listings/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, price_per_unit: pricePerUnit }),
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

export const buyEnergyListing = async (listingId, ethAmount) => {
  const response = await fetch(`${API_BASE_URL}/api/energy/listings/buy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listingId, ethAmount }),
    credentials: 'include'
  });
  return response.json();
};
