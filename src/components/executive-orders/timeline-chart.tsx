'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { Order } from '@/types';

interface TimelineChartProps {
  orders: Order[];
}

interface TimelineDataPoint {
  month: string;
  count: number;
}

export const TimelineChart: React.FC<TimelineChartProps> = ({ orders }) => {
  const timelineData = React.useMemo(() => {
    if (!orders?.length) return [];
    
    const ordersByMonth: Record<string, number> = {};
    orders.forEach(order => {
      const date = new Date(order.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      ordersByMonth[monthKey] = (ordersByMonth[monthKey] || 0) + 1;
    });

    return Object.entries(ordersByMonth)
      .map(([month, count]): TimelineDataPoint => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [orders]);

  if (!orders?.length) return null;

  return (
    <div className="h-64 w-full bg-white rounded-lg shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart 
          data={timelineData} 
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
          <XAxis 
            dataKey="month" 
            tickFormatter={(value: string) => {
              const [year, month] = value.split('-');
              return `${month}/${year.slice(2)}`;
            }}
            className="text-gray-600"
          />
          <YAxis 
            allowDecimals={false}
            className="text-gray-600"
          />
          <Tooltip 
            labelFormatter={(value: string) => {
              const [year, month] = value.split('-');
              return `${new Date(Number(year), Number(month) - 1).toLocaleString('default', { 
                month: 'long',
                year: 'numeric' 
              })}`;
            }}
            formatter={(value: number) => [`${value} orders`, 'Count']}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              padding: '0.5rem'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="count" 
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 4, fill: '#2563eb' }}
            activeDot={{ r: 6, fill: '#2563eb' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};