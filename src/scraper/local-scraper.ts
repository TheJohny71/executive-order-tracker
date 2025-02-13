import axios from 'axios';
import { load } from 'cheerio';

interface ExecutiveOrder {
    number: string;
    title: string;
    date: string;
    url: string;
}

async function scrapeExecutiveOrders(): Promise<void> {
    try {
        console.log('Starting scrape...');
        
        const response = await axios.get('https://www.federalregister.gov/presidential-documents/executive-orders');
        const $ = load(response.data);
        
        const orders: ExecutiveOrder[] = [];

        $('.document-wrapper').each((_, element) => {
            const $element = $(element);
            
            const order: ExecutiveOrder = {
                number: $element.find('.eo-number').text().trim(),
                title: $element.find('.title').text().trim(),
                date: $element.find('.date').text().trim(),
                url: 'https://www.federalregister.gov' + ($element.find('a').attr('href') || '')
            };
            
            console.log('Found order:', order);
            orders.push(order);
        });

        console.log(`Total orders found: ${orders.length}`);
        
    } catch (error) {
        console.error('Error scraping:', error);
        throw error;
    }
}

// Run the scraper
scrapeExecutiveOrders();