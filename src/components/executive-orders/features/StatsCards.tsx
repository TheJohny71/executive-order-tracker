// File: src/components/executive-orders/features/StatsCards.tsx
// Description: Displays statistics cards for the executive order dashboard

import React from 'react';
import { 
  BookOpen, 
  ClipboardCheck, 
  Share2, 
  Bell 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { OrderStats } from '@/types/stats';

interface StatsCardsProps {
  stats: OrderStats;
  className?: string;
}

export function StatsCards({ stats, className = '' }: StatsCardsProps) {
  const statCards = [
    {
      label: 'Active Orders',
      value: stats.activeOrders,
      icon: BookOpen,
      color: 'text-blue-500',
    },
    {
      label: 'Pending Review',
      value: stats.pendingReview,
      icon: ClipboardCheck,
      color: 'text-amber-500',
    },
    {
      label: 'New This Month',
      value: stats.newOrdersThisMonth,
      icon: Share2,
      color: 'text-green-500',
    },
    {
      label: 'Total Orders',
      value: stats.totalOrders,
      icon: Bell,
      color: 'text-purple-500',
    },
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-4 gap-6 ${className}`}>
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <h3 className="text-2xl font-bold">{stat.value}</h3>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}