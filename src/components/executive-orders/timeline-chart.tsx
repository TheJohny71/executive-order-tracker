'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import type { Order } from '@/types';
import { DocumentType } from '@prisma/client';

interface TimelineChartProps {
  orders: Order[];
}

interface TimelineDataPoint {
  month: string;
  total: number;
  [DocumentType.EXECUTIVE_ORDER]: number;
  [DocumentType.MEMORANDUM]: number;
  [DocumentType.PROCLAMATION]: number;
}

export const TimelineChart: React.FC<TimelineChartProps> = ({ orders }) => {
  const timelineData = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    
    const ordersByMonth: Record<string, TimelineDataPoint> = {};
    
    orders.forEach(order => {
      if (!order.datePublished) return;
      
      const date = new Date(order.datePublished);
      const year = date.getFullYear().toString();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const monthKey = `${year}-${month}`;
      
      if (!ordersByMonth[monthKey]) {
        ordersByMonth[monthKey] = {
          month: monthKey,
          total: 0,
          [DocumentType.EXECUTIVE_ORDER]: 0,
          [DocumentType.MEMORANDUM]: 0,
          [DocumentType.PROCLAMATION]: 0
        };
      }
      
      ordersByMonth[monthKey].total += 1;
      if (order.type) {
        ordersByMonth[monthKey][order.type] += 1;
      }
    });

    return Object.values(ordersByMonth)
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [orders]);

  if (!orders || orders.length === 0) return null;

  const formatMonth = (value: string): string => {
    const [year, month] = value.split('-');
    if (!year || !month) return '';
    return `${month}/${year.slice(2)}`;
  };

  const formatTooltipLabel = (value: string): string => {
    const [year, month] = value.split('-');
    if (!year || !month) return '';
    return new Date(Number(year), Number(month) - 1).toLocaleString('default', { 
      month: 'long',
      year: 'numeric' 
    });
  };

  const formatTooltipValue = (value: number, name: string): [string, string] => {
    switch (name) {
      case DocumentType.EXECUTIVE_ORDER:
        return [`${value} Executive Orders`, ''];
      case DocumentType.MEMORANDUM:
        return [`${value} Memoranda`, ''];
      case DocumentType.PROCLAMATION:
        return [`${value} Proclamations`, ''];
      default:
        return [`${value}`, name];
    }
  };

  return (
    <div className="h-64 w-full bg-white rounded-lg shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={timelineData} 
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
          <XAxis 
            dataKey="month" 
            tickFormatter={formatMonth}
            className="text-gray-600"
          />
          <YAxis 
            allowDecimals={false}
            className="text-gray-600"
          />
          <Tooltip 
            labelFormatter={formatTooltipLabel}
            formatter={formatTooltipValue}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              padding: '0.5rem'
            }}
          />
          <Legend />
          <Bar 
            name="Executive Orders"
            dataKey={DocumentType.EXECUTIVE_ORDER}
            stackId="a"
            fill="#2563eb"
          />
          <Bar 
            name="Memoranda"
            dataKey={DocumentType.MEMORANDUM}
            stackId="a"
            fill="#60a5fa"
          />
          <Bar 
            name="Proclamations"
            dataKey={DocumentType.PROCLAMATION}
            stackId="a"
            fill="#93c5fd"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};