import { PrismaClient } from '@prisma/client';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { fromEnv } from '@aws-sdk/credential-providers';
import { logger } from '../utils/logger.js';
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

const region = process.env.AWS_REGION || "us-east-2";
const service = "execute-api";

// Create signer with debug capabilities
const signer = new SignatureV4({
  credentials: fromEnv(),
  region: region,
  service: service,
  sha256: Sha256,
  applyChecksum: true
});

const BASE_URL = "https://v7059ugs9e.execute-api.us-east-2.amazonaws.com/dev";

const testEndpoints = [
  // Test dev environment endpoints
  `${BASE_URL}`,                        // Base health check
  `${BASE_URL}/orders`,                 // Orders endpoint
  `${BASE_URL}/orders?limit=10&page=1`  // Orders with pagination
];

async function testAwsEndpoint(): Promise<boolean> {
  logger.info('Starting AWS API test in dev environment...');
  
  // Verify credentials are loaded
  const credentials = await fromEnv()();
  logger.info('Credentials loaded:', {
    hasAccessKeyId: !!credentials.accessKeyId,
    hasSecretKey: !!credentials.secretAccessKey,
    hasSessionToken: !!credentials.sessionToken
  });

  let successfulEndpoint = false;

  for (const endpoint of testEndpoints) {
    let request: HttpRequest | null = null;
    let signedRequest: any = null;
    
    try {
      logger.info(`Testing endpoint: ${endpoint}`);
      
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
        headers: signedRequest.headers
      });
      
      logger.info('AWS Response:', {
        endpoint,
        status: response.status,
        headers: response.headers,
        data: response.data
      });

      // Check if it's a health check response
      if (response.data.body) {
        const parsedBody = JSON.parse(response.data.body);
        if (parsedBody.message === "Executive Orders API is working!") {
          logger.info('Successfully received health check response');
          successfulEndpoint = true;
          continue;
        }
      }

      successfulEndpoint = true;

    } catch (error) {
      if (error instanceof AxiosError && error.response?.data && request && signedRequest) {
        debugSigningProcess(request, signedRequest, error.response.data);
        
        logger.error('Request failed:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      } else {
        logger.error('Unknown error:', error);
      }
      continue;
    }
  }

  if (!successfulEndpoint) {
    logger.error('All endpoints failed testing');
    return false;
  }

  logger.info('Dev environment API test completed successfully');
  return true;
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