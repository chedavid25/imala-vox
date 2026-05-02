const { ejecutarScrapingProfundo } = require('./lib/scraper');

async function testScraper() {
  const url = 'https://www.imalavox.com/';
  console.log(`Testing scraper for: ${url}`);
  try {
    const result = await ejecutarScrapingProfundo(url, 3);
    console.log("Scrape completed!");
    console.log("Success:", result.success);
    if (result.success) {
      console.log("Text length:", result.mainText.length);
    } else {
      console.log("Error:", result.error);
    }
  } catch (err) {
    console.error("Scraper crash:", err);
  }
}

testScraper();
