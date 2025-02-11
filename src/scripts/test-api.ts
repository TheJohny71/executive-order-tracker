import { DocumentType } from '@prisma/client';
import { logger } from '../utils/logger';
import axios from 'axios';
import dotenv from 'dotenv';
import type { OrdersResponse, Order } from '../types';

dotenv.config();

async function testAwsEndpoint(): Promise<boolean> {
  logger.info('Starting AWS API test...');
  
  const endpoint = process.env.AWS_API_ENDPOINT;
  if (!endpoint) {
    throw new Error('AWS_API_ENDPOINT not configured');
  }

  try {
    const response = await axios.get(endpoint);
    
    logger.info('AWS Response:', {
      status: response.status,
      headers: response.headers,
      data: response.data
    });

    let data: OrdersResponse;
    
    if (response.data.body) {
      try {
        const parsedBody = JSON.parse(response.data.body);
        logger.info('Parsed body:', parsedBody);
        
        if (parsedBody.message === "Executive Orders API is working!") {
          logger.warn('Received health check response instead of data');
          return false;
        }
        
        data = parsedBody;
      } catch (parseError) {
        logger.error('Failed to parse response body:', parseError);
        return false;
      }
    } else {
      data = response.data;
    }

    const validationResult = validateAPIResponse(data);
    if (!validationResult.valid) {
      logger.error('Response validation failed:', validationResult.errors);
      return false;
    }

    logger.info('AWS API test completed successfully');
    return true;

  } catch (error) {
    logger.error('AWS API test failed:', error);
    throw error;
  }
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateAPIResponse(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid response data'] };
  }

  const response = data as OrdersResponse;

  if (!Array.isArray(response.orders)) {
    errors.push('Missing or invalid orders array');
  }

  if (!response.metadata || typeof response.metadata !== 'object') {
    errors.push('Missing or invalid metadata');
  }

  if (!response.pagination || typeof response.pagination !== 'object') {
    errors.push('Missing or invalid pagination');
  } else {
    const { total, page, limit, hasMore } = response.pagination;
    if (typeof total !== 'number') errors.push('Invalid pagination.total');
    if (typeof page !== 'number') errors.push('Invalid pagination.page');
    if (typeof limit !== 'number') errors.push('Invalid pagination.limit');
    if (typeof hasMore !== 'boolean') errors.push('Invalid pagination.hasMore');
  }

  if (response.orders?.length > 0) {
    const orderErrors = validateOrder(response.orders[0]);
    errors.push(...orderErrors);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function validateOrder(order: unknown): string[] {
  const errors: string[] = [];
  
  if (!order || typeof order !== 'object') {
    return ['Invalid order data'];
  }

  const typedOrder = order as Order;

  if (typeof typedOrder.id !== 'number') {
    errors.push('Invalid order.id');
  }
  if (!Object.values(DocumentType).includes(typedOrder.type)) {
    errors.push('Invalid order.type');
  }
  if (typeof typedOrder.title !== 'string') {
    errors.push('Invalid order.title');
  }
  if (!(typedOrder.datePublished instanceof Date)) {
    errors.push('Invalid order.datePublished');
  }

  return errors;
}

async function isMainModule(): Promise<boolean> {
  try {
    if (typeof process === 'undefined' || !process.argv[1]) {
      return false;
    }
    const scriptUrl = new URL(process.argv[1], 'file://').href;
    return import.meta.url === scriptUrl;
  } catch {
    return false;
  }
}

if (await isMainModule()) {
  testAwsEndpoint()
    .then((success) => {
      if (success) {
        logger.info('Test completed successfully');
        process.exit(0);
      } else {
        logger.error('Test failed');
        process.exit(1);
      }
    })
    .catch((error) => {
      logger.error('Test failed:', error);
      process.exit(1);
    });
}

export { testAwsEndpoint };