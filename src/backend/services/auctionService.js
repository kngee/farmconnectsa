// src/backend/services/auctionService.js
const ical = require('node-ical');
const { db } = require('./firebaseService');

async function scrapeAuctionSchedules() {
  const icalUrl = 'https://events.bkb.co.za/webcal'; 
  
  try {
    console.log(`Fetching auction events from: ${icalUrl}`);
    const events = await ical.async.fromURL(icalUrl);
    
    const upcomingAuctions = [];
    const now = new Date();

    for (const key in events) {
      const event = events[key];

      if (event.type === 'VEVENT' && event.start >= now) {  
        upcomingAuctions.push({
          auctioneer: 'BKB',
          title: event.summary || 'Unspecified Auction',
          date: event.start, 
          endDate: event.end || null,
          description: event.description || '',
          location: event.location || 'Location TBA',
          status: 'scheduled',
          lastUpdated: new Date()
        });
      }
    }

    return upcomingAuctions;
  } catch (error) {
    console.error('Error fetching or parsing BKB iCal data:', error.message);
    throw error;
  }
}

async function ingestAuctionData() {
  console.log('Starting auction schedule ingestion pipeline...');
  
  try {
    const auctions = await scrapeAuctionSchedules();
    
    if (auctions.length === 0) {
      console.log('No upcoming auctions found in the feed.');
      return;
    }

    const batch = db.batch();

    auctions.forEach((auction) => {
      const dateStr = auction.date.toISOString().split('T')[0];
      const safeTitle = auction.title.replace(/[\s/]+/g, '_').toLowerCase();
      const docId = `${dateStr}_bkb_${safeTitle}`;
      
      const docRef = db.collection('auction_schedules').doc(docId);

      batch.set(docRef, auction, { merge: true });
    });

    await batch.commit();
    console.log(`Successfully ingested ${auctions.length} upcoming BKB auctions.`);
  } catch (error) {
    console.error('Auction ingestion pipeline failed:', error);
  }
}

module.exports = { ingestAuctionData };