// src/scraper/local-scraper.ts

import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import type { Page, Browser, LaunchOptions } from 'puppeteer-core';

import { PrismaClient, DocumentType } from '@prisma/client';
import type { ScrapedOrder } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { fileURLToPath } from 'url';
import { setTimeout } from 'timers/promises';

const prisma = new PrismaClient();
const BASE_URL = 'https://www.whitehouse.gov/briefing-room/presidential-actions/';
const RATE_LIMIT_DELAY = 1000; // 1 second delay

// Define the lower date for filtering posts
const lowerDate = new Date('2025-01-01');

interface WPPost {
  id?: number | string;
  slug?: string;
  date?: string;
  title?: {
    rendered?: string;
    raw?: string;
  } | string;
  content?: {
    rendered?: string;
    raw?: string;
  } | string;
  excerpt?: {
    rendered?: string;
    raw?: string;
  } | string;
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
        'script[data-type="wp-block-data"]'
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

    // Filter posts based on the lower date (January 1, 2025)
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
    // Return the largest array
    return possibleArrays.reduce((a: WPPost[], b: WPPost[]) => (a.length > b.length ? a : b));
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
      agencies: []
    }
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
  logger.info(`Starting scrape for presidential actions from ${lowerDate.toDateString()} onward...`);

  // Puppeteer Launch Options
  const launchOptions: LaunchOptions = {
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: true,
    dumpio: true
  };

  // Launch browser
  const browser: Browser = await puppeteer.launch(launchOptions);

  try {
    const page: Page = await browser.newPage();

    page.on('error', (error) => {
      logger.error('Page error:', error);
    });

    await page.goto(BASE_URL, {
      waitUntil: 'networkidle0',
      timeout: 30000
    }).catch((error) => {
      logger.error('Navigation failed:', error);
      throw error;
    });

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
  let hasMorePages = true;

  while (hasMorePages) {
    // Determine URL for current page
    const url = currentPage === 1 ? BASE_URL : `${BASE_URL}page/${currentPage}/`;
    logger.info(`Scraping page ${currentPage}...`);

    try {
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Rate limit to be polite
      await setTimeout(RATE_LIMIT_DELAY);

      const pageActions = await page.evaluate(() => {
        const actionElements = document.querySelectorAll('h2 a, h3 a');
        return Array.from(actionElements).map((link) => {
          const element = link as HTMLAnchorElement;
          const container = element.closest('article') || element.closest('li');

          const title = element.textContent?.trim() || '';
          const url = element.getAttribute('href') || '';

          // Attempt to get a date string from the nearest time element
          const dateElement =
            container?.querySelector('time') ||
            container?.querySelector('.date, .entry-date');
          const date = dateElement?.textContent?.trim() || '';

          return { title, url, date };
        }).filter((action) => action.title && action.url);
      });

      // Process each action by visiting its URL and fetching details
      let foundNewerPosts = false;
      for (const action of pageActions) {
        try {
          logger.info(`Visiting ${action.title}...`);
          await page.goto(action.url, {
            waitUntil: 'networkidle0',
            timeout: 30000
          });
          await setTimeout(RATE_LIMIT_DELAY);

          const details = await page.evaluate(() => {
            const content = document.body.textContent || '';
            const dateElement =
              document.querySelector('time') ||
              document.querySelector('.date, .entry-date');
            return {
              content,
              date: dateElement?.textContent?.trim()
            };
          });

          const postDate = new Date(action.date || details.date || '');
          if (isNaN(postDate.getTime()) || postDate < lowerDate) {
            logger.warn(`Skipping action "${action.title}" as its date is before ${lowerDate.toDateString()}`);
            continue;
          }

          foundNewerPosts = true; // at least one post on this page meets the criteria

          const scrapedOrder: ScrapedOrder = {
            identifier: action.url.split('/').pop() || '',
            type: determineDocumentType(action.title),
            title: action.title,
            date: postDate,
            url: action.url,
            summary: '',
            notes: null,
            content: details.content || null,
            statusId: '1',
            categories: [],
            agencies: [],
            isNew: true,
            metadata: {
              orderNumber: extractOrderNumber(action.title),
              categories: [],
              agencies: []
            }
          };

          actions.push(scrapedOrder);
        } catch (error) {
          logger.error(`Error processing action ${action.title}:`, error);
          continue;
        }
      }

      // If no actions on this page met the date criteria, assume no more newer posts exist.
      if (!foundNewerPosts) {
        logger.info(`No posts on page ${currentPage} are after ${lowerDate.toDateString()}. Ending pagination.`);
        break;
      }

      // Check if there is a next page button available
      const hasNextPage = await page.evaluate(() => {
        const nextButton = document.querySelector('.pagination-next');
        return nextButton !== null;
      });

      if (!hasNextPage) break;
      currentPage++;
    } catch (error) {
      logger.error(`Error processing page ${currentPage}:`, error);
      break;
    }
  }

  return actions;
}

// If you want to run this file directly with `ts-node src/scraper/local-scraper.ts`:
const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) {
  scrapePresidentialActions()
    .then((results) => {
      logger.info('Scraping completed successfully', {
        totalResults: results.length,
        types: results.map((r) => r.type)
      });
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Scraper execution failed:', error);
      process.exit(1);
    });
}

