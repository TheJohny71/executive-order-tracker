// src/lib/api/index.ts
import { OrdersResponse, OrdersQueryParams } from './types';

const API_BASE_URL = process.env.AWS_API_URL || 'https://v7059ug59e.execute-api.us-east-2.amazonaws.com/dev';

export async function fetchOrders(params?: OrdersQueryParams): Promise<OrdersResponse> {
  try {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    const url = queryString ? `${API_BASE_URL}/orders?${queryString}` : `${API_BASE_URL}/orders`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    return data as OrdersResponse;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
}

export const api = {
  orders: {
    fetch: fetchOrders
  }
};