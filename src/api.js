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
 */
export const fetchOpenInterestHistory = async () => {
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
 * Fetches LIVE Open Interest snapshot from Hyperliquid API.
 */
export const fetchLiveOpenInterest = async () => {
  try {
    const response = await axios.post('https://api.hyperliquid.xyz/info', {
      type: "metaAndAssetCtxs"
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const assetCtxs = response.data[1];
    let totalOI = 0;

    assetCtxs.forEach(ctx => {
      const oi = parseFloat(ctx.openInterest);
      const price = parseFloat(ctx.markPx);
      totalOI += oi * price;
    });

    return totalOI;
  } catch (error) {
    console.error('Error fetching live OI:', error);
    return null;
  }
};

/**
 * Merges price, revenue, and Open Interest (Historical + Live Gap Fill).
 */
export const getDashboardData = async (timeframes = [7, 30]) => {
  const [prices, revenue, oiHistory, liveOI] = await Promise.all([
    fetchHypePrice(),
    fetchProtocolRevenue(),
    fetchOpenInterestHistory(),
    fetchLiveOpenInterest()
  ]);

  if (revenue.length === 0) {
      throw new Error("No revenue data found");
  }

  // Create maps for quick lookup
  const priceMap = new Map();
  prices.forEach(p => {
    const date = new Date(p.timestamp * 1000).toISOString().split('T')[0];
    priceMap.set(date, p.price);
  });

  const oiMap = new Map();
  oiHistory.forEach(d => {
    oiMap.set(d.date, d.total_oi);
  });

  // Handle Live OI Gap Fill
  // If we have live OI, attach it to TODAY's date
  if (liveOI) {
    const today = new Date().toISOString().split('T')[0];
    
    // If today is not in history, add it to map so it gets picked up
    if (!oiMap.has(today)) {
      oiMap.set(today, liveOI);
    }
    
    // Optional: Linear interpolation for missing days between last history and today?
    // For now, let's just make sure "today" has a point. 
    // Recharts will draw a straight line connecting the last known point to today.
  }

  // Use revenue timestamps as the base timeline
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

  // If "Today" (Live OI) exists but wasn't in revenue data (e.g. DefiLlama hasn't updated for today yet),
  // we should append a "Today" entry so the chart reaches the live point.
  const todayDate = new Date().toISOString().split('T')[0];
  const lastDataDate = mergedData[mergedData.length - 1]?.date;

  if (liveOI && lastDataDate !== todayDate) {
    mergedData.push({
      timestamp: Math.floor(Date.now() / 1000),
      date: todayDate,
      dailyFees: 0, // No fees yet for today/unknown
      price: priceMap.get(todayDate) || null,
      openInterest: liveOI
    });
  }

  mergedData.sort((a, b) => a.timestamp - b.timestamp);

  // Calculate moving averages for Revenue
  return mergedData.map((day, idx) => {
    const result = { ...day };
    
    timeframes.forEach(tf => {
      // Logic for MA calculation remains same
      // ...
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
