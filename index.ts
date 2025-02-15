import chromium from '@sparticuz/chromium';
import puppeteer, { Browser } from 'puppeteer-core';
import type { LaunchOptions } from 'puppeteer-core';

const launchBrowser = async (): Promise<Browser> => {
  const executablePath = await chromium.executablePath();

  const options: LaunchOptions = {
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: true,
    ignoreHTTPSErrors: true // Changed from ignoreHTTPSErrors to match LaunchOptions type
  };

  const browser = await puppeteer.launch(options);
  return browser;
};

// Ensure browser cleanup
try {
  const browser = await launchBrowser();
  // Your browser operations here
  await browser.close();
} catch (err: unknown) {
  console.error('Browser error:', err);
  throw err;
}