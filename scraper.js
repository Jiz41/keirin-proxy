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
      if (rowText.includes('誘導員')) {
        return;
      }

      const tds = $(el).find('td');
      if (tds.length === 0) {
        return;
      }

      const indexOffset = tds.length < 10 ? -1 : 0;

      const number = parseInt($(tds[4 + indexOffset]).text().trim());
      if (isNaN(number)) {
        return; // 車番がなければ選手情報ではないのでスキップ
      }

      // 欠場判定の厳格化: 級班カラムが「欠」の場合に isScratched を true にする
      const gradeOrStatus = $(tds[6 + indexOffset]).text().trim();
      const isScratched = gradeOrStatus === '欠';

      const mark = indexOffset === 0 ? $(tds[0]).text().trim() : "";
      const bracket = parseInt($(tds[3 + indexOffset]).text().trim());

      // 選手名と詳細情報の抽出ロジックを修正
      const nameCellText = $(tds[5 + indexOffset]).text().replace(/　/g, ' ').replace(/\s+/g, ' ').trim();
      const detailMatch = nameCellText.match(/(\S+)\/(\d+)\/(\d+)$/);

      let name = '';
      let pref = null;
      let age = null;
      let term = null;

      if (detailMatch) {
        // 詳細情報が見つかった場合、その前を名前として抽出
        name = nameCellText.substring(0, detailMatch.index).trim();
        pref = (detailMatch[1] || '').replace(/[\s\/]/g, '');
        age = parseInt(detailMatch[2]) || null;
        term = parseInt(detailMatch[3]) || null;
      } else {
        // 詳細情報がない場合、セル全体を名前とする (欠場選手など)
        name = nameCellText;
      }

      const grade = !isScratched ? gradeOrStatus : '';
      const style = $(tds[7 + indexOffset]).text().trim();
      const gear = parseFloat($(tds[8 + indexOffset]).text().trim());
      const score = parseFloat($(tds[9 + indexOffset]).text().trim());

      riders.push({
        mark,
        bracket,
        number,
        name,
        pref,
        age,
        term,
        grade,
        style,
        gear: isNaN(gear) ? null : gear,
        score: isNaN(score) ? null : score,
        isScratched
      });
    });
  }

  return { raceId, venue, riders };
}

module.exports = { scrapeRace };