import chromium from '@sparticuz/chromium';
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { 
  DocumentType, 
  ScrapedOrder, 
  ScraperResponse, 
  LambdaEvent 
} from './types.js';

const extractOrderDetails = async (page: Page): Promise<Partial<ScrapedOrder>> => {
  return page.evaluate(() => {
    const contentElement = document.querySelector('.body-content');
    return {
      description: contentElement ? 
        contentElement.textContent?.trim().substring(0, 1000) || '' : ''
    };
  });
};

export const handler = async (_event: LambdaEvent): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> => {
  let browser: Browser | null = null;
  
  try {
    console.log('Starting browser...');
    browser = await puppeteer.launch({
      args: [...chromium.args, '--disable-web-security'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
    
    console.log('Browser started, opening White House page...');
    const page = await browser.newPage();
    await page.goto('https://www.whitehouse.gov/presidential-actions/');
    
    console.log('Page loaded, extracting data...');
    
    const initialOrders = await page.evaluate(() => {
      const articles = Array.from(document.querySelectorAll('article'));
      return articles.map(article => {
        const titleElement = article.querySelector('.news-item__title');
        const dateElement = article.querySelector('.news-item__date');
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
            ? 'EXECUTIVE_ORDER' as const
            : 'PRESIDENTIAL_MEMORANDUM' as const,
          number: numberMatch?.[1] || null,
          sourceId: url.split('/').slice(-2, -1)[0] || ''
        };
      });
    }) as Array<Omit<ScrapedOrder, 'description'>>;

    const detailedOrders = await Promise.all(
      initialOrders.map(async (order): Promise<ScrapedOrder> => {
        try {
          const detailPage = await browser!.newPage();
          await detailPage.goto(order.url);
          
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
    const errorResponse: ScraperResponse = {
      success: false,
      message: 'Scraping failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse)
    };
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
};