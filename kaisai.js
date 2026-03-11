const fetch = require('node-fetch');
const cheerio = require('cheerio');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getKaisai(date) {
  const [year, month, day] = [date.slice(0, 4), date.slice(4, 6), date.slice(6, 8)];
  const url = `https://keirin.kdreams.jp/kaisai/${year}/${month}/${day}/`;

  await sleep(1000);
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; keirin-proxy/1.0)' }
  });
  const body = await response.text();
  const $ = cheerio.load(body);

  const venues = [];
  $('.KaisaiDay').each((i, el) => {
    const name = $(el).find('h3').text().trim();
    const slug = $(el).find('a').attr('href').split('/')[1];
    const grade = $(el).find('span.grade').text().trim();
    const days = [];

    $(el).find('ul.KaisaiDay__RaceCard > li').each((j, dayEl) => {
      const label = $(dayEl).find('.KaisaiDay__RaceCard__Kaisai').text().trim();
      const races = [];
      $(dayEl).find('ul.KaisaiDay__RaceCard__RaceList > li').each((k, raceEl) => {
        const raceNo = parseInt($(raceEl).text().trim().replace('R', ''));
        const raceDetailUrl = $(raceEl).find('a').attr('href');
        const raceId = raceDetailUrl.split('/')[3];
        races.push({ raceNo, raceId });
      });
      days.push({ label, races });
    });
    venues.push({ name, slug, grade, days });
  });

  return { date, venues };
}

module.exports = { getKaisai };
