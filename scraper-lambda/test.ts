import { handler } from './index.js';
import type { APIGatewayProxyEvent } from 'aws-lambda';

const mockEvent: APIGatewayProxyEvent = {
  httpMethod: 'GET',
  path: '/scrape',
  headers: {},
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  pathParameters: null,
  stageVariables: null,
  requestContext: {} as any,
  resource: '',
  multiValueHeaders: {},
  isBase64Encoded: false,
  body: null
};

async function test() {
  try {
    console.log('Testing Lambda function...');
    const response = await handler(mockEvent);
    console.log('Response:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

test();