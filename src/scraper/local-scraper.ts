import axios from 'axios';
import { load } from 'cheerio';
import { parse, isAfter } from 'date-fns';

interface PresidentialAction {
    type: string;
    title: string;
    date: string;
    url: string;
    timestamp: Date;
}

interface ScrapeResult {
    actions: PresidentialAction[];
    nextPageUrl: string | undefined;
}

const START_DATE = new Date('2025-01-01');
const RELEVANT_TYPES = ['Executive Order', 'Presidential Memorandum'];

async function scrapeWhiteHousePage(pageUrl: string): Promise<ScrapeResult> {
    const response = await axios.get(pageUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        }
    });
    
    const $ = load(response.data);
    const actions: PresidentialAction[] = [];
    
    // Looking for links in the main content area
    const $entries = $('h2 a, h3 a').filter(function() {
        const href = $(this).attr('href');
        return typeof href === 'string' && href.includes('/briefing-room/');
    });
    
    console.log(`Found ${$entries.length} entries on page ${pageUrl}`);
    
    $entries.each(function() {
        const $element = $(this);
        const $container = $element.closest('h2, h3').parent();
        
        if (!$container.length) return;

        const title = $element.text().trim();
        const url = $element.attr('href') || '';
        
        // Try to find the date
        const dateText = $container.find('time').text().trim() || 
                        $container.find('.date').text().trim();
        
        // Parse the date (adjust the format based on actual date format)
        let timestamp: Date;
        try {
            timestamp = parse(dateText, 'MMMM d, yyyy', new Date());
            if (isNaN(timestamp.getTime())) {
                console.warn(`Invalid date parsed: ${dateText} for entry: ${title}`);
                return;
            }
        } catch (e) {
            console.warn(`Could not parse date: ${dateText} for entry: ${title}`);
            return;
        }
        
        // Determine the type based on URL
        let type = 'Other';
        const urlLower = url.toLowerCase();
        if (urlLower.includes('executive-order')) {
            type = 'Executive Order';
        } else if (urlLower.includes('presidential-memorandum')) {
            type = 'Presidential Memorandum';
        }
        
        // Only include relevant types from 2025 onwards
        if (RELEVANT_TYPES.includes(type) && isAfter(timestamp, START_DATE)) {
            actions.push({
                type,
                title,
                date: dateText,
                url,
                timestamp
            });
        }
    });
    
    // Check if there's a next page
    const nextPageUrl = $('a.next-posts-link, a.next, link[rel="next"]').attr('href');
    
    return {
        actions,
        nextPageUrl
    };
}

async function main() {
    try {
        console.log('Starting scrape for executive orders and memos from 2025...');
        
        let currentPage = 1;
        let currentUrl = 'https://www.whitehouse.gov/briefing-room/presidential-actions/';
        const allActions: PresidentialAction[] = [];
        let continueScraping = true;
        
        while (continueScraping) {
            console.log(`\nScraping page ${currentPage}...`);
            
            try {
                const result = await scrapeWhiteHousePage(currentUrl);
                
                // Add new actions to our collection
                allActions.push(...result.actions);
                
                // Check if we should continue to the next page
                if (result.nextPageUrl) {
                    currentUrl = result.nextPageUrl;
                    currentPage++;
                } else {
                    continueScraping = false;
                }
                
                // Optional: Add a small delay between requests
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`Error scraping page ${currentPage}:`, error);
                continueScraping = false;
            }
        }

        // Sort actions by date (newest first)
        allActions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        console.log('\nScraping completed!');
        console.log(`Total actions found: ${allActions.length}`);
        
        // Display type breakdown
        const typeCounts = allActions.reduce((acc, curr) => {
            acc[curr.type] = (acc[curr.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        console.log('\nBreakdown by type:');
        Object.entries(typeCounts).forEach(([type, count]) => {
            console.log(`${type}: ${count}`);
        });

        // Display all found actions
        console.log('\nAll actions found (newest first):');
        allActions.forEach((action, index) => {
            console.log(`\n${index + 1}. ${action.title}`);
            console.log(`   Type: ${action.type}`);
            console.log(`   Date: ${action.date}`);
            console.log(`   URL: ${action.url}`);
        });
        
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