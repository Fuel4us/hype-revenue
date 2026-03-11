import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function TetherComparisonChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch('/tether_mints_onchain.json').then(res => res.json()).catch(() => []),
      fetch('/tether_mints_defillama.json').then(res => res.json()).catch(() => [])
    ]).then(([onchain, defillama]) => {
      const merged = {};

      onchain.forEach(item => {
        merged[item.date] = {
          date: item.date,
          onchainBillion: parseFloat((item.total_minted / 1e9).toFixed(1)),
          chains: item.chains.join(' & '),
          defillamaBillion: 0,
        };
      });

      defillama.forEach(item => {
        if (!merged[item.date]) {
          merged[item.date] = {
            date: item.date,
            onchainBillion: 0,
            chains: 'N/A',
            defillamaBillion: 0,
          };
        }
        merged[item.date].defillamaBillion = parseFloat((item.amount / 1e9).toFixed(1));
      });

      const sortedData = Object.values(merged).sort((a, b) => a.date.localeCompare(b.date));
      setData(sortedData);
    });
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const onchain = payload.find(p => p.dataKey === 'onchainBillion');
      const dl = payload.find(p => p.dataKey === 'defillamaBillion');
      const chains = onchain?.payload?.chains || 'Unknown';

      return (
        <div className="bg-[#0f172a] border border-gray-700 p-4 shadow-xl rounded-lg text-sm text-gray-200">
          <p className="font-bold text-white mb-2 border-b border-gray-700 pb-2">{label}</p>
          
          <div className="space-y-2">
            <div className="flex justify-between gap-4">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-blue-500"></span>
                Gross Minted (On-Chain)
              </span>
              <span className="font-bold text-blue-400">
                {onchain?.value ? `+${onchain.value}B` : '0B'}
              </span>
            </div>
            {onchain?.value > 0 && (
              <p className="text-xs text-gray-500 ml-5 capitalize">Networks: {chains}</p>
            )}

            <div className="flex justify-between gap-4">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-500"></span>
                Net Supply Change (DefiLlama)
              </span>
              <span className="font-bold text-emerald-400">
                {dl?.value ? `+${dl.value}B` : '0B'}
              </span>
            </div>
            
            {onchain?.value > dl?.value && dl?.value !== 0 && (
              <p className="text-xs text-rose-400 mt-2 bg-rose-500/10 p-2 rounded">
                Difference: {Math.abs(onchain.value - dl.value).toFixed(1)}B was likely burned same-day.
              </p>
            )}
            {onchain?.value > 0 && dl?.value === 0 && (
              <p className="text-xs text-rose-400 mt-2 bg-rose-500/10 p-2 rounded">
                100% of this mint was offset by same-day burns!
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-[#020617] rounded-xl shadow-2xl border border-gray-800 p-6 my-8">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-blue-500">Gross On-Chain Mints</span> vs 
          <span className="text-emerald-500">Net Supply Changes</span>
        </h2>
        <p className="text-sm text-gray-400 mt-2">
          Compares raw blockchain mints (Ethereum + Tron) against the daily net change in circulating supply.
          When the blue bar is higher than the green bar, it means Tether printed money but simultaneously burned 
          old tokens on the same day, hiding the massive mint from standard trackers.
        </p>
      </div>
      
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(val) => val ? val.substring(0, 7) : ""}
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickMargin={12}
              minTickGap={30}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => `${val}B`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#0f172a' }} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar 
              dataKey="onchainBillion" 
              name="Gross Minted (On-Chain)" 
              fill="#3b82f6" 
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="defillamaBillion" 
              name="Net Supply Change (DefiLlama)" 
              fill="#10b981" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
