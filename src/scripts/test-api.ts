import { PrismaClient } from "@prisma/client";
import { HttpRequest } from "@aws-sdk/protocol-http";
import { Sha256 } from "@aws-crypto/sha256-js";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { fromEnv } from "@aws-sdk/credential-providers";
import { logger } from "../utils/logger";
import axios, { AxiosError } from "axios";
import dotenv from "dotenv";

dotenv.config();

function debugSigningProcess(
  request: HttpRequest,
  signedRequest: any,
  awsErrorData?: string,
) {
  logger.info("=== Signing Debug Information ===");
  logger.info("Our Request:", {
    method: request.method,
    path: request.path,
    headers: request.headers,
    query: request.query,
  });

  logger.info("Our Signed Headers:", signedRequest.headers);

  if (awsErrorData) {
    logger.info("AWS Error Data:", awsErrorData);
  }
  logger.info("===============================");
}

const region = process.env.AWS_REGION || "us-east-2";
const service = "execute-api";

const signer = new SignatureV4({
  credentials: fromEnv(),
  region: region,
  service: service,
  sha256: Sha256,
  applyChecksum: true,
});

const BASE_URLS = {
  dev:
    process.env.API_BASE_URL_DEV ||
    "https://v7059ugs9e.execute-api.us-east-2.amazonaws.com/dev",
  prod:
    process.env.API_BASE_URL_PROD ||
    "https://v7059ugs9e.execute-api.us-east-2.amazonaws.com/prod",
};

async function signRequest(url: string): Promise<any> {
  const parsedUrl = new URL(url);

  const request = new HttpRequest({
    method: "GET",
    protocol: parsedUrl.protocol.replace(":", ""),
    hostname: parsedUrl.hostname,
    path: parsedUrl.pathname,
    query: Object.fromEntries(parsedUrl.searchParams),
    headers: {
      host: parsedUrl.hostname,
      "content-type": "application/json",
      "x-api-key": process.env.API_KEY_SECRET || "",
    },
  });

  return await signer.sign(request);
}

async function testEndpoint(
  env: "dev" | "prod",
  endpoint: string,
): Promise<boolean> {
  try {
    logger.info(`Testing ${env.toUpperCase()} endpoint: ${endpoint}`);

    const signedRequest = await signRequest(endpoint);
    debugSigningProcess(signedRequest, signedRequest);

    const response = await axios.get(endpoint, {
      headers: {
        ...signedRequest.headers,
        "x-api-key": process.env.API_KEY_SECRET || "",
      },
    });

    logger.info(`${env.toUpperCase()} Response:`, {
      endpoint,
      status: response.status,
      data: response.data,
    });

    return response.status >= 200 && response.status < 300;
  } catch (error) {
    if (error instanceof AxiosError) {
      logger.error(`${env.toUpperCase()} Request failed:`, {
        endpoint,
        status: error.response?.status,
        data: error.response?.data,
      });
    } else {
      logger.error(`Unknown error in ${env.toUpperCase()}:`, error);
    }
    return false;
  }
}

async function testEnvironment(env: "dev" | "prod"): Promise<boolean> {
  const baseUrl = BASE_URLS[env];
  const endpoints = [
    baseUrl,
    `${baseUrl}/orders`,
    `${baseUrl}/orders?limit=10&page=1`,
  ];

  let success = true;
  for (const endpoint of endpoints) {
    success = success && (await testEndpoint(env, endpoint));
  }
  return success;
}

async function testAwsEndpoint(): Promise<boolean> {
  logger.info("Starting AWS API tests in both dev and prod environments...");

  try {
    const credentials = await fromEnv()();
    logger.info("Credentials loaded:", {
      hasAccessKeyId: !!credentials.accessKeyId,
      hasSecretKey: !!credentials.secretAccessKey,
      hasSessionToken: !!credentials.sessionToken,
    });

    const devSuccess = await testEnvironment("dev");
    const prodSuccess = await testEnvironment("prod");

    return devSuccess && prodSuccess;
  } catch (error) {
    logger.error("Test failed with error:", error);
    return false;
  }
}

// Main execution
if (require.main === module) {
  testAwsEndpoint()
    .then((success) => {
      if (success) {
        logger.info("All tests completed successfully");
        process.exit(0);
      } else {
        logger.error("Some tests failed");
        process.exit(1);
      }
    })
    .catch((error) => {
      logger.error("Test failed:", error);
      process.exit(1);
    });
}

export { testAwsEndpoint };
