const fetch = require('node-fetch');
const cheerio = require('cheerio');

const VENUE_MAP = {
  '11': 'hakodate', '12': 'aomori', '13': 'iwakitaira',
  '21': 'yahiko', '22': 'maebashi', '23': 'toride',
  '24': 'utsunomiya', '25': 'omiya', '26': 'seibuen',
  '27': 'keiokaku', '28': 'tachikawa', '31': 'matsudo',
  '35': 'hiratsuka',   // Updated from 34
  '36': 'odawara',     // Updated from 35
  '37': 'ito',         // Updated from 36
  '38': 'shizuoka',    // Updated from 37
  '42': 'nagoya',      // Updated from 41
  '43': 'gifu',        // Updated from 42
  '44': 'ogaki',       // Updated from 43
  '45': 'toyohashi',   // Updated from 44
  '47': 'matsusaka',   // Updated from 46
  '51': 'fukui',
  '53': 'nara',        // Updated from 52
  '55': 'wakayama',
  '56': 'kishiwada',   // Updated from 54
  '61': 'tamano', '62': 'hiroshima', '63': 'hofu',
  '71': 'takamatsu', '73': 'komatsushima',
  '74': 'kochi',       // Updated from 72
  '75': 'matsuyama',   // Updated from 74
  '81': 'kokura',
  '83': 'kurume',      // Updated from 82
  '84': 'takeo',       // Updated from 83
  '86': 'beppu',       // Updated from 85
  '87': 'kumamoto'     // Updated from 86
};

async function getOdds(raceId, type) {
  const url = `https://keirin.kdreams.jp/odds/${type}/${raceId}/`;
  const response = await fetch(url);
  if (!response.ok) {
    // For 404s, return empty odds instead of throwing
    if (response.status === 404) return {};
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
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

async function scrapeRace(raceId) {
  const venueCode = raceId.slice(2, 4);
  const venue = VENUE_MAP[venueCode];
  if (!venue) {
    throw new Error(`Invalid venue code: ${venueCode}`);
  }

  const [gumabaken, wide, _2syatan, _2syafuku, _3rentan, _3renpuku] = await Promise.all([
    getOdds(raceId, 'gumabaken'),
    getOdds(raceId, 'wide'),
    getOdds(raceId, '2syatan'),
    getOdds(raceId, '2syafuku'),
    getOdds(raceId, '3rentan'),
    getOdds(raceId, '3renpuku'),
  ]);

  return {
    gumabaken,
    wide,
    '2syatan': _2syatan,
    '2syafuku': _2syafuku,
    '3rentan': _3rentan,
    '3renpuku': _3renpuku,
  };
}

module.exports = { scrapeRace };
