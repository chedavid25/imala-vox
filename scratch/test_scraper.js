const { ejecutarScrapingProfundo } = require('../functions/lib/scraper');

async function testScraper() {
  const url = 'https://aleejes.com.ar/'; // URL provided by user
  console.log(`Testing scraper for: ${url}`);
  try {
    const result = await ejecutarScrapingProfundo(url, 5); // Scrape only 5 items for speed
    console.log("Scrape completed!");
    console.log("Success:", result.success);
    if (result.success) {
      console.log("Text length:", result.mainText.length);
      console.log("Properties found:", result.propertyCount);
    } else {
      console.log("Error:", result.error);
    }
  } catch (err) {
    console.error("Scraper crash:", err);
  }
}

testScraper();
