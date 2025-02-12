import { handler } from './index.js';

const event = {
  path: "/api/scrape",
  httpMethod: "GET",
  headers: {
    "Content-Type": "application/json"
  }
};

async function test() {
  try {
    console.log('Testing Lambda function...');
    const response = await handler(event);
    console.log('Response:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

test();