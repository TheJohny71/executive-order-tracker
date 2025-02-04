// src/lib/api/whitehouse.ts
import type { ScrapedOrder } from '../scraper/types';
import { determineCategories, determineAgencies } from '../scraper/utils';

const API_BASE_URL = 'https://api.whitehouse.gov/v1';

interface WHApiResponse {
  orders: Array<{
    number: string;
    title: string;
    date: string;
    url: string;
    text: string;
  }>;
}

export async function fetchExecutiveOrders(): Promise<ScrapedOrder[]> {
  const response = await fetch(`${API_BASE_URL}/executive-orders`);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  const data: WHApiResponse = await response.json();
  
  return data.orders.map(order => ({
    type: 'Executive Order',
    orderNumber: order.number,
    title: order.title,
    date: new Date(order.date),
    url: order.url,
    summary: order.text.split('\n')[0] || '',
    agencies: determineAgencies(order.text),
    categories: determineCategories(order.text)
  }));
}