// src/lib/api/index.ts
import type { OrdersResponse, OrdersQueryParams } from './types';

const API_BASE_URL = process.env.AWS_API_URL || 'https://v7059ug59e.execute-api.us-east-2.amazonaws.com/dev';

export const fetchOrders = async (params?: OrdersQueryParams): Promise<OrdersResponse> => {
  try {
    const queryString = params ? new URLSearchParams(Object.entries(params)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)])
    ).toString() : '';
    
    const url = `${API_BASE_URL}/orders${queryString ? `?${queryString}` : ''}`;
    
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
};

export const api = {
  orders: {
    fetch: fetchOrders
  }
};

export type Api = typeof api;