const fetch = require('node-fetch');
const cheerio = require('cheerio');

/**
 * 指定された日付の開催情報を取得する
 * @param {string} date - YYYY/MM/DD 形式の日付文字列
 * @returns {Promise<object>} - 開催情報
 */
async function getKaisai(date) {
  const url = `https://keirin.kdreams.jp/kaisai/${date}/`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; keirin-proxy/1.0)' }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch kaisai data for ${date}: ${response.statusText}`);
  }

  const body = await response.text();
  const $ = cheerio.load(body);

  const venues = [];

  // 各開催場は .kaisai-list_contents で囲まれている
  $('.kaisai-list_contents').each((i, venueContentEl) => {
    const venueEl = $(venueContentEl);

    // まずは slug を探す。これがないと始まらない
    let slug = '';
    const firstRaceHref = venueEl.find('a[href*="/racedetail/"]').first().attr('href');
    if (firstRaceHref) {
        // 例: /iwakitaira/racedetail/1320260309010001/
        const parts = firstRaceHref.split('/').filter(p => p);
        if(parts.length > 1) {
            slug = parts[0];
        }
    }

    if (!slug) {
      return; // slugが取れないブロックはスキップ
    }

    // 場名とグレードを取得
    // .kaisai-list_contents の直前の兄弟要素に存在する可能性
    const headerEl = venueEl.prev('.kaisai-list_header');
    let name = '';
    let grade = '';

    if (headerEl.length) {
      name = headerEl.find('h2.name').text().trim() || headerEl.find('h2').text().trim();
      grade = headerEl.find('.icon_grade').text().trim();
    }

    // ヘッダーになければコンテンツ内を探す
    if (!grade) {
        grade = venueEl.find('.icon_grade').text().trim();
    }
    
    // 名前が取れなければslugを流用
    if (!name) {
      name = slug;
    }

    const days = [];
    
    // 日次タブのラベルを取得
    const dayLabels = venueEl.find('.kaisai-list_nav-list > li .tab > a').map((i, el) => $(el).text().trim()).get();
    
    // レース一覧テーブルを取得
    const raceTables = venueEl.find('.kaisai-program_table');

    // タブとテーブルを添字で関連付ける
    raceTables.each((index, table) => {
        const tableEl = $(table);
        const label = dayLabels[index] || `Day ${index + 1}`; // ラベルが取れなかった場合のフォールバック
        
        const races = [];
        tableEl.find('td a[href*="/racedetail/"]').each((i, raceLink) => {
            const href = $(raceLink).attr('href');
            // 例: /iwakitaira/racedetail/1320260309010001/
            const parts = href.split('/').filter(p => p);
            if (parts.length >= 3 && parts[1] === 'racedetail') {
                const raceId = parts[2];
                const raceNo = parseInt(raceId.slice(-2), 10);
                if (raceId && !isNaN(raceNo)) {
                    races.push({ raceNo, raceId });
                }
            }
        });

        if (races.length > 0) {
            days.push({
                label,
                races: races.sort((a,b) => a.raceNo - b.raceNo)
            });
        }
    });
    
    venues.push({ name, slug, grade, days });
  });

  return { date, venues };
}

module.exports = { getKaisai };
