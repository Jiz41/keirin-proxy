const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { getVenueMap } = require('./venueManager.js');

// VENUE_MAPはvenueManagerから動的に取得する

async function getOdds(raceId, type) {
  const VENUE_MAP = await getVenueMap(); // 動的にVENUE_MAPを取得
  if (!VENUE_MAP) {
    throw new Error('VENUE_MAP is not available. The service may be starting up or recovering.');
  }

  const url = `https://keirin.kdreams.jp/odds/${type}/${raceId}/`;
  const response = await fetch(url);
  const body = await response.text();
  const $ = cheerio.load(body);

  const odds = {};
  $('table.table-dot tr').each((i, row) => {
    const combination = $(row).find('th').text().trim();
    const value = parseFloat($(row).find('td').text().trim());
    if (combination && !isNaN(value)) {
      odds[combination] = value;
    }
  });

  return odds;
}

// getVenueMapを外部から利用可能にするためにエクスポートしておく
module.exports = { getOdds, getVenueMap };
