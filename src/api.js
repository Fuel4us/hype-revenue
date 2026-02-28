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
    
    if (!oiMap.has(today)) {
      oiMap.set(today, liveOI);
    }
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

  // === FIX: Explicitly Backfill/Interpolate Missing OI Days ===
  // If we have a gap between the last historical OI and today's live OI, fill it.
  
  // 1. Find the last day we have valid OI
  let lastOIDateIndex = -1;
  for (let i = mergedData.length - 1; i >= 0; i--) {
    if (mergedData[i].openInterest) {
      lastOIDateIndex = i;
      break;
    }
  }

  // 2. If we have a live OI point but gaps before it (or if live OI wasn't merged yet)
  const todayDate = new Date().toISOString().split('T')[0];
  
  // Ensure "Today" is in the dataset if it's not already
  if (liveOI && mergedData[mergedData.length - 1]?.date !== todayDate) {
    mergedData.push({
      timestamp: Math.floor(Date.now() / 1000),
      date: todayDate,
      dailyFees: 0,
      price: priceMap.get(todayDate) || null,
      openInterest: liveOI
    });
  } else if (liveOI && mergedData[mergedData.length - 1]?.date === todayDate) {
      // Force update today's OI in case it was null
      mergedData[mergedData.length - 1].openInterest = liveOI;
  }

  // 3. Interpolate the gap (Linear Interpolation)
  // Re-find last valid OI index after potentially adding today
  let lastValidIndex = -1;
  for (let i = 0; i < mergedData.length; i++) {
      if (mergedData[i].openInterest) {
          lastValidIndex = i;
      } else if (lastValidIndex !== -1 && i < mergedData.length) {
          // We are in a gap!
          // Find next valid index
          let nextValidIndex = -1;
          for (let j = i + 1; j < mergedData.length; j++) {
              if (mergedData[j].openInterest) {
                  nextValidIndex = j;
                  break;
              }
          }

          if (nextValidIndex !== -1) {
              // Interpolate between lastValidIndex and nextValidIndex
              const startOI = mergedData[lastValidIndex].openInterest;
              const endOI = mergedData[nextValidIndex].openInterest;
              const steps = nextValidIndex - lastValidIndex;
              const stepValue = (endOI - startOI) / steps;

              for (let k = 1; k < steps; k++) {
                  mergedData[lastValidIndex + k].openInterest = startOI + (stepValue * k);
              }
              // Fast forward loop
              i = nextValidIndex - 1; 
              lastValidIndex = nextValidIndex;
          }
      }
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
