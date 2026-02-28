import React, { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area
} from 'recharts';
import { Activity, TrendingUp, Info, DollarSign, Calendar, BarChart2 } from 'lucide-react';
import { getDashboardData } from './api';

const RANGE_OPTIONS = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '12M', days: 365 },
  { label: 'ALL', days: null }
];

const COLORS = {
  7: '#00FFFF',   // Aqua
  30: '#40E0D0',  // Turquoise
  90: '#20B2AA',  // LightSeaGreen
  180: '#48D1CC', // MediumTurquoise
  360: '#AFEEEE'  // PaleTurquoise
};

const formatCurrency = (val) => {
  if (val === null || val === undefined) return 'N/A';
  if (Math.abs(val) >= 1000000000) return `$${(val / 1000000000).toFixed(2)}B`;
  if (Math.abs(val) >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
  if (Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(2)}K`;
  return `$${val.toFixed(2)}`;
};

const formatPrice = (val) => {
  if (val === null || val === undefined) return 'N/A';
  if (val < 1) return `$${val.toFixed(4)}`;
  return `$${val.toFixed(2)}`;
};

const App = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeMA, setActiveMA] = useState(30);
  const [dateRange, setDateRange] = useState(null); 
  const [visibleLines1, setVisibleLines1] = useState(['revenue', 'price']); // Chart 1 toggles
  const [visibleLines2, setVisibleLines2] = useState(['oi', 'price']);      // Chart 2 toggles

  const timeframes = [7, 30, 90, 180, 360];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getDashboardData(timeframes);
        setRawData(data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch protocol data.");
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    if (!dateRange) return rawData;
    return rawData.slice(-dateRange);
  }, [rawData, dateRange]);

  const latestData = useMemo(() => {
    if (rawData.length === 0) return {};
    const lastItem = rawData[rawData.length - 1];
    const lastOIItem = [...rawData].reverse().find(d => d.openInterest > 0) || {};
    
    return {
      ...lastItem,
      latestOI: lastOIItem.openInterest || 0
    };
  }, [rawData]);

  const toggleLine1 = (line) => {
    setVisibleLines1(prev => 
      prev.includes(line) ? prev.filter(l => l !== line) : [...prev, line]
    );
  };

  const toggleLine2 = (line) => {
    setVisibleLines2(prev => 
      prev.includes(line) ? prev.filter(l => l !== line) : [...prev, line]
    );
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-aqua mb-4"></div>
      <p className="text-gray-400 font-medium">Fetching Hyperliquid Metrics...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-red-400 px-4 text-center">
      <p className="text-xl font-bold mb-2">Error</p>
      <p className="max-w-md">{error}</p>
      <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white hover:bg-gray-800 transition-all">Retry</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-aqua/30 pb-20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Header */}
        <header className="mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-aqua/10 rounded-lg">
                <Activity size={24} className="text-aqua" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-aqua to-blue-400 bg-clip-text text-transparent">
                Hype Revenue
              </h1>
            </div>
            <p className="text-gray-400 max-w-2xl">
              Protocol metrics: Annualized Revenue and Open Interest vs HYPE Price.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Global Controls */}
            <div className="bg-[#111] border border-gray-800 rounded-xl p-1 flex">
              {RANGE_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => setDateRange(opt.days)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    dateRange === opt.days 
                      ? 'bg-gray-800 text-aqua shadow-sm' 
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="bg-[#111] border border-gray-800 rounded-xl p-1 flex overflow-x-auto">
              {timeframes.map(tf => (
                <button
                  key={tf}
                  onClick={() => setActiveMA(tf)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
                    activeMA === tf 
                      ? 'bg-aqua text-black shadow-lg shadow-aqua/20' 
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {tf}D MA
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Price Card */}
          <div className="bg-[#0A0A0A] border border-gray-800/50 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">HYPE Price</p>
              <DollarSign size={16} className="text-white" />
            </div>
            <h3 className="text-3xl font-bold">{formatPrice(latestData.price)}</h3>
            <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
              <Calendar size={12} /> {latestData.date}
            </div>
          </div>

          {/* Revenue Card */}
          <div className="bg-[#0A0A0A] border border-gray-800/50 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Ann. Rev ({activeMA}d)</p>
              <TrendingUp size={16} className="text-aqua" />
            </div>
            <h3 className="text-3xl font-bold text-aqua">{formatCurrency(latestData[`annualized${activeMA}d`])}</h3>
            <div className="mt-2 text-xs text-gray-500">Avg fees over {activeMA}d × 365</div>
          </div>

          {/* OI Card */}
          <div className="bg-[#0A0A0A] border border-gray-800/50 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Open Interest</p>
              <BarChart2 size={16} className="text-purple-400" />
            </div>
            <h3 className="text-3xl font-bold text-purple-400">{formatCurrency(latestData.latestOI)}</h3>
            <div className="mt-2 text-xs text-gray-500">Total OI (Archive + Live)</div>
          </div>

          {/* Fees Card */}
          <div className="bg-[#0A0A0A] border border-gray-800/50 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Daily Fees</p>
              <Info size={16} className="text-gray-400" />
            </div>
            <h3 className="text-3xl font-bold">{formatCurrency(latestData.dailyFees)}</h3>
            <div className="mt-2 text-xs text-gray-500">Raw fees collected (24h)</div>
          </div>
        </div>

        {/* CHART 1: Price vs Annualized Revenue */}
        <div className="bg-[#0A0A0A] border border-gray-800/50 rounded-3xl p-4 md:p-8 shadow-2xl mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp size={20} className="text-aqua" />
              Annualized Revenue vs Price
            </h2>
            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 cursor-pointer select-none">
              <div 
                onClick={() => toggleLine1('revenue')} 
                className={`flex items-center gap-2 ${visibleLines1.includes('revenue') ? 'text-white' : 'text-gray-600'}`}
              >
                <div className="w-3 border-t-2 border-dashed border-current"></div>
                Rev (L)
              </div>
              <div 
                onClick={() => toggleLine1('price')} 
                className={`flex items-center gap-2 ${visibleLines1.includes('price') ? 'text-aqua' : 'text-gray-600'}`}
              >
                <div className="w-3 h-0.5 bg-current"></div>
                Price (R)
              </div>
            </div>
          </div>
          
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={filteredData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPrice1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[activeMA]} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={COLORS[activeMA]} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#444" 
                  fontSize={10} 
                  tickMargin={15}
                  axisLine={false}
                  tickFormatter={(str) => new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  minTickGap={30}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#FFF" 
                  fontSize={10} 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => val >= 1e9 ? `$${(val/1e9).toFixed(1)}B` : val >= 1e6 ? `$${(val/1e6).toFixed(0)}M` : val}
                  hide={!visibleLines1.includes('revenue')}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke={COLORS[activeMA]} 
                  fontSize={10} 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `$${val}`}
                  hide={!visibleLines1.includes('price')}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '16px' }}
                  itemStyle={{ fontSize: '13px' }}
                  labelStyle={{ color: '#888', fontWeight: 'bold', marginBottom: '8px' }}
                  formatter={(value, name) => [name.includes('Price') ? formatPrice(value) : formatCurrency(value), name]}
                />
                
                {visibleLines1.includes('revenue') && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey={`annualized${activeMA}d`}
                    name={`Annualized Rev (${activeMA}d)`}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: '#FFF' }}
                  />
                )}
                {visibleLines1.includes('price') && (
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="price"
                    name="HYPE Price"
                    stroke={COLORS[activeMA]}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorPrice1)"
                    dot={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Price vs Open Interest */}
        <div className="bg-[#0A0A0A] border border-gray-800/50 rounded-3xl p-4 md:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BarChart2 size={20} className="text-purple-400" />
              Open Interest vs Price
            </h2>
            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 cursor-pointer select-none">
              <div 
                onClick={() => toggleLine2('oi')} 
                className={`flex items-center gap-2 ${visibleLines2.includes('oi') ? 'text-purple-400' : 'text-gray-600'}`}
              >
                <div className="w-3 h-0.5 bg-purple-500"></div>
                OI (L)
              </div>
              <div 
                onClick={() => toggleLine2('price')} 
                className={`flex items-center gap-2 ${visibleLines2.includes('price') ? 'text-aqua' : 'text-gray-600'}`}
              >
                <div className="w-3 h-0.5 bg-current"></div>
                Price (R)
              </div>
            </div>
          </div>
          
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={filteredData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A855F7" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#A855F7" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPrice2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[activeMA]} stopOpacity={0.1}/>
                    <stop offset="95%" stopColor={COLORS[activeMA]} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#444" 
                  fontSize={10} 
                  tickMargin={15}
                  axisLine={false}
                  tickFormatter={(str) => new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  minTickGap={30}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#A855F7" 
                  fontSize={10} 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => val >= 1e9 ? `$${(val/1e9).toFixed(1)}B` : val}
                  hide={!visibleLines2.includes('oi')}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke={COLORS[activeMA]} 
                  fontSize={10} 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `$${val}`}
                  hide={!visibleLines2.includes('price')}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '16px' }}
                  itemStyle={{ fontSize: '13px' }}
                  labelStyle={{ color: '#888', fontWeight: 'bold', marginBottom: '8px' }}
                  formatter={(value, name) => [name.includes('Price') ? formatPrice(value) : formatCurrency(value), name]}
                />
                
                {visibleLines2.includes('oi') && (
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="openInterest"
                    name="Open Interest"
                    stroke="#A855F7"
                    strokeWidth={2}
                    fill="url(#colorOI)"
                    fillOpacity={1}
                    dot={false}
                  />
                )}
                {visibleLines2.includes('price') && (
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="price"
                    name="HYPE Price"
                    stroke={COLORS[activeMA]}
                    strokeWidth={2}
                    fill="url(#colorPrice2)"
                    fillOpacity={0.5}
                    dot={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <footer className="mt-16 pt-8 border-t border-gray-900 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-500 text-[10px] uppercase tracking-widest font-bold">
          <p>© 2026 Hyperliquid Community Dashboard</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              Data from Hyperliquid Archive
            </span>
            <a href="https://defillama.com" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-white transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-aqua"></span>
              DefiLlama API
            </a>
            <a href="https://coingecko.com" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-white transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              CoinGecko API
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
