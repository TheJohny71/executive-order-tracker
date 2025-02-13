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

function extractDateFromUrl(url: string): Date | null {
    // Extract date from URLs like /2025/02/establishing-the-presidents.../
    const dateMatch = url.match(/\/(\d{4})\/(\d{2})\/[^/]+\/?$/);
    if (dateMatch) {
        const [_, year, month] = dateMatch;
        // Use the 1st of the month if day is not available
        return new Date(`${year}-${month}-01`);
    }
    return null;
}

async function scrapeWhiteHousePage(pageUrl: string): Promise<ScrapeResult> {
    const response = await axios.get(pageUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        }
    });
    
    const $ = load(response.data);
    const actions: PresidentialAction[] = [];
    
    // Looking for links and headings that might contain executive orders
    $('h1, h2, h3').each(function() {
        const $container = $(this);
        const $link = $container.find('a').length ? $container.find('a') : $container;
        const title = $link.text().trim();
        let url = $link.attr('href') || '';
        
        // Skip if no title or clearly not a presidential action
        if (!title || !url) return;
        
        // Make URL absolute if it's relative
        if (url.startsWith('/')) {
            url = `https://www.whitehouse.gov${url}`;
        }
        
        // Skip if not in briefing room
        if (!url.includes('/briefing-room/')) return;

        // Try multiple date sources
        let timestamp: Date | null = null;
        
        // 1. Try to find an explicit date element
        const dateText = $container.parent().find('time, .date').text().trim();
        if (dateText) {
            try {
                timestamp = parse(dateText, 'MMMM d, yyyy', new Date());
                if (isNaN(timestamp.getTime())) {
                    timestamp = null;
                }
            } catch (e) {
                timestamp = null;
            }
        }
        
        // 2. If no date found, try to extract from URL
        if (!timestamp) {
            timestamp = extractDateFromUrl(url);
        }
        
        // Skip if no valid date found or before 2025
        if (!timestamp || !isAfter(timestamp, START_DATE)) return;
        
        // Determine type based on title and URL
        let type = 'Other';
        const titleLower = title.toLowerCase();
        const urlLower = url.toLowerCase();
        
        if (titleLower.includes('executive order') || urlLower.includes('executive-order')) {
            type = 'Executive Order';
        } else if (titleLower.includes('memorandum') || urlLower.includes('memorandum')) {
            type = 'Presidential Memorandum';
        }
        
        // Only include relevant types
        if (RELEVANT_TYPES.includes(type)) {
            actions.push({
                type,
                title,
                date: timestamp.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                url,
                timestamp
            });
        }
    });
    
    // Check for next page
    const nextPageUrl = $('a.next-posts-link, a.next, link[rel="next"]').attr('href');
    
    console.log(`Found ${actions.length} relevant actions on page ${pageUrl}`);
    
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
        
        while (continueScraping && currentPage <= 5) { // Limit to 5 pages for safety
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
                
                // Add a small delay between requests
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
        
        if (allActions.length === 0) {
            console.log('\nNo actions found. This could mean:');
            console.log('1. The website structure might have changed');
            console.log('2. There might be no executive orders or memorandums yet');
            console.log('3. The date detection might need adjustment');
            
            // Debug output
            console.log('\nDebug: Showing all h1, h2, h3 elements found:');
            const response = await axios.get(currentUrl);
            const $ = load(response.data);
            $('h1, h2, h3').each(function() {
                console.log('Title:', $(this).text().trim());
                const href = $(this).find('a').attr('href');
                if (href) console.log('URL:', href);
                console.log('---');
            });
        } else {
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