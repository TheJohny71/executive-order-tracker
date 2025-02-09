import { logger } from '@/utils/logger';

// Define interfaces
export interface SpawConfig {
  url: string;
  options?: {
    waitForSelector?: string;
    javascript?: boolean;
    fullHtml?: boolean;
    premium_proxy?: boolean;
    country_code?: string;
  };
}

export interface SpawResponse {
  data: any[];
  status?: number;
  success?: boolean;
  html?: string;
  text?: string;
}

interface SpawApiError {
  error: string;
  message: string;
  statusCode: number;
}

// Constants
const SPAW_API_URL = 'https://app.scrapingbee.com/api/v1';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Helper function for delay
const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetches data from a URL using the ScrapingBee API
 * @param config - Configuration object for the request
 * @param retryCount - Current retry attempt (used internally)
 * @returns Promise containing the scraped data
 */
export async function fetchWithSpaw(config: SpawConfig, retryCount = 0): Promise<SpawResponse> {
  const apiKey = process.env.SCRAPINGBEE_API_KEY || process.env.SPAW_API_KEY;
  
  if (!apiKey) {
    throw new Error('SCRAPINGBEE_API_KEY or SPAW_API_KEY not found in environment variables');
  }

  try {
    logger.info('Attempting SPAW API request', {
      url: config.url,
      retryCount,
      options: config.options
    });

    // Setup timeout with AbortController
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT);

    try {
      // Construct API URL with parameters
      const apiUrl = new URL(SPAW_API_URL);
      apiUrl.searchParams.append('api_key', apiKey);
      apiUrl.searchParams.append('url', config.url);
      
      // Add optional parameters
      if (config.options) {
        if (config.options.javascript) {
          apiUrl.searchParams.append('render_js', 'true');
        }
        if (config.options.waitForSelector) {
          apiUrl.searchParams.append('wait_for', config.options.waitForSelector);
        }
        if (config.options.fullHtml) {
          apiUrl.searchParams.append('return_page_source', 'true');
        }
        if (config.options.premium_proxy) {
          apiUrl.searchParams.append('premium_proxy', 'true');
        }
        if (config.options.country_code) {
          apiUrl.searchParams.append('country_code', config.options.country_code);
        }
      }

      const response = await fetch(apiUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Executive-Order-Tracker/1.0'
        },
        signal: controller.signal
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage: string;
        
        try {
          const errorJson = JSON.parse(errorBody) as SpawApiError;
          errorMessage = errorJson.message || errorJson.error;
        } catch {
          errorMessage = errorBody;
        }
        
        throw new Error(`SPAW API request failed (${response.status}): ${errorMessage}`);
      }

      // Handle different response types
      const contentType = response.headers.get('content-type');
      let data: SpawResponse;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = {
          data: [],
          success: response.ok,
          status: response.status,
          text: text,
          html: contentType?.includes('text/html') ? text : undefined
        };
      }

      logger.info('SPAW API request successful', {
        status: response.status,
        contentType
      });

      return data;

    } finally {
      clearTimeout(timeout);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Error fetching data with SPAW', {
      error: errorMessage,
      retryAttempt: retryCount,
      targetUrl: config.url
    });

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${REQUEST_TIMEOUT}ms`);
    }

    if (retryCount < MAX_RETRIES) {
      const nextDelay = RETRY_DELAY * Math.pow(2, retryCount);
      logger.info(`Retrying in ${nextDelay}ms`);
      await delay(nextDelay);
      return fetchWithSpaw(config, retryCount + 1);
    }

    throw error;
  }
}

// Export an object containing all SPAW-related functions
export const whiteHouseSpaw = {
  fetchWithSpaw,
  SPAW_API_URL,
  MAX_RETRIES,
  RETRY_DELAY,
  REQUEST_TIMEOUT
};