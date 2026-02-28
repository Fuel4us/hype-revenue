import axios from 'axios';

/**
 * Fetches historical HYPE token prices from CoinGecko.
 */
export const fetchHypePrice = async () => {
  try {
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/coins/hyperliquid/market_chart?vs_currency=usd&days=365&interval=daily'
    );
    return response.data.prices.map(([timestamp, price]) => ({
      timestamp: Math.floor(timestamp / 1000),
      price
    }));
  } catch (error) {
    console.error('Error fetching HYPE price from CoinGecko:', error);
    return [];
  }
};

/**
 * Fetches historical Hyperliquid protocol revenue from DefiLlama.
 */
export const fetchProtocolRevenue = async () => {
  try {
    const response = await axios.get(
      'https://api.llama.fi/summary/fees/hyperliquid?dataType=dailyFees'
    );
    if (response.data && response.data.totalDataChart) {
        return response.data.totalDataChart.map(([timestamp, dailyFees]) => ({
          timestamp: Number(timestamp),
          dailyFees: Number(dailyFees)
        }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching protocol revenue:', error);
    return [];
  }
};

/**
 * Fetches historical Open Interest from our self-hosted JSON file.
 * This file is generated daily by a backend cron job (using AWS archive data).
 */
export const fetchOpenInterest = async () => {
  try {
    const response = await axios.get('/oi_history.json');
    if (Array.isArray(response.data)) {
      return response.data.map(item => ({
        date: item.date, // YYYY-MM-DD
        total_oi: item.total_oi
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching OI history:', error);
    return [];
  }
};

/**
 * Merges price, revenue, and Open Interest data.
 */
export const getDashboardData = async (timeframes = [7, 30]) => {
  const [prices, revenue, oiHistory] = await Promise.all([
    fetchHypePrice(),
    fetchProtocolRevenue(),
    fetchOpenInterest()
  ]);

  if (revenue.length === 0) {
      throw new Error("No revenue data found");
  }

  // Create maps for quick lookup by date (Y-M-D)
  const priceMap = new Map();
  prices.forEach(p => {
    const date = new Date(p.timestamp * 1000).toISOString().split('T')[0];
    priceMap.set(date, p.price);
  });

  const oiMap = new Map();
  oiHistory.forEach(d => {
    oiMap.set(d.date, d.total_oi);
  });

  // Base the timeline on revenue data (usually the most consistent daily source)
  // But we should ensure we cover the OI history too if it exists
  
  // Let's stick to revenue timestamps as the "backbone" to ensure alignment
  const mergedData = revenue.map(r => {
    const date = new Date(r.timestamp * 1000).toISOString().split('T')[0];
    return {
      timestamp: r.timestamp,
      date,
      dailyFees: r.dailyFees,
      price: priceMap.get(date) || null,
      openInterest: oiMap.get(date) || null
    };
  }).filter(d => d.dailyFees > 0); 

  mergedData.sort((a, b) => a.timestamp - b.timestamp);

  // Calculate moving averages for Revenue
  return mergedData.map((day, idx) => {
    const result = { ...day };
    
    timeframes.forEach(tf => {
      if (idx >= tf - 1) {
        const slice = mergedData.slice(idx - tf + 1, idx + 1);
        const sumFees = slice.reduce((acc, curr) => acc + curr.dailyFees, 0);
        const avgDaily = sumFees / tf;
        result[`annualized${tf}d`] = avgDaily * 365;
      } else {
        const slice = mergedData.slice(0, idx + 1);
        const sumFees = slice.reduce((acc, curr) => acc + curr.dailyFees, 0);
        const avgDaily = sumFees / (idx + 1);
        result[`annualized${tf}d`] = avgDaily * 365;
      }
    });
    
    return result;
  });
};
