const fetch = require('node-fetch');
const cheerio = require('cheerio');

const VENUE_MAP = {
  '11': 'hakodate', '12': 'aomori', '13': 'iwakitaira',
  '21': 'yahiko', '22': 'maebashi', '23': 'toride',
  '24': 'utsunomiya', '25': 'omiya', '26': 'seibuen',
  '27': 'keiokaku', '28': 'tachikawa', '31': 'matsudo',
  '35': 'hiratsuka', '36': 'odawara', '37': 'ito', '38': 'shizuoka',
  '42': 'nagoya', '43': 'gifu', '44': 'ogaki', '45': 'toyohashi',
  '47': 'matsusaka', '51': 'fukui', '53': 'nara', '55': 'wakayama',
  '56': 'kishiwada', '61': 'tamano', '62': 'hiroshima', '63': 'hofu',
  '71': 'takamatsu', '73': 'komatsushima', '74': 'kochi', '75': 'matsuyama',
  '81': 'kokura', '83': 'kurume', '84': 'takeo', '86': 'beppu', '87': 'kumamoto'
};

async function getOdds(raceId, type) {
  if (!VENUE_MAP) {
    throw new Error('VENUE_MAP is not available.');
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

module.exports = { getOdds };
