import type { OrderDbRecord, Order } from '@/types';

export function isValidOrder(order: unknown): order is Order {
  if (!order || typeof order !== 'object') return false;
  
  const o = order as Order;
  return (
    typeof o.id === 'number' &&
    typeof o.number === 'string' &&
    typeof o.title === 'string' &&
    typeof o.summary === 'string' &&
    typeof o.category === 'string' &&
    (o.agency === null || typeof o.agency === 'string') &&
    typeof o.statusId === 'number' &&
    (o.link === null || typeof o.link === 'string') &&
    o.type in DocumentType &&
    o.status && typeof o.status.id === 'number' &&
    typeof o.status.name === 'string'
  );
}

export const transformOrderRecord = (record: OrderDbRecord): Order => {
  return {
    ...record,
    number: record.number ?? '',
    summary: record.summary ?? '',
    category: record.categories[0]?.name ?? '',
    agency: record.agencies[0]?.name ?? null,
    status: record.status ?? {
      id: 1,
      name: 'Unknown',
      color: null
    }
  };
};

export function getSelectValue(value: string | null | undefined): string {
  return value || 'all';
}