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

  $('.kaisai-list_contents').each((i, el) => {
    const venueEl = $(el);

    const name = venueEl.find('h3.name').text().trim() || venueEl.find('h3').text().trim();
    const grade = venueEl.find('.icon_grade').text().trim();
    
    const link = venueEl.find('a').attr('href');
    let slug = null;
    if (link) {
        // e.g., /race/maebashi/kaisai-info/F1/
        const pathParts = link.split('/').filter(p => p.length > 0);
        if (pathParts[0] === 'race' && pathParts.length > 1) {
            slug = pathParts[1];
        }
    }

    const days = [];
    const programTable = venueEl.find('.kaisai-program_table');
    if (programTable.length > 0) {
        const races = [];
        programTable.find('td a').each((k, raceEl) => {
            const raceLink = $(raceEl);
            const raceHref = raceLink.attr('href');
            if (raceHref && raceHref.includes('/racedetail/')) {
                const parts = raceHref.split('/');
                const raceIdIndex = parts.indexOf('racedetail') + 1;
                if (parts.length > raceIdIndex && parts[raceIdIndex]) {
                    const raceId = parts[raceIdIndex];
                    const raceNo = parseInt(raceLink.text().trim().replace('R', ''), 10);
                    if (raceId && !isNaN(raceNo)) {
                        races.push({ raceNo, raceId });
                    }
                }
            }
        });
        
        if (races.length > 0) {
            // The structure from the original code had a 'day' label (e.g., "初日").
            // A selector for this was not provided in the update instructions.
            // Using a placeholder label for now.
            days.push({
                label: '開催日',
                races: races.sort((a,b) => a.raceNo - b.raceNo)
            });
        }
    }
    
    if (name && slug) {
        venues.push({ name, slug, grade, days });
    }
  });

  return { date, venues };
}

module.exports = { getKaisai };