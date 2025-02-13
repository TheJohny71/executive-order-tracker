import axios from 'axios';
import { load } from 'cheerio';

interface PresidentialAction {
    type: string;
    title: string;
    date: string;
    url: string;
}

async function main() {
    try {
        console.log('Starting scrape...');
        
        const baseUrl = 'https://www.whitehouse.gov/briefing-room/presidential-actions/';
        console.log(`Fetching from: ${baseUrl}`);
        
        const response = await axios.get(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
            }
        });
        
        const $ = load(response.data);
        
        // Debug: Log some of the HTML to see what we're getting
        console.log('\nPage HTML preview:');
        console.log($.html().substring(0, 500));
        
        const actions: PresidentialAction[] = [];
        
        // Debug: Log the number of articles found
        console.log(`\nFound article elements: ${$('article').length}`);
        
        $('article').each((index, element) => {
            const $element = $(element);
            console.log(`\nProcessing article ${index + 1}:`);
            
            const title = $element.find('h2').text().trim();
            const date = $element.find('time').text().trim();
            const url = $element.find('a').attr('href');
            const type = $element.find('.category').text().trim();
            
            console.log('Found:', { title, date, url, type });
            
            if (title || date) {
                actions.push({
                    type: type || 'Unknown',
                    title: title || 'No Title',
                    date: date || 'No Date',
                    url: url || ''
                });
            }
        });

        console.log(`\nTotal actions found: ${actions.length}`);
        
        if (actions.length > 0) {
            const typeCounts = actions.reduce((acc, curr) => {
                acc[curr.type] = (acc[curr.type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            
            console.log('\nBreakdown by type:');
            Object.entries(typeCounts).forEach(([type, count]) => {
                console.log(`${type}: ${count}`);
            });
        } else {
            console.log('\nNo actions found. Analyzing page structure...');
            $('h1, h2, h3').each((i, el) => {
                console.log(`Heading: ${$(el).text().trim()}`);
            });
        }
        
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Network error:', {
                status: error.response?.status,
                message: error.message,
                data: error.response?.data
            });
        } else {
            console.error('Error:', error);
        }
        process.exit(1);
    }
}

main();
