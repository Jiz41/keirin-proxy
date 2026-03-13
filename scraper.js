const fetch = require('node-fetch');
const cheerio = require('cheerio');

const VENUE_MAP = {
  '13': 'iwakitaira',
  '22': 'maebashi',
  '23': 'toride',
  '24': 'utsunomiya',
  '25': 'omiya',
  '26': 'seibuen',
  '27': 'keiokaku',
  '28': 'tachikawa',
  '31': 'matsudo',
  '35': 'hiratsuka',
  '36': 'odawara',
  '37': 'ito',
  '38': 'shizuoka',
  '42': 'nagoya',
  '43': 'gifu',
  '44': 'ogaki',
  '45': 'toyohashi',
  '47': 'matsusaka',
  '53': 'nara',
  '55': 'wakayama',
  '56': 'kishiwada',
  '61': 'tamano',
  '62': 'hiroshima',
  '63': 'hofu',
  '73': 'komatsushima',
  '74': 'kochi',
  '75': 'matsuyama',
  '81': 'kokura',
  '83': 'kurume',
  '84': 'takeo',
  '86': 'beppu',
  '87': 'kumamoto'
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function resolveStyle(kimatete) {
  const nige  = kimatete['逃'] || 0;
  const maku  = kimatete['捲'] || 0;
  const sashi = kimatete['差'] || 0;
  const ma    = kimatete['マ'] || 0;

  const groups = [
    { value: '逃', score: nige },
    { value: '自', score: maku },
    { value: '追', score: Math.max(sashi, ma) },
  ];

  groups.sort((a, b) => b.score - a.score);

  if (groups[0].score === 0) return { value: null, warn: true };
  if (groups[0].score === groups[1].score) return { value: null, warn: true };
  return { value: groups[0].value, warn: false };
}

async function scrapeRace(raceId) {
  const venueCode = raceId.slice(0, 2);
  const slug = VENUE_MAP[venueCode];
  if (!slug) {
    throw new Error('Invalid venue code');
  }

  const url = `https://keirin.kdreams.jp/${slug}/racedetail/${raceId}/`;

  await sleep(1000);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'PoliteKeirinBot/1.0 (on-demand only, no flood; say the word and I vanish; DM: https://x.com/kayoutouidou01)',
      'Accept': 'text/html',
      'Accept-Language': 'ja-JP'
    }
  });
  const body = await response.text();
  const $ = cheerio.load(body);

  const titleText = $('title').text();
  const venueMatch = titleText.match(/(.+)競輪 レース詳細/);
  const venue = venueMatch ? venueMatch[1] : '';

  const riders = [];
  let raceTable = null;

  $('table').each((i, table) => {
      const thText = $(table).find('th').first().text();
      if (thText.includes('予想') && !thText.includes('周回')) {
          raceTable = table;
          return false;
      }
  });

  if (raceTable) {
    $(raceTable).find('tbody tr').each((i, el) => {
      const rowText = $(el).text();
      if (rowText.includes('誘導員')) return;

      const tds = $(el).find('td');
      if (tds.length === 0) return;

      let number = null;
      const indexOffset = tds.length <= 22 ? -1 : 0;
      const numberCellIndex = 4 + indexOffset;
      if (tds[numberCellIndex]) {
          const numText = $(tds[numberCellIndex]).text().trim();
          const parsedNum = parseInt(numText, 10);
          if (!isNaN(parsedNum) && parsedNum > 0 && parsedNum < 10) {
              number = parsedNum;
          }
      }

      if (number === null) {
          tds.each((j, td) => {
              const cellText = $(td).text().trim();
              if (/^[1-9]$/.test(cellText)) {
                  number = parseInt(cellText, 10);
                  return false;
              }
          });
      }

      if (number === null) return;

      const isScratched = rowText.includes('（欠車）') || rowText.includes('欠');

      let rider = {
          mark: "", bracket: null, number: number,
          name: '', pref: null, age: null, term: null,
          grade: '', style: null, styleWarn: false,
          gear: null, score: null, isScratched: isScratched
      };

      try {
        const nameCellIndex = 5 + indexOffset;
        const nameCellText = tds[nameCellIndex] ? $(tds[nameCellIndex]).text().replace(/　/g, ' ').trim() : '';
        const bracketCellIndex = 3 + indexOffset;
        if(tds[bracketCellIndex]){
            const bracket = parseInt($(tds[bracketCellIndex]).text().trim());
            rider.bracket = isNaN(bracket) ? null : bracket;
        }

        if (isScratched) {
            rider.name = nameCellText.replace('（欠車）', '').replace(/\s+/g, ' ').trim();
        } else {
            rider.mark = indexOffset === 0 && tds[0] ? $(tds[0]).text().trim() : "";
            const detailRegex = /([^\s/]+(?:\s[^\s/]+)?)\s*\/\s*(\d+)\s*\/\s*(\d+)/;
            const detailMatch = nameCellText.match(detailRegex);
            if (detailMatch) {
                rider.name = nameCellText.substring(0, detailMatch.index).replace(/\s+/g, ' ').trim();
                rider.pref = (detailMatch[1] || '').replace(/\s/g, '');
                rider.age = parseInt(detailMatch[2]) || null;
                rider.term = parseInt(detailMatch[3]) || null;
            } else {
                rider.name = nameCellText.replace(/\s+/g, ' ').trim();
            }
            rider.grade = tds[6 + indexOffset] ? $(tds[6 + indexOffset]).text().trim() : '';
            const kimatete = {
              '逃': parseInt($(tds[12 + indexOffset]).text().trim(), 10) || 0,
              '捲': parseInt($(tds[13 + indexOffset]).text().trim(), 10) || 0,
              '差': parseInt($(tds[14 + indexOffset]).text().trim(), 10) || 0,
              'マ': parseInt($(tds[15 + indexOffset]).text().trim(), 10) || 0,
            };
            const styleResult = resolveStyle(kimatete);
            rider.style = styleResult.value;
            if (styleResult.warn) rider.styleWarn = true;
            const gearVal = parseFloat(tds[8 + indexOffset] ? $(tds[8 + indexOffset]).text().trim() : '');
            rider.gear = isNaN(gearVal) ? null : gearVal;
            const scoreVal = parseFloat(tds[9 + indexOffset] ? $(tds[9 + indexOffset]).text().trim() : '');
            rider.score = isNaN(scoreVal) ? null : scoreVal;
        }
      } catch (e) {
          console.error(`Error parsing row for rider #${number} in race ${raceId}. Error: ${e.message}`);
      }

      riders.push(rider);
    });
  }

  const grades = riders.filter(r => !r.isScratched).map(r => r.grade);
  let series = 'A級';
  if (grades.some(g => g === 'L1')) series = 'ガールズ';
  else if (grades.some(g => g && g.startsWith('S'))) series = 'S級';
  else if (grades.some(g => g === 'A3')) series = 'A級チャレンジ';

  return { raceId, venue, series, riders };
}

module.exports = { scrapeRace };
