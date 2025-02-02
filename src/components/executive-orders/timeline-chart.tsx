import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Order } from '@/types';

interface TimelineChartProps {
  orders: Order[];
}

export const TimelineChart = ({ orders }: TimelineChartProps) => {
  const timelineData = React.useMemo(() => {
    if (!orders) return [];
    
    const ordersByMonth: Record<string, number> = {};
    orders.forEach(order => {
      const date = new Date(order.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      ordersByMonth[monthKey] = (ordersByMonth[monthKey] || 0) + 1;
    });

    return Object.entries(ordersByMonth)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [orders]);

  return (
    <div className="h-48 bg-gray-50 rounded-lg p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={timelineData}>
          <XAxis 
            dataKey="month" 
            tickFormatter={(value) => {
              const [year, month] = value.split('-');
              return `${month}/${year.slice(2)}`;
            }}
          />
          <YAxis />
          <Tooltip 
            labelFormatter={(value) => {
              const [year, month] = value.split('-');
              return `${new Date(year, parseInt(month) - 1).toLocaleString('default', { month: 'long' })} ${year}`;
            }}
          />
          <Line 
            type="monotone" 
            dataKey="count" 
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};