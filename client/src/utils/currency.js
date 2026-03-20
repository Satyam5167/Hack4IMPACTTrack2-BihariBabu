// Utility for fetching real-time cryptocurrency exchange rates

let cachedRate = null;
let lastFetchTime = 0;
const CACHE_DURATION_MS = 60 * 1000; // Cache for 1 minute

export const getEthToInrRate = async () => {
  const now = Date.now();
  if (cachedRate && (now - lastFetchTime < CACHE_DURATION_MS)) {
    return cachedRate;
  }

  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr');
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    
    if (data && data.ethereum && data.ethereum.inr) {
      cachedRate = data.ethereum.inr;
      lastFetchTime = now;
      return cachedRate;
    }
  } catch (error) {
    console.error("Failed to fetch ETH rate, using fallback", error);
    // Fallback rate if API is unavailable or rate limited
    return 280000; // Roughly 280k INR per ETH as a safe fallback
  }

  return 280000;
};

export const calculateEthForInr = (inrAmount, ethRate) => {
  if (!inrAmount || !ethRate) return "0";
  const ethValue = inrAmount / ethRate;
  // Format to 6 decimal places to prevent extreme dust
  return ethValue.toFixed(6);
};
