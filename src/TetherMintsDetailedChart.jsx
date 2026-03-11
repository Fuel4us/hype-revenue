import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell
} from 'recharts';

export default function TetherMintsDetailedChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch('/tether_mints.json')
      .then(res => res.json())
      .then(json => {
        // Sort descending so the most recent mints are at the top
        const sorted = json.sort((a, b) => b.timestamp - a.timestamp);
        const formatted = sorted.map(item => ({
          date: item.date,
          amountBillion: parseFloat((item.amount / 1e9).toFixed(1)),
          exactAmount: item.exact_diff.toLocaleString(),
          circulating: (item.circulating / 1e9).toFixed(1) + 'B'
        }));
        setData(formatted);
      })
      .catch(err => console.error("Error fetching tether mints:", err));
  }, []);

  // Calculate dynamic height based on number of events so bars don't get squished
  const chartHeight = Math.max(600, data.length * 40);

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 my-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">Tether Mint Ledger</h2>
        <p className="text-sm text-gray-500">
          A scrollable, itemized breakdown of every 1B+ mint.
        </p>
      </div>
      
      {/* Scrollable container */}
      <div className="w-full overflow-y-auto pr-2 rounded border border-gray-100" style={{ maxHeight: '500px' }}>
        <div style={{ height: `${chartHeight}px`, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 20, right: 60, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#4B5563', fontSize: 13, fontWeight: 500 }}
                width={100}
              />
              <Tooltip 
                cursor={{ fill: '#F9FAFB' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-gray-800 p-3 shadow-lg rounded text-sm text-white">
                        <p className="font-bold border-b border-gray-600 pb-1 mb-1">{payload[0].payload.date}</p>
                        <p className="text-green-400 font-semibold mb-1">
                          +{payload[0].payload.exactAmount} USDT
                        </p>
                        <p className="text-xs text-gray-400">
                          Circulating Supply: {payload[0].payload.circulating}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="amountBillion" 
                fill="#22c55e" 
                radius={[0, 4, 4, 0]} 
                barSize={20}
              >
                <LabelList 
                  dataKey="amountBillion" 
                  position="right" 
                  formatter={(val) => `+${val}B`} 
                  fill="#059669" 
                  fontSize={13}
                  fontWeight="bold"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
