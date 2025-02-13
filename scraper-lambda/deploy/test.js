import { handler } from "./index.js";
const event = {
  path: "/api/scrape",
  httpMethod: "GET",
  headers: {
    "Content-Type": "application/json",
  },
};
async function test() {
  try {
    console.log("Testing Lambda function...");
    const response = await handler(event);
    console.log("Response:", JSON.stringify(response, null, 2));
  } catch (error) {
    console.error("Test failed:", error);
    // Log the full error stack trace in development
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
    }
  }
}
test();
//# sourceMappingURL=test.js.map
