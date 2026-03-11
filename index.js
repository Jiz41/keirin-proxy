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
  const response = await fetch('https://keirin.kdreams.jp/kaisai/2026/03/11/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; keirin-proxy/1.0)' }
  });
  const body = await response.text();
  const $ = cheerio.load(body);

  const result = [];
  $('.kaisai-list_contents').each((i, el) => {
    const days = [];
    $(el).find('.kaisai-list_nav-list > li').each((j, li) => {
      const label = $(li).find('.tab a').text().trim();
      const links = [];
      // This is a correction based on re-evaluating the HTML structure.
      // The race links are not in a sub-nav but in the associated panel.
      const panelId = $(li).find('.tab a').attr('href');
      if (panelId) {
        $(el).find(panelId).find('.kaisai-program_table a[href*="/racedetail/"]').each((k, a) => {
          links.push($(a).attr('href'));
        });
      }
      days.push({ label, links });
    });
    result.push({ index: i, days });
  });

  res.json(result);
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
