import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export const handler = async (event: any) => {
  let browser = null;

  try {
    // Configure Chromium
    chromium.setHeadlessMode = true;
    chromium.setGraphicsMode = false;

    // Launch browser
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    // Rest of your scraping code...

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: true,
        message: "Scraping completed successfully",
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        message: "Scraping failed",
        error: error.message,
      }),
    };
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
};
