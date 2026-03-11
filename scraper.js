const fetch = require('node-fetch');
const cheerio = require('cheerio');

const VENUE_MAP = {
  '11': 'hakodate', '12': 'aomori', '13': 'iwakitaira',
  '21': 'yahiko', '22': 'maebashi', '23': 'toride',
  '24': 'utsunomiya', '25': 'omiya', '26': 'seibuen',
  '27': 'keiokaku', '28': 'tachikawa', '31': 'matsudo',
  '32': 'chiba', '33': 'kawasaki', '34': 'hiratsuka',
  '35': 'odawara', '36': 'ito', '37': 'shizuoka',
  '41': 'nagoya', '42': 'gifu', '43': 'ogaki',
  '44': 'toyohashi', '45': 'toyama', '46': 'matsusaka',
  '47': 'yokkaichi', '51': 'fukui', '52': 'nara',
  '53': 'mukomachi', '54': 'wakayama', '55': 'kishiwada',
  '61': 'tamano', '62': 'hiroshima', '63': 'hofu',
  '71': 'takamatsu', '72': 'kochi', '73': 'komatsushima',
  '74': 'matsuyama', '81': 'kokura', '82': 'kurume',
  '83': 'takeo', '84': 'sasebo', '85': 'beppu', '86': 'kumamoto'
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeRace(raceId) {
  const venueCode = raceId.slice(0, 2);
  const slug = VENUE_MAP[venueCode];
  if (!slug) {
    throw new Error('Invalid venue code');
  }

  const url = `https://keirin.kdreams.jp/${slug}/racedetail/${raceId}/`;

  await sleep(1000);
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; keirin-proxy/1.0)' }
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
      // 誘導員はスキップ
      if (rowText.includes('誘導員')) {
        return;
      }

      const tds = $(el).find('td');
      if (tds.length === 0) {
        return;
      }
      
      const isShortRace = tds.length < 10;
      const numSel = isShortRace ? '.ct04' : '.ct05';
      let number = null;
      
      const numText = $(el).find(numSel).text().trim();
      if (numText) {
        const parsedNum = parseInt(numText, 10);
        if (!isNaN(parsedNum) && parsedNum > 0 && parsedNum < 10) {
            number = parsedNum;
        }
      }

      // クラス名で取得できない場合のフォールバック
      if (number === null) {
          tds.each((j, td) => {
              const cellText = $(td).text().trim();
              if (/^[1-9]$/.test(cellText)) {
                  number = parseInt(cellText, 10);
                  return false; // jQuery .each を抜ける
              }
          });
      }
      
      // どうしても車番が見つからない行はスキップ
      if (number === null) {
        return;
      }

      const isScratched = rowText.includes('（欠車）') || rowText.includes('欠');

      let rider = {
          mark: "", bracket: null, number: number, name: '',
          pref: null, age: null, term: null, grade: '', style: '',
          gear: null, score: null, isScratched: isScratched
      };

      try {
        const nameSel = isShortRace ? '.ct05' : '.ct06';
        const gradeSel = isShortRace ? '.ct06' : '.ct07';
        const styleSel = isShortRace ? '.ct07' : '.ct08';
        const gearSel = isShortRace ? '.ct08' : '.ct09';
        const scoreSel = isShortRace ? '.ct09' : '.ct10';
        const bracketSel = isShortRace ? '.ct03' : '.ct04';
        const markSel = isShortRace ? null : '.ct01';

        const nameCellText = $(el).find(nameSel).text().replace(/\s+/g, ' ').trim();
        const bracketText = $(el).find(bracketSel).text().trim();
        rider.bracket = parseInt(bracketText, 10) || null;

        if (isScratched) {
            rider.name = nameCellText.replace('（欠車）', '').trim();
        } else {
            rider.mark = markSel ? ($(el).find(markSel).text().trim() || "") : "";
            
            const detailRegex = /([^\s/]+(?:\s[^\s/]+)?)\s*\/\s*(\d+)\s*\/\s*(\d+)/;
            const detailMatch = nameCellText.match(detailRegex);

            if (detailMatch) {
                rider.name = nameCellText.substring(0, detailMatch.index).replace(/\s+/g, ' ').trim();
                rider.pref = (detailMatch[1] || '').replace(/\s/g, ''); // "香 川" -> "香川"
                rider.age = parseInt(detailMatch[2], 10) || null;
                rider.term = parseInt(detailMatch[3], 10) || null;
            } else {
                rider.name = nameCellText;
            }
            
            rider.grade = $(el).find(gradeSel).text().trim();
            rider.style = $(el).find(styleSel).text().trim();
            rider.gear = parseFloat($(el).find(gearSel).text().trim()) || null;
            rider.score = parseFloat($(el).find(scoreSel).text().trim()) || null;
        }
      } catch (e) {
          console.error(`Error parsing row for rider #${number} in race ${raceId}. Pushing partial data. Error: ${e.message}`);
      }

      riders.push(rider);
    });
  }

  return { raceId, venue, riders };
}

module.exports = { scrapeRace };
