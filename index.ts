import chromium from '@sparticuz/chromium';
import type { Browser, LaunchOptions } from 'puppeteer-core';
import puppeteer from 'puppeteer-core';

const launchBrowser = async (): Promise<Browser> => {
  const executablePath = await chromium.executablePath();

  const options = {
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: true,
    ignoreHTTPSErrors: true
  } as LaunchOptions;

  const browser = await puppeteer.launch(options);
  return browser;
};

// Wrap the browser operations in an async function
const runBrowserOperations = async () => {
  try {
    const browser = await launchBrowser();
    // Your browser operations here
    await browser.close();
  } catch (err: unknown) {
    console.error('Browser error:', err);
    throw err;
  }
};

// Export the functions
export { launchBrowser, runBrowserOperations };

// If running this file directly
if (require.main === module) {
  runBrowserOperations().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}