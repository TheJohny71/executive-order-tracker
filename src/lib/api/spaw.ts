// src/lib/api/spaw.ts
import pino from 'pino';
import pretty from 'pino-pretty';
import type { SpawResponse } from '../scraper/types';

const logger = pino(pretty({ colorize: true }));
const SPAW_API_URL = 'https://api.spaw.com/v1';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

interface SpawConfig {
  url: string;
  options?: {
    waitForSelector?: string;
    javascript?: boolean;
  };
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchWithSpaw(config: SpawConfig, retryCount = 0): Promise<SpawResponse> {
  if (!process.env.SPAW_API_KEY) {
    throw new Error('SPAW API key not found in environment variables');
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
          javascript: true,
          ...config.options
        }
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`SPAW API request failed: ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    return data as SpawResponse;

  } catch (error) {
    logger.error({ error, retryCount }, 'Error fetching data with SPAW');

    if (retryCount < MAX_RETRIES) {
      await delay(RETRY_DELAY * Math.pow(2, retryCount)); // Exponential backoff
      return fetchWithSpaw(config, retryCount + 1);
    }

    throw error;
  }
}