// src/lib/api/index.ts
import type { OrdersResponse, OrdersQueryParams, APIResponse } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_AWS_API_URL || 'http://localhost:3000';

export async function fetchOrders(params: OrdersQueryParams = {}): Promise<OrdersResponse> {
  try {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const url = new URL('/api/orders', API_BASE_URL);
    url.search = searchParams.toString();
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Failed to fetch orders: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
}

export async function triggerScrape(): Promise<APIResponse<null>> {
  const url = new URL('/api/scrape', API_BASE_URL);
  const response = await fetch(url.toString());
  
  if (!response.ok) {
    throw new Error(`Failed to trigger scrape: ${response.statusText}`);
  }

  return response.json();
}

export async function markOrderAsViewed(orderId: string): Promise<APIResponse<null>> {
  const url = new URL('/api/orders', API_BASE_URL);
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ orderId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to mark order as viewed: ${response.statusText}`);
  }

  return response.json();
}