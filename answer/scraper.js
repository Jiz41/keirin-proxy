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
      // セルが全くない行はスキップ
      if (tds.length === 0) {
        return;
      }

      let number = null;
      
      // 車番の取得を試みる (固定インデックス)
      const indexOffset = tds.length <= 22 ? -1 : 0;
      const numberCellIndex = 4 + indexOffset;
      if (tds[numberCellIndex]) {
          const numText = $(tds[numberCellIndex]).text().trim();
          const parsedNum = parseInt(numText, 10);
          if (!isNaN(parsedNum) && parsedNum > 0 && parsedNum < 10) {
              number = parsedNum;
          }
      }
      
      // 固定インデックスで見つからない場合のフォールバック (全セル走査)
      if (number === null) {
          tds.each((j, td) => {
              const cellText = $(td).text().trim();
              if (/^[1-9]$/.test(cellText)) {
                  number = parseInt(cellText, 10);
                  return false; // jQuery .each を抜ける
              }
          });
      }

      // 車番が見つからない場合は、選手情報ではないと判断しスキップ
      if (number === null) {
          return;
      }

      const isScratched = rowText.includes('（欠車）') || rowText.includes('欠');

      let rider = {
          mark: "",
          bracket: null,
          number: number,
          name: '',
          pref: null,
          age: null,
          term: null,
          grade: '',
          style: '',
          gear: null,
          score: null,
          isScratched: isScratched
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
            // 欠場選手の場合、名前など取得できる情報だけ取得
            rider.name = nameCellText.replace('（欠車）', '').replace(/\s+/g, ' ').trim();
        } else {
            // 通常の選手情報
            rider.mark = indexOffset === 0 && tds[0] ? $(tds[0]).text().trim() : "";
            
            const detailRegex = /([^\s/]+(?:\s[^\s/]+)?)\s*\/\s*(\d+)\s*\/\s*(\d+)/;
            const detailMatch = nameCellText.match(detailRegex);

            if (detailMatch) {
                rider.name = nameCellText.substring(0, detailMatch.index).replace(/\s+/g, ' ').trim();
                rider.pref = (detailMatch[1] || '').replace(/\s/g, ''); // "香 川" -> "香川"
                rider.age = parseInt(detailMatch[2]) || null;
                rider.term = parseInt(detailMatch[3]) || null;
            } else {
                rider.name = nameCellText.replace(/\s+/g, ' ').trim();
            }
            
            rider.grade = tds[6 + indexOffset] ? $(tds[6 + indexOffset]).text().trim() : '';
            rider.style = tds[7 + indexOffset] ? $(tds[7 + indexOffset]).text().trim() : '';
            const gearVal = parseFloat(tds[8 + indexOffset] ? $(tds[8 + indexOffset]).text().trim() : '');
            rider.gear = isNaN(gearVal) ? null : gearVal;
            const scoreVal = parseFloat(tds[9 + indexOffset] ? $(tds[9 + indexOffset]).text().trim() : '');
            rider.score = isNaN(scoreVal) ? null : scoreVal;
        }
      } catch (e) {
          console.error(`Error parsing row for rider #${number} in race ${raceId}. Pushing partial data. Error: ${e.message}`);
      }

      riders.push(rider);
    });
  }

  const grades = riders.filter(r => !r.isScratched).map(r => r.grade);
let series = 'A級';
if (grades.some(g => g === 'L1')) {
  series = 'ガールズ';
} else if (grades.some(g => g && g.startsWith('S'))) {
  series = 'S級';
} else if (grades.some(g => g === 'A3')) {
  series = 'A級チャレンジ';
}

return { raceId, venue, series, riders };
}

module.exports = { scrapeRace };
