// src/scraper/local-scraper.ts

import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import type { Page, Browser, LaunchOptions, PuppeteerLifeCycleEvent } from 'puppeteer-core';

import { PrismaClient, DocumentType } from '@prisma/client';
import type { ScrapedOrder } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { fileURLToPath } from 'url';
import { setTimeout } from 'timers/promises';

const prisma = new PrismaClient();
const BASE_URL = 'https://www.whitehouse.gov/briefing-room/presidential-actions/';
const RATE_LIMIT_DELAY = 1000; // 1 second delay
const lowerDate = new Date('2025-01-01'); // Filter: January 1, 2025 onward

/**
 * Define a custom interface for the goto options
 * that includes waitUntil and timeout, matching Puppeteer's usage.
 */
interface SafeGotoOptions {
  waitUntil?: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[];
  timeout?: number;
}

/**
 * A helper function to safely navigate to a URL with:
 * - A higher timeout (60s instead of 30s)
 * - waitUntil: "networkidle2"
 * - Up to 2 retries in case of transient errors or slow loads
 */
async function safeGoto(
  page: Page,
  url: string,
  options: SafeGotoOptions,
  retries = 2
): Promise<void> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await page.goto(url, options);
      return; // If successful, just return
    } catch (error: any) {
      if (attempt === retries) {
        // We've exhausted all retries
        throw error;
      }
      logger.warn(`Failed to load ${url} (attempt ${attempt + 1}). Retrying...`);
    }
  }
}

interface WPPost {
  id?: number | string;
  slug?: string;
  date?: string;
  title?: { rendered?: string; raw?: string } | string;
  content?: { rendered?: string; raw?: string } | string;
  excerpt?: { rendered?: string; raw?: string } | string;
  link?: string;
  url?: string;
}

interface WPBlockData {
  posts?: WPPost[];
  items?: WPPost[];
  data?: WPPost[];
  [key: string]: any;
}

async function extractJsonData(page: Page): Promise<ScrapedOrder[] | null> {
  try {
    const jsonData = await page.evaluate(() => {
      const selectors = [
        'script[data-js="block-query:wp-loop"]',
        'script[type="application/json"]',
        'script#wp-block-data',
        'script[data-type="wp-block-data"]',
      ];
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
          try {
            return JSON.parse(element.textContent);
          } catch {
            continue;
          }
        }
      }
      return null;
    });

    if (!jsonData) {
      logger.debug('No JSON data found in script tags');
      return null;
    }

    logger.info('Found JSON data in script tag, processing...');
    logger.debug(
      'Initial JSON Structure:',
      JSON.stringify(jsonData, null, 2).slice(0, 500) + '...'
    );

    const posts = extractPosts(jsonData);
    if (!posts || !Array.isArray(posts)) {
      logger.warn('Could not find posts array in JSON data');
      return null;
    }

    // Filter posts based on lowerDate
    return posts
      .filter((post) => {
        try {
          const postDate = new Date(post.date || '');
          return !isNaN(postDate.getTime()) && postDate >= lowerDate;
        } catch (error) {
          logger.warn(`Invalid date for post: ${post.id}`, error);
          return false;
        }
      })
      .map(transformWPPostToScrapedOrder);
  } catch (error) {
    logger.error('Error extracting JSON data:', error);
    return null;
  }
}

function extractPosts(data: WPBlockData): WPPost[] | null {
  if (Array.isArray(data)) return data;
  if (data.posts) return data.posts;
  if (data.items) return data.items;
  if (data.data) return data.data;

  const possibleArrays = Object.values(data).filter(Array.isArray);
  if (possibleArrays.length > 0) {
    return possibleArrays.reduce((a: WPPost[], b: WPPost[]) =>
      a.length > b.length ? a : b
    );
  }
  return null;
}

function getStringValue(
  field: string | { rendered?: string; raw?: string } | undefined
): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field.rendered || field.raw || '';
}

function transformWPPostToScrapedOrder(post: WPPost): ScrapedOrder {
  const title = getStringValue(post.title);
  const content = getStringValue(post.content);
  const excerpt = getStringValue(post.excerpt);

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '');

  return {
    identifier: post.id?.toString() || post.slug || '',
    type: determineDocumentType(title),
    title: stripHtml(title),
    date: new Date(post.date || ''),
    url: post.link || post.url || '',
    summary: stripHtml(excerpt),
    notes: null,
    content: stripHtml(content),
    statusId: '1',
    categories: [],
    agencies: [],
    isNew: true,
    metadata: {
      orderNumber: extractOrderNumber(title),
      categories: [],
      agencies: [],
    },
  };
}

function extractOrderNumber(title: string): string | undefined {
  const match = title.match(/\b(?:Executive Order|EO)\s+(\d+)\b/i);
  return match?.[1];
}

function determineDocumentType(title: string): DocumentType {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('executive order')) {
    return DocumentType.EXECUTIVE_ORDER;
  } else if (lowerTitle.includes('memorandum')) {
    return DocumentType.MEMORANDUM;
  } else if (lowerTitle.includes('proclamation')) {
    return DocumentType.PROCLAMATION;
  }
  return DocumentType.EXECUTIVE_ORDER;
}

export async function scrapePresidentialActions(): Promise<ScrapedOrder[]> {
  logger.info(
    `Starting scrape for presidential actions from ${lowerDate.toDateString()} onward...`
  );

  const launchOptions: LaunchOptions = {
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: true,
    dumpio: true,
  };

  const browser: Browser = await puppeteer.launch(launchOptions);

  try {
    const page: Page = await browser.newPage();
    page.on('error', (error) => {
      logger.error('Page error:', error);
    });

    // Use safeGoto with increased timeout + "networkidle2"
    await safeGoto(page, BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // Try extracting JSON data first
    const jsonActions = await extractJsonData(page);
    if (jsonActions && jsonActions.length > 0) {
      logger.info(`Successfully extracted ${jsonActions.length} actions from JSON data`);
      return jsonActions;
    }

    logger.info('No JSON data found or empty results, falling back to HTML scraping...');
    return await scrapeFromHtml(page);
  } finally {
    await browser.close();
  }
}

async function scrapeFromHtml(page: Page): Promise<ScrapedOrder[]> {
  const actions: ScrapedOrder[] = [];
  let currentPage = 1;

  while (true) {
    const url = currentPage === 1 ? BASE_URL : `${BASE_URL}page/${currentPage}/`;
    logger.info(`Scraping page ${currentPage}...`);

    try {
      await safeGoto(page, url, { waitUntil: 'networkidle2', timeout: 60000 });
      await setTimeout(RATE_LIMIT_DELAY);

      const pageActions: Array<{ title: string; url: string; date: string }> =
        await page.evaluate(() => {
          const actionElements = document.querySelectorAll('h2 a, h3 a');
          return Array.from(actionElements)
            .map((link) => {
              const element = link as HTMLAnchorElement;
              const container =
                element.closest('article') || element.closest('li');
              const title = element.textContent?.trim() || '';
              const url = element.getAttribute('href') || '';
              const dateElement =
                container?.querySelector('time') ||
                container?.querySelector('.date, .entry-date');
              const date = dateElement?.textContent?.trim() || '';
              return { title, url, date };
            })
            .filter((action) => action.title && action.url);
        });

      // If no actions found, end pagination
      if (pageActions.length === 0) {
        logger.info(`No actions found on page ${currentPage}. Ending pagination.`);
        break;
      }

      let qualifyingCount = 0;
      for (const action of pageActions) {
        const postDate = new Date(action.date);
        if (isNaN(postDate.getTime()) || postDate < lowerDate) {
          logger.warn(
            `Skipping "${action.title}" as its date (${action.date}) is before ${lowerDate.toDateString()}`
          );
          continue;
        }
        qualifyingCount++;

        try {
          logger.info(`Visiting "${action.title}"...`);
          await safeGoto(page, action.url, { waitUntil: 'networkidle2', timeout: 60000 });
          await setTimeout(RATE_LIMIT_DELAY);

          const details = await page.evaluate(() => {
            const content = document.body.textContent || '';
            const dateElement =
              document.querySelector('time') ||
              document.querySelector('.date, .entry-date');
            return {
              content,
              date: dateElement?.textContent?.trim() || '',
            };
          });

          const scrapedOrder: ScrapedOrder = {
            identifier: action.url.split('/').pop() || '',
            type: determineDocumentType(action.title),
            title: action.title,
            date: postDate,
            url: action.url,
            summary: '', // Adjust if needed
            notes: null,
            content: details.content || null,
            statusId: '1',
            categories: [],
            agencies: [],
            isNew: true,
            metadata: {
              orderNumber: extractOrderNumber(action.title),
              categories: [],
              agencies: [],
            },
          };

          actions.push(scrapedOrder);
        } catch (error) {
          logger.error(`Error processing action "${action.title}":`, error);
          continue;
        }
      }

      // If no qualifying posts on this page, future pages are likely older
      if (qualifyingCount === 0) {
        logger.info(`No qualifying posts on page ${currentPage}. Ending pagination.`);
        break;
      }

      currentPage++;
    } catch (error) {
      logger.error(`Error processing page ${currentPage}:`, error);
      break;
    }
  }

  return actions;
}

async function saveNewOrders(scrapedOrders: ScrapedOrder[]) {
  try {
    // 1. Retrieve existing orders by their unique "number" field
    const existingOrders = await prisma.order.findMany({
      select: { number: true },
    });
    const existingNumbers = new Set(existingOrders.map((o) => o.number));

    // 2. Filter to only new orders
    const newOrders = scrapedOrders.filter(
      (item) => !existingNumbers.has(item.identifier)
    );
    logger.info(`Found ${newOrders.length} new orders to insert.`);

    // 3. Map fields from ScrapedOrder to your "Order" model
    const mappedOrders = newOrders.map((item) => ({
      number: item.identifier, // "identifier" => "number"
      type: item.type,
      title: item.title,
      summary: item.summary,
      datePublished: item.date,
      link: item.url,
      statusId: 1, // Adjust if needed
    }));

    if (mappedOrders.length > 0) {
      await prisma.order.createMany({
        data: mappedOrders,
        skipDuplicates: true,
      });
      logger.info(`Inserted ${mappedOrders.length} new orders into the database.`);
    } else {
      logger.info('No new orders to insert.');
    }
  } catch (error) {
    logger.error('Error saving new orders:', error);
  }
}

// If running directly with ts-node:
const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) {
  scrapePresidentialActions()
    .then(async (results) => {
      logger.info('Scraping completed successfully', {
        totalResults: results.length,
        types: results.map((r) => r.type),
      });
      await saveNewOrders(results);
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Scraper execution failed:', error);
      process.exit(1);
    });
}
