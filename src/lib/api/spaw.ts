import { logger } from '@/utils/logger';
import type { SpawResponse } from '../scraper/types';

const SPAW_API_URL = 'https://api.spawapp.com/v1';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export interface SpawConfig {
  url: string;
  options?: {
    waitForSelector?: string;
    javascript?: boolean;
  };
}

interface SpawApiError {
  error: string;
  message: string;
  statusCode: number;
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchWithSpaw(config: SpawConfig, retryCount = 0): Promise<SpawResponse> {
  if (!process.env.SPAW_API_KEY) {
    throw new Error('SPAW_API_KEY not found in environment variables');
  }

  try {
    logger.info('Attempting SPAW API request', {
      url: config.url,
      retryCount
    });

    const response = await fetch(SPAW_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SPAW_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Executive-Order-Tracker/1.0'
      },
      body: JSON.stringify({
        url: config.url,
        options: {
          javascript: config.options?.javascript ?? true,
          waitForSelector: config.options?.waitForSelector,
          timeout: 30000
        }
      })
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

    const data = await response.json();
    logger.info('SPAW API request successful');
    return data as SpawResponse;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Error fetching data with SPAW', {
      error: errorMessage,
      retryAttempt: retryCount,
      targetUrl: config.url
    });

    if (retryCount < MAX_RETRIES) {
      const nextDelay = RETRY_DELAY * Math.pow(2, retryCount);
      logger.info(`Retrying in ${nextDelay}ms`);
      await delay(nextDelay);
      return fetchWithSpaw(config, retryCount + 1);
    }

    throw error;
  }
}