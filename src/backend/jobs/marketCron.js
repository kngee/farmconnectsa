// src/backend/jobs/marketCron.js
const cron = require('node-cron');
const { ingestMarketData } = require('../services/marketService');

function initMarketDataCron() {
  // Runs Monday through Friday at 04:00 AM SAST
  // Syntax: minute hour day-of-month month day-of-week
  cron.schedule('0 4 * * 1-5', async () => {
    console.log('[CRON] Triggering scheduled market data ingestion...');
    await ingestMarketData();
  }, {
    scheduled: true,
    timezone: "Africa/Johannesburg"
  });
  
  console.log('Market data cron job initialized.');
}

module.exports = { initMarketDataCron };