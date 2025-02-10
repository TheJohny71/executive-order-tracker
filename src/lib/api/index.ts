// src/lib/api/index.ts
import { OrdersResponse, OrdersQueryParams, APIResponse } from './types';

const API_BASE_URL = 'https://v7059ug59e.execute-api.us-east-2.amazonaws.com/dev';

function buildQueryString(params?: OrdersQueryParams): string {
  if (!params) return '';
  
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

export async function fetchOrders(params?: OrdersQueryParams): Promise<OrdersResponse> {
  try {
    const queryString = buildQueryString(params);
    const response = await fetch(`${API_BASE_URL}/orders${queryString}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `API Error: ${response.status}`);
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