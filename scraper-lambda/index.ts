import chromium from '@sparticuz/chromium';
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { 
  ScrapedOrder, 
  ScraperResponse, 
  LambdaEvent,
  DocumentType,
  DynamoDBItem 
} from './types.js';

const client = new DynamoDBClient({ region: "us-east-2" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "executive-orders";

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const PAGE_OPTIONS = {
  waitUntil: 'networkidle0' as const,
  timeout: 30000
};

const extractOrderDetails = async (page: Page): Promise<Partial<ScrapedOrder>> => {
  return page.evaluate(() => {
    const contentElement = document.querySelector('.body-content');
    const summaryElement = document.querySelector('.news-item__excerpt');
    const description = contentElement?.textContent?.trim() || 
                       summaryElement?.textContent?.trim() || '';
    return {
      description: description.substring(0, 1000)
    };
  });
};

const saveOrdersToDynamoDB = async (orders: ScrapedOrder[]): Promise<void> => {
  const chunks = Array.from(
    { length: Math.ceil(orders.length / 25) }, 
    (_, i) => orders.slice(i * 25, (i + 1) * 25)
  );

  for (const chunk of chunks) {
    const writeRequests = chunk.map(order => ({
      PutRequest: {
        Item: {
          pk: order.sourceId,
          sk: order.type,
          sourceId: order.sourceId,
          title: order.title,
          date: order.date,
          url: order.url,
          number: order.number,
          type: order.type,
          description: order.description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as DynamoDBItem
      }
    }));

    try {
      await docClient.send(new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: writeRequests
        }
      }));
      console.log(`Successfully wrote ${chunk.length} orders to DynamoDB`);
    } catch (error) {
      console.error('Error writing to DynamoDB:', error);
      throw error;
    }
  }
};

async function setupPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.setUserAgent(USER_AGENT);
  return page;
}

export const handler = async (_event: LambdaEvent): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> => {
  let browser: Browser | null = null;
  
  try {
    console.log('Starting browser...');
    browser = await puppeteer.launch({
      args: [...chromium.args, '--disable-web-security', '--ignore-certificate-errors'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true
    });
    
    console.log('Browser started, opening White House page...');
    const page = await setupPage(browser);
    await page.goto('https://www.whitehouse.gov/briefing-room/presidential-actions/', PAGE_OPTIONS);
    
    console.log('Page loaded, extracting data...');
    
    const initialOrders = await page.evaluate(() => {
      const articles = Array.from(document.querySelectorAll('article.news-item'));
      return articles.map(article => {
        const titleElement = article.querySelector('.news-item__title');
        const dateElement = article.querySelector('time.entry-date');
        const linkElement = article.querySelector('a');
        const url = linkElement?.href || '';
        
        const numberMatch = titleElement?.textContent?.match(
          /(?:Executive Order|Presidential Memorandum) (\d+)/
        );

        return {
          title: titleElement?.textContent?.trim() || '',
          date: dateElement?.textContent?.trim() || '',
          url,
          type: url.toLowerCase().includes('executive-order') 
            ? DocumentType.EXECUTIVE_ORDER
            : DocumentType.PRESIDENTIAL_MEMORANDUM,
          number: numberMatch?.[1] || null,
          sourceId: url.split('/').slice(-2, -1)[0] || ''
        };
      });
    });

    const detailedOrders = await Promise.all(
      initialOrders.map(async (order): Promise<ScrapedOrder> => {
        try {
          const detailPage = await setupPage(browser!);
          await detailPage.goto(order.url, PAGE_OPTIONS);
          
          const details = await extractOrderDetails(detailPage);
          await detailPage.close();
          
          return {
            ...order,
            description: details.description || ''
          };
        } catch (error) {
          console.error(`Error fetching details for ${order.url}:`, error);
          return {
            ...order,
            description: ''
          };
        }
      })
    );

    await saveOrdersToDynamoDB(detailedOrders);
    console.log('Successfully saved all orders to DynamoDB');

    const response: ScraperResponse = {
      success: true,
      orders: detailedOrders,
      count: detailedOrders.length,
      timestamp: new Date().toISOString()
    };
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(response)
    };
    
  } catch (error) {
    console.error('Scraping error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        message: 'Scraping failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      } as ScraperResponse)
    };
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
};