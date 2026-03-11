import React, { useState, useEffect } from 'react';
import {
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function TetherSupplyGrowthChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch('/tether_mints.json')
      .then(res => res.json())
      .then(json => {
        const formatted = json.map(item => ({
          date: item.date,
          amountBillion: parseFloat((item.amount / 1e9).toFixed(1)),
          circulatingBillion: parseFloat((item.circulating / 1e9).toFixed(1)),
          exactAmount: item.exact_diff.toLocaleString(),
        }));
        setData(formatted);
      })
      .catch(err => console.error("Error fetching tether mints:", err));
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length >= 2) {
      return (
        <div className="bg-gray-900 border border-gray-700 p-3 shadow-xl rounded-lg text-sm text-gray-200">
          <p className="font-bold text-white mb-2 pb-1 border-b border-gray-700">{label}</p>
          <p className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            Mint Size: <span className="font-bold text-emerald-400">+{payload[1].value}B USDT</span>
          </p>
          <p className="flex items-center gap-2 mt-1">
            <span className="w-3 h-3 rounded-full bg-blue-500/50"></span>
            Total Supply: <span className="font-bold text-blue-300">{payload[0].value}B</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-[#0A0A0A] rounded-xl shadow-2xl border border-gray-800 p-6 my-8">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-emerald-500">USDT</span> Supply Expansion
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Tracking the trajectory of Tether's circulating supply against massive 1B+ injection events.
        </p>
      </div>
      
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
          >
            <defs>
              <linearGradient id="colorSupply" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(val) => val ? val.substring(0, 7) : ""}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickMargin={12}
              minTickGap={40}
              axisLine={{ stroke: '#374151' }}
              tickLine={false}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => `${val}B`}
              domain={['auto', 'auto']}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#34d399', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => `+${val}B`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1f2937', opacity: 0.4 }} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            
            <Area 
              yAxisId="left"
              type="monotone" 
              dataKey="circulatingBillion" 
              name="Total Circulating Supply"
              stroke="#3b82f6" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorSupply)" 
            />
            <Bar 
              yAxisId="right"
              dataKey="amountBillion" 
              name="Mint Amount"
              fill="#10b981" 
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
