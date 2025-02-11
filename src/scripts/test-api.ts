import { DocumentType } from '@prisma/client';
import { logger } from '../utils/logger';
import axios, { AxiosError } from 'axios';
import dotenv from 'dotenv';
import type { OrdersResponse, Order } from '../types';

dotenv.config();

const testEndpoints = [
  // Test base endpoints
  `${process.env.AWS_API_ENDPOINT}orders`,
  `${process.env.AWS_API_ENDPOINT}api/orders`,
  // Test with query params
  `${process.env.AWS_API_ENDPOINT}orders?limit=10&page=1`,
  `${process.env.AWS_API_ENDPOINT}api/orders?limit=10&page=1`,
  // Test alternate formats
  `${process.env.NEXT_PUBLIC_AWS_API_URL}/prod/orders`,
  `${process.env.NEXT_PUBLIC_AWS_API_URL}/prod/api/orders`
];

async function testAwsEndpoint(): Promise<boolean> {
  logger.info('Starting AWS API test...');
  
  if (!process.env.AWS_API_ENDPOINT) {
    throw new Error('AWS_API_ENDPOINT not configured');
  }

  let successfulEndpoint = false;

  for (const endpoint of testEndpoints) {
    try {
      logger.info(`Testing endpoint: ${endpoint}`);
      const response = await axios.get(endpoint);
      
      logger.info('AWS Response:', {
        endpoint,
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
            continue;
          }
          
          data = parsedBody;
        } catch (parseError) {
          if (parseError instanceof Error) {
            logger.error('Failed to parse response body:', parseError.message);
          } else {
            logger.error('Failed to parse response body:', String(parseError));
          }
          continue;
        }
      } else {
        data = response.data;
      }

      const validationResult = validateAPIResponse(data);
      if (!validationResult.valid) {
        logger.error('Response validation failed:', validationResult.errors);
        continue;
      }

      logger.info(`Endpoint ${endpoint} test completed successfully`);
      successfulEndpoint = true;
      break;

    } catch (error) {
      if (error instanceof AxiosError) {
        logger.warn(`Failed testing endpoint ${endpoint}:`, {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText
        });
      } else if (error instanceof Error) {
        logger.warn(`Failed testing endpoint ${endpoint}:`, error.message);
      } else {
        logger.warn(`Failed testing endpoint ${endpoint}:`, String(error));
      }
      continue;
    }
  }

  if (!successfulEndpoint) {
    logger.error('All endpoints failed testing');
    return false;
  }

  logger.info('AWS API test completed successfully');
  return true;
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
      if (error instanceof Error) {
        logger.error('Test failed:', error.message);
      } else {
        logger.error('Test failed:', String(error));
      }
      process.exit(1);
    });
}

export { testAwsEndpoint };