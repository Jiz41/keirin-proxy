const fetch = require('node-fetch');
const cheerio = require('cheerio');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getKaisai(date) {
  const year = date.slice(0, 4);
  const month = date.slice(4, 6);
  const day = date.slice(6, 8);
  const url = `https://keirin.kdreams.jp/kaisai/${year}/${month}/${day}/`;

  await sleep(1000);
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; keirin-proxy/1.0)' }
  });
  const body = await response.text();
  const $ = cheerio.load(body);

  const venues = [];

  $('.kaisai-list_contents').each((i, el) => {
    const days = [];

    $(el).find('.kaisai-program_table').each((j, table) => {
      // テーブルのキャプションまたは直前要素からlabelを取得
      const label = $(table).prev().text().trim() || `${j + 1}日目`;
      const races = [];

      $(table).find('a').each((k, a) => {
        const href = $(a).attr('href') || '';
        if (href.includes('/racedetail/')) {
          const parts = href.split('/');
          const raceId = parts[parts.length - 2];
          const raceNo = parseInt(raceId.slice(-2), 10);
          // 重複除去
          if (!races.find(r => r.raceId === raceId)) {
            races.push({ raceNo, raceId });
          }
        }
      });

      if (races.length > 0) {
        days.push({ label, races });
      }
    });

    // slugをracecard URLから取得
    let slug = '';
    $(el).find('a').each((k, a) => {
      const href = $(a).attr('href') || '';
      if (href.includes('/racecard/')) {
        slug = href.split('/')[3];
        return false;
      }
    });

    venues.push({ name: slug, slug, grade: '', days });
  });

  return { date, venues };
}

module.exports = { getKaisai };