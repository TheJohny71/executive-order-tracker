import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { PrismaClient, DocumentType } from '@prisma/client';
import type { ScrapedOrder } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { fileURLToPath } from 'url';
import { setTimeout } from 'timers/promises';

const prisma = new PrismaClient();
const BASE_URL = 'https://www.whitehouse.gov/briefing-room/presidential-actions/';
const CURRENT_YEAR = new Date().getFullYear();
const RATE_LIMIT_DELAY = 1000; // 1 second delay between requests

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

async function extractJsonData(page: puppeteer.Page): Promise<ScrapedOrder[] | null> {
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
        logger.debug('Initial JSON Structure:', JSON.stringify(jsonData, null, 2).slice(0, 500) + '...');

        const posts = extractPosts(jsonData);
        if (!posts || !Array.isArray(posts)) {
            logger.warn('Could not find posts array in JSON data');
            return null;
        }

        return posts
            .filter(post => {
                try {
                    const postDate = new Date(post.date || '');
                    return !isNaN(postDate.getTime()) && postDate.getFullYear() >= CURRENT_YEAR;
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
        return possibleArrays.reduce((a, b) => a.length > b.length ? a : b);
    }
    
    return null;
}

function getStringValue(field: string | { rendered?: string; raw?: string; } | undefined): string {
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
        identifier: (post.id?.toString() || post.slug || ''),
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

async function scrapePresidentialActions(): Promise<ScrapedOrder[]> {
    logger.info(`Starting scrape for presidential actions from ${CURRENT_YEAR}...`);
    
    const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
    });
    
    try {
        const page = await browser.newPage();
        
        await page.goto(BASE_URL, { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        }).catch(error => {
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

async function scrapeFromHtml(page: puppeteer.Page): Promise<ScrapedOrder[]> {
    const actions: ScrapedOrder[] = [];
    let currentPage = 1;
    let hasMorePages = true;

    while (hasMorePages && currentPage <= 5) {
        const url = currentPage === 1 
            ? BASE_URL 
            : `${BASE_URL}page/${currentPage}/`;
        
        logger.info(`Scraping page ${currentPage}...`);
        
        try {
            await page.goto(url, { 
                waitUntil: 'networkidle0',
                timeout: 30000
            });
            
            await setTimeout(RATE_LIMIT_DELAY);
            
            const pageActions = await page.evaluate(() => {
                const actionElements = document.querySelectorAll('h2 a, h3 a');
                return Array.from(actionElements).map(link => {
                    const container = link.closest('article') || link.closest('li');
                    
                    const title = link.textContent?.trim() || '';
                    const url = link.getAttribute('href') || '';
                    
                    const dateElement = container?.querySelector('time') || 
                                      container?.querySelector('.date, .entry-date');
                    const date = dateElement?.textContent?.trim() || '';
                    
                    return { title, url, date };
                }).filter(action => action.title && action.url);
            });

            const relevantActions = pageActions.filter(action => 
                action.url.includes(`/${CURRENT_YEAR}/`)
            );
            
            for (const action of relevantActions) {
                try {
                    logger.info(`Visiting ${action.title}...`);
                    await page.goto(action.url, { 
                        waitUntil: 'networkidle0',
                        timeout: 30000
                    });
                    
                    await setTimeout(RATE_LIMIT_DELAY);
                    
                    const details = await page.evaluate(() => {
                        const content = document.body.textContent || '';
                        const dateElement = document.querySelector('time') || 
                                          document.querySelector('.date, .entry-date');
                        return {
                            content,
                            date: dateElement?.textContent?.trim()
                        };
                    });
                    
                    const scrapedOrder: ScrapedOrder = {
                        identifier: action.url.split('/').pop() || '',
                        type: determineDocumentType(action.title),
                        title: action.title,
                        date: new Date(action.date || details.date || ''),
                        url: action.url,
                        summary: '',
                        notes: null,
                        content: details.content || null,
                        statusId: '1',
                        categories: [],
                        agencies: [],
                        isNew: true,
                        metadata: {
                            orderNumber: extractOrderNumber(action.title)
                        }
                    };
                    
                    if (!isNaN(scrapedOrder.date.getTime())) {
                        actions.push(scrapedOrder);
                    } else {
                        logger.warn(`Invalid date for action: ${action.title}`);
                    }
                    
                } catch (error) {
                    logger.error(`Error processing action ${action.title}:`, error);
                    continue;
                }
            }

            const hasNextPage = await page.evaluate(() => {
                const nextButton = document.querySelector('.pagination-next');
                return nextButton !== null;
            });

            hasMorePages = hasNextPage;
            currentPage++;
            
        } catch (error) {
            logger.error(`Error processing page ${currentPage}:`, error);
            hasMorePages = false;
        }
    }

    return actions;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) {
    scrapePresidentialActions()
        .then(results => {
            logger.info('Scraping completed successfully', {
                totalResults: results.length,
                types: results.map(r => r.type)
            });
            process.exit(0);
        })
        .catch(error => {
            logger.error('Scraper execution failed:', error);
            process.exit(1);
        });
}

export { scrapePresidentialActions };