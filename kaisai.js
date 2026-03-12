const fetch = require('node-fetch');
const cheerio = require('cheerio');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// prettier-ignore
const VENUE_MAP = {
  'hakodate': '函館', 'aomori': '青森', 'iwakitaira': 'いわき平',
  'yahiko': '弥彦', 'maebashi': '前橋', 'toride': '取手',
  'utsunomiya': '宇都宮', 'omiya': '大宮', 'seibuen': '西武園',
  'keiokaku': '京王閣', 'tachikawa': '立川', 'matsudo': '松戸',
  'chiba': '千葉', 'kawasaki': '川崎', 'hiratsuka': '平塚',
  'odawara': '小田原', 'ito': '伊東', 'shizuoka': '静岡',
  'nagoya': '名古屋', 'gifu': '岐阜', 'ogaki': '大垣',
  'toyohashi': '豊橋', 'toyama': '富山', 'matsusaka': '松阪',
  'yokkaichi': '四日市', 'fukui': '福井', 'nara': '奈良',
  'mukomachi': '向日町', 'wakayama': '和歌山', 'kishiwada': '岸和田',
  'tamano': '玉野', 'hiroshima': '広島', 'hofu': '防府',
  'takamatsu': '高松', 'kochi': '高知', 'komatsushima': '小松島',
  'matsuyama': '松山', 'kokura': '小倉', 'kurume': '久留米',
  'takeo': '武雄', 'sasebo': '佐世保', 'beppu': '別府', 'kumamoto': '熊本'
};

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
      // テーブルのキャプションまたは直前要素からlabelを取得し、空白・改行を除去
      const label = ($(table).prev().text().trim() || `${j + 1}日目`).replace(/\s+/g, '');
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

    // gradeを取得（Ｇ１/Ｇ２/Ｇ３/Ｆ１/Ｆ２）
    let grade = '';
    const headingText = $(el).find('h3, h2').first().text();
    const gradeMatch = headingText.match(/[GＧ][123１２３]|[FＦ][12１２]/);
    if (gradeMatch) {
      grade = gradeMatch[0]
        .replace(/Ｇ/g, 'G').replace(/Ｆ/g, 'F')
        .replace(/１/g, '1').replace(/２/g, '2').replace(/３/g, '3');
    }

    venues.push({ name: VENUE_MAP[slug] || slug, slug, grade: grade, days });
  });

  return { date, venues };
}

module.exports = { getKaisai };
