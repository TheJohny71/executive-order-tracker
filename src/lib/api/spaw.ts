import pino from 'pino';
import pretty from 'pino-pretty';
import type { SpawResponse } from '../scraper/types';

const logger = pino(pretty({ colorize: true }));
const SPAW_API_URL = 'https://api.spyscape.com/v1'; // or whatever the correct endpoint is
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
    const response = await fetch(SPAW_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SPAW_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: config.url,
        options: {
          javascript: config.options?.javascript ?? true,
          waitForSelector: config.options?.waitForSelector
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
    return data as SpawResponse;

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      retryCount,
      url: config.url
    }, 'Error fetching data with SPAW');

    if (retryCount < MAX_RETRIES) {
      await delay(RETRY_DELAY * Math.pow(2, retryCount)); // Exponential backoff
      return fetchWithSpaw(config, retryCount + 1);
    }

    throw error;
  }
}