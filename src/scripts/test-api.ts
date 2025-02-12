import { PrismaClient } from '@prisma/client';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { fromEnv } from '@aws-sdk/credential-providers';
import { logger } from '../utils/logger';
import axios, { AxiosError } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Debug function to compare our signing details with AWS expectations
function debugSigningProcess(request: HttpRequest, signedRequest: any, awsErrorData?: string) {
  logger.info('=== Signing Debug Information ===');
  logger.info('Our Request:', {
    method: request.method,
    path: request.path,
    headers: request.headers,
  });
  
  logger.info('Our Signed Headers:', signedRequest.headers);
  
  if (awsErrorData) {
    const errorLines = awsErrorData.split('\n');
    const expectedCanonical = errorLines
      .slice(errorLines.indexOf('The Canonical String for this request should have been') + 1,
             errorLines.indexOf('The String-to-Sign should have been'))
      .join('\n');
    
    logger.info('AWS Expected Canonical String:', expectedCanonical);
  }
  logger.info('===============================');
}

// Load environment variables
const region = process.env.AWS_REGION || "us-east-2";
const service = "execute-api";

// Define base URLs for both environments
const BASE_URLS = {
  dev: process.env.API_BASE_URL_DEV || "https://v7059ugs9e.execute-api.us-east-2.amazonaws.com/dev",
  prod: process.env.API_BASE_URL_PROD || "https://v7059ugs9e.execute-api.us-east-2.amazonaws.com/prod"
};

// Validate required environment variables
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  logger.error('AWS credentials not found in environment variables');
  process.exit(1);
}

// Create signer with debug capabilities
const signer = new SignatureV4({
  credentials: fromEnv(),
  region: region,
  service: service,
  sha256: Sha256,
  applyChecksum: true
});

// Define test endpoints for both environments
const testEndpoints = {
  dev: [
    `${BASE_URLS.dev}`,                        // Base health check
    `${BASE_URLS.dev}/orders`,                 // Orders endpoint
    `${BASE_URLS.dev}/orders?limit=10&page=1`  // Orders with pagination
  ],
  prod: [
    `${BASE_URLS.prod}`,                        // Base health check
    `${BASE_URLS.prod}/orders`,                 // Orders endpoint
    `${BASE_URLS.prod}/orders?limit=10&page=1`  // Orders with pagination
  ]
};

async function testEnvironment(env: 'dev' | 'prod', endpoints: string[]): Promise<boolean> {
  let successfulEndpoint = false;

  for (const endpoint of endpoints) {
    let request: HttpRequest | null = null;
    let signedRequest: any = null;
    
    try {
      logger.info(`Testing ${env.toUpperCase()} endpoint: ${endpoint}`);
      
      const url = new URL(endpoint);
      
      request = new HttpRequest({
        method: "GET",
        protocol: url.protocol.replace(':', ''),
        hostname: url.hostname,
        path: url.pathname + url.search,
        headers: {
          host: url.hostname,
          'content-type': 'application/json',
        }
      });

      signedRequest = await signer.sign(request);
      
      // Debug signing process
      debugSigningProcess(request, signedRequest);
      
      const response = await axios.get(endpoint, {
        headers: signedRequest.headers,
        validateStatus: null // Allow any status code to be handled in the catch block
      });
      
      logger.info(`${env.toUpperCase()} Response:`, {
        endpoint,
        status: response.status,
        headers: response.headers,
        data: response.data
      });

      // Check if it's a health check response
      if (response.data.body) {
        try {
          const parsedBody = JSON.parse(response.data.body);
          if (parsedBody.message === "Executive Orders API is working!") {
            logger.info(`Successfully received health check response from ${env.toUpperCase()}`);
            successfulEndpoint = true;
            continue;
          }
        } catch (parseError) {
          logger.warn(`Failed to parse response body from ${env.toUpperCase()}:`, response.data.body);
        }
      }

      // If we get here and the status is 200, consider it successful
      if (response.status >= 200 && response.status < 300) {
        successfulEndpoint = true;
      }

    } catch (error) {
      if (error instanceof AxiosError && error.response?.data && request && signedRequest) {
        debugSigningProcess(request, signedRequest, error.response.data);
        
        logger.error(`${env.toUpperCase()} Request failed:`, {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      } else {
        logger.error(`Unknown error in ${env.toUpperCase()}:`, error);
      }
      continue;
    }
  }

  return successfulEndpoint;
}

async function testAwsEndpoint(): Promise<boolean> {
  logger.info('Starting AWS API tests in both dev and prod environments...');
  
  try {
    // Verify credentials are loaded
    const credentials = await fromEnv()();
    logger.info('Credentials loaded:', {
      hasAccessKeyId: !!credentials.accessKeyId,
      hasSecretKey: !!credentials.secretAccessKey,
      hasSessionToken: !!credentials.sessionToken
    });

    // Test DEV environment
    logger.info('Testing DEV environment...');
    const devSuccess = await testEnvironment('dev', testEndpoints.dev);
    
    // Test PROD environment
    logger.info('Testing PROD environment...');
    const prodSuccess = await testEnvironment('prod', testEndpoints.prod);

    if (!devSuccess) {
      logger.error('DEV environment tests failed');
    }
    if (!prodSuccess) {
      logger.error('PROD environment tests failed');
    }

    return devSuccess && prodSuccess;

  } catch (error) {
    logger.error('Test failed with error:', error);
    return false;
  }
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

// Execute the test
if (await isMainModule()) {
  testAwsEndpoint()
    .then((success) => {
      if (success) {
        logger.info('All tests completed successfully');
        process.exit(0);
      } else {
        logger.error('Some tests failed');
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