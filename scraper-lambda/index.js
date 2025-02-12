import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export const handler = async (event) => {
    let browser = null;
    
    try {
        console.log('Starting browser...');
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });
        
        console.log('Browser started, opening page...');
        const page = await browser.newPage();
        await page.goto('https://www.federalregister.gov/presidential-documents/executive-orders');
        
        console.log('Page loaded, extracting data...');
        const orders = await page.evaluate(() => {
            return 'Test data'; // We'll add real scraping logic next
        });
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                orders
            })
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
                error: error.message
            })
        };
    } finally {
        if (browser !== null) {
            await browser.close();
        }
    }
};