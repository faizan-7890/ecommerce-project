'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AdminChartProps {
  data: { date: string; revenue: number }[];
}

export default function AdminChart({ data }: AdminChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-80 flex-col rounded-2xl border border-slate-900 bg-slate-900/40 p-6">
        <h3 className="mb-6 text-base font-bold text-white">Revenue Trend</h3>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-slate-500">No sales recorded for this period.</p>
        </div>
      </div>
    );
  }

  const formattedData = data.map(item => {
    // Treat date as UTC so timezone shift doesn't roll it back a day
    const [year, month, day] = item.date.split('-');
    const d = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    return { ...item, displayDate: dateStr };
  });

  return (
    <div className="h-80 w-full rounded-2xl border border-slate-900 bg-slate-900/40 p-6">
      <h3 className="mb-6 text-base font-bold text-white">Revenue Trend</h3>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={formattedData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="displayDate" 
              stroke="#64748b" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              dy={10}
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px', color: '#f8fafc' }}
              itemStyle={{ color: '#c084fc', fontWeight: 'bold' }}
              labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#a855f7" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
