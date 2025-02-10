// src/lib/api/index.ts
import type { OrdersResponse, OrdersQueryParams, APIResponse } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_AWS_API_URL || 'http://localhost:3000';
const API_STAGE = 'dev';

// Helper to validate and build URLs
function buildUrl(path: string, params?: Record<string, any>): URL {
  try {
    // Ensure path starts with the API stage
    const fullPath = `/${API_STAGE}${path.startsWith('/') ? path : `/${path}`}`;
    const url = new URL(fullPath, API_BASE_URL);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url;
  } catch (error) {
    console.error('URL construction error:', {
      baseUrl: API_BASE_URL,
      path,
      params,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw new Error(
      `Invalid URL construction: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Generic fetch wrapper with error handling
async function apiFetch<T>(
  path: string, 
  options?: RequestInit,
  params?: Record<string, any>
): Promise<T> {
  try {
    const url = buildUrl(path, params);
    console.log('Fetching from URL:', url.toString());

    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // If parsing json fails, use the status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API request failed:', {
      path,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

// API Methods
export async function fetchOrders(params: OrdersQueryParams = {}): Promise<OrdersResponse> {
  return apiFetch<OrdersResponse>('/orders', undefined, params);
}

export async function triggerScrape(): Promise<APIResponse<null>> {
  return apiFetch<APIResponse<null>>('/scrape', {
    method: 'POST'
  });
}

export async function markOrderAsViewed(orderId: string): Promise<APIResponse<null>> {
  return apiFetch<APIResponse<null>>('/orders/viewed', {
    method: 'POST',
    body: JSON.stringify({ orderId }),
  });
}

// Utility function to check API configuration
export function getApiConfig() {
  return {
    baseUrl: API_BASE_URL,
    stage: API_STAGE,
    isConfigured: !!process.env.NEXT_PUBLIC_AWS_API_URL,
    fullUrl: `${API_BASE_URL}/${API_STAGE}`
  };
}

// Error class for API-specific errors
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Constants for API configuration
export const API_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  MINIMUM_SEARCH_LENGTH: 3,
  DEFAULT_SORT: 'desc',
  TIMEOUT: 30000, // 30 seconds
} as const;