import { OrderDbRecord, Order } from '@/types';

export const transformOrderRecord = (record: OrderDbRecord): Order => {
  return {
    ...record,
    number: record.number ?? '',
    summary: record.summary ?? '',
    category: record.categories[0]?.name ?? '',
    agency: record.agencies[0]?.name ?? null,
    status: record.status ?? {
      id: 1,
      name: 'Unknown'
    }
  };
};