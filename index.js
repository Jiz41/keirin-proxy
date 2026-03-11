const express = require('express');
const { getKaisai } = require('./kaisai');
const { scrapeRace } = require('./scraper');

const app = express();
const port = process.env.PORT || 3000;

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get('/debug', async (req, res) => {
  const fetch = require('node-fetch');
  const cheerio = require('cheerio');
  const response = await fetch(
    'https://keirin.kdreams.jp/komatsushima/racedetail/7320260310020001/',
    { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; keirin-proxy/1.0)' } }
  );
  const body = await response.text();
  const $ = cheerio.load(body);

  let raceTable = null;
  $('table').each((i, table) => {
    const thText = $(table).find('th').first().text().trim();
    if (thText.includes('予想') && !thText.includes('周回')) {
      raceTable = table;
      return false;
    }
  });

  const rows = [];
  $(raceTable).find('tbody tr').each((i, el) => {
    const tds = $(el).find('td');
    const tdTexts = [];
    tds.each((j, td) => {
      tdTexts.push($(td).text().replace(/\s+/g, ' ').trim().slice(0, 30));
    });
    rows.push({ rowIndex: i, tdCount: tds.length, tds: tdTexts });
  });

  res.json(rows);
});

app.get('/kaisai', async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'date is required' });
  }
  try {
    const kaisaiData = await getKaisai(date);
    res.json(kaisaiData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/race', async (req, res) => {
  const { raceId } = req.query;
  if (!raceId) {
    return res.status(400).json({ error: 'raceId is required' });
  }
  try {
    const raceData = await scrapeRace(raceId);
    res.json(raceData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
