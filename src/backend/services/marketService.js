// src/backend/services/marketService.js
const axios = require('axios');
const cheerio = require('cheerio');
const { db } = require('./firebaseService'); 

/**
 * Scrapes and parses the market price data from the AMT target webpage.
 */
async function scrapeMarketPrices() {
  const url = 'https://amtrends.co.za/market-pricesv2/';
  
  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'FarmConnectSABot/1.0' }
    });
    
    const $ = cheerio.load(data);
    const scrapedRecords = [];
    
    // Iterate through every category tab in the HTML
    $('.tab-content').each((index, tabElement) => {
      // Extract category from the ID (e.g., 'tab-content-Beef' -> 'Beef')
      const tabId = $(tabElement).attr('id') || '';
      const category = tabId.replace('tab-content-', '').toLowerCase();

      // Iterate over every row in the current category's table body
      $(tabElement).find('tbody tr').each((rowIndex, rowElement) => {
        const cols = $(rowElement).find('td');
        
        // Ensure the row has the expected 6 columns before parsing
        if (cols.length >= 6) {
          const productName = $(cols[0]).text().trim();
          const rawPrice = $(cols[1]).text().trim();
          const quantityType = $(cols[2]).text().trim();
          const rawDate = $(cols[3]).text().trim();

          // Convert SA currency format "R 3 295,00" to a standard float 3295.00
          // 1. Remove all characters except numbers and commas
          // 2. Replace the decimal comma with a decimal period
          const priceStr = rawPrice.replace(/[^0-9,]/g, '').replace(',', '.');
          const price = parseFloat(priceStr);

          // Convert the extracted date string (e.g., "2026-07-10") to a standard Date object
          const recordDate = new Date(rawDate);

          scrapedRecords.push({
            productName: productName,
            category: category,
            price: price,
            quantityType: quantityType,
            currency: 'ZAR',
            source: 'AMT',
            dateRecorded: recordDate
          });
        }
      });
    });

    return scrapedRecords;
  } catch (error) {
    console.error('Error scraping AMT data:', error.message);
    throw error;
  }
}

/**
 * Saves scraped entries into Firestore, building a distinct time-series.
 */
async function ingestMarketData() {
  console.log('Starting market data ingestion pipeline...');
  
  try {
    const prices = await scrapeMarketPrices();
    
    if (prices.length === 0) {
      console.log('No prices found. The HTML structure may have changed.');
      return;
    }

    const batch = db.batch();

    prices.forEach((record) => {
      const dateStr = record.dateRecorded.toISOString().split('T')[0];
      
      // Deterministic ID prevents duplicate records on the same day
      // e.g., "2026-07-10_beef_weaners_(200-250kg)"
      const safeProductName = record.productName.replace(/\s+/g, '_').toLowerCase();
      const docId = `${dateStr}_${record.category}_${safeProductName}`;
      const docRef = db.collection('market_prices').doc(docId);

      batch.set(docRef, record, { merge: true });
    });

    await batch.commit();
    console.log(`Successfully ingested ${prices.length} market price records.`);
  } catch (error) {
    console.error('Ingestion pipeline failed:', error);
  }
}

module.exports = { ingestMarketData };