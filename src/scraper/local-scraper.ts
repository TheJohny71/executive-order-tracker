import axios from "axios";
import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";

interface ExecutiveOrder {
  number: string;
  title: string;
  date: string;
  url: string;
  fullText?: string;
}

async function scrapeExecutiveOrders(): Promise<void> {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, "../../data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Fetch the main page
    const response = await axios.get(
      "https://www.federalregister.gov/presidential-documents/executive-orders",
    );
    const $ = cheerio.load(response.data);

    const orders: ExecutiveOrder[] = [];

    // Parse each executive order entry
    $(".executive-order-entry").each((_, element) => {
      const order: ExecutiveOrder = {
        number: $(element).find(".eo-number").text().trim(),
        title: $(element).find(".title").text().trim(),
        date: $(element).find(".date").text().trim(),
        url: $(element).find("a").attr("href") || "",
      };
      orders.push(order);
    });

    // Save to JSON file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = path.join(dataDir, `executive-orders-${timestamp}.json`);
    fs.writeFileSync(filename, JSON.stringify(orders, null, 2));

    console.log(`Successfully scraped ${orders.length} executive orders`);
    console.log(`Data saved to ${filename}`);
  } catch (error) {
    console.error("Error scraping executive orders:", error);
    throw error;
  }
}

// Run the scraper
scrapeExecutiveOrders();
