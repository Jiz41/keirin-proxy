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

  // ページタイトルの「○○競輪 レース詳細」から競輪場名を抽出
  const titleText = $('title').text();
  const venueMatch = titleText.match(/(.+)競輪 レース詳細/);
  const venue = venueMatch ? venueMatch[1] : '';

  const riders = [];
  let raceTable = null;

  // 最初のth列に「予想」を含み、「周回」を含まないテーブルを対象とする
  $('table').each((i, table) => {
      const thText = $(table).find('th').first().text();
      if (thText.includes('予想') && !thText.includes('周回')) {
          raceTable = table;
          return false; // ループを抜ける
      }
  });

  if (raceTable) {
    $(raceTable).find('tbody tr').each((i, el) => {
      const rowText = $(el).text();

      // 「誘導員」という文字を含む行はスキップ
      if (rowText.includes('誘導員')) {
        return; // 次の行へ
      }

      const tds = $(el).find('td');
      if (tds.length === 0) {
        return; // tdがない行はスキップ
      }

      // 行内に「欠」という文字が含まれる場合 isScratched: true
      const isScratched = rowText.includes('欠');

      const mark = $(tds[0]).text().trim();
      const bracket = parseInt($(tds[3]).text().trim());
      const number = parseInt($(tds[4]).text().trim());
      
      // numberがnullまたはNaNの行はスキップ
      if (!number || isNaN(number)) return;

      // td[4]のテキストが数字1〜9なら正常、そうでなければtd[5]にずれている
      const nameCheck = parseInt($(tds[4]).text().trim());
      const nameCellText = (!isNaN(nameCheck) && nameCheck >= 1 && nameCheck <= 9)
        ? $(tds[5]).text().replace(/　/g, ' ').trim()
        : $(tds[4]).text().replace(/　/g, ' ').trim();
      
      // 空白2つ以上で分割
      const nameParts = nameCellText.split(/\s{2,}/).map(s => s.trim());
      const name = nameParts[0];
      
      let pref = null;
      let age = null;
      let term = null;

      if (nameParts.length > 1) {
        const details = nameParts[1].split('/');
        pref = (details[0] || '').replace(/\s/g, '').trim() || null;
        age = parseInt(details[1]) || null;
        term = parseInt(details[2]) || null;
      }

      const grade = $(tds[6]).text().trim();
      const style = $(tds[7]).text().trim();
      const gear = parseFloat($(tds[8]).text().trim());
      const score = parseFloat($(tds[9]).text().trim());

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
        gear,
        score,
        isScratched
      });
    });
  }

  return { raceId, venue, riders };
}

module.exports = { scrapeRace };