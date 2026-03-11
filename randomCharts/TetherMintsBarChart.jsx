import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label
} from 'recharts';

export default function TetherMintsChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch('/tether_mints.json')
      .then(res => res.json())
      .then(json => {
        // Format the data for the chart
        const formatted = json.map(item => ({
          date: item.date,
          amountBillion: parseFloat((item.amount / 1e9).toFixed(1)),
          exactAmount: item.exact_diff.toLocaleString(),
          circulating: (item.circulating / 1e9).toFixed(1) + 'B'
        }));
        setData(formatted);
      })
      .catch(err => console.error("Error fetching tether mints:", err));
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded text-sm">
          <p className="font-bold text-gray-800 mb-1">{label}</p>
          <p className="text-green-600 font-semibold">
            Minted: +{payload[0].value}B USDT
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Total Supply: {payload[0].payload.circulating}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 my-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">1B+ USDT Tether Mints Since 2021</h2>
        <p className="text-sm text-gray-500">
          Showing every single massive Tether mint event (&gt;1B) starting from Jan 1, 2021.
        </p>
      </div>
      
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(val) => (val ? val.substring(0, 7) : "")} // Show YYYY-MM
              tick={{ fill: '#6B7280', fontSize: 12 }}
              tickMargin={10}
              minTickGap={30}
              axisLine={{ stroke: '#D1D5DB' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => `${val}B`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="amountBillion" 
              fill="#22c55e" 
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
