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
