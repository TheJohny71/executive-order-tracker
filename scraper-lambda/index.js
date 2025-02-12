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
            const orderElements = document.querySelectorAll('.document-wrapper');
            return Array.from(orderElements).map(element => {
                const titleElement = element.querySelector('h5');
                const dateElement = element.querySelector('.metadata time');
                const linkElement = element.querySelector('h5 a');
                const descriptionElement = element.querySelector('.description');

                return {
                    title: titleElement ? titleElement.textContent.trim() : '',
                    date: dateElement ? dateElement.getAttribute('datetime') : '',
                    url: linkElement ? linkElement.href : '',
                    description: descriptionElement ? descriptionElement.textContent.trim() : '',
                    id: linkElement ? linkElement.href.split('/').pop() : '',
                };
            });
        });
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                orders,
                count: orders.length,
                timestamp: new Date().toISOString()
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