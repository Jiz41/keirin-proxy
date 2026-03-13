/*
 * kaisai.jsには、<option>要素のようなHTMLを直接生成するコードは含まれていません。
 * 代わりに、以下のコードがウェブページから取得した情報を元に、
 * 開催場のデータを持つJavaScriptの配列（リスト）を生成しています。
 * VENUE_MAPは、97行目でslugから日本語の会場名を取得するために利用されています。
 */
const venues = [];

// ナビリンクから slug→grade マップを作成
// 例: "取手Ｇ３" → { toride: 'G3' }
const gradeMap = {};
$('a[href^="#k"]').each((i, a) => {
  const text = $(a).text().trim();
  const gradeMatch = text.match(/[GＧ][123１２３]|[FＦ][12１２]/);
  if (gradeMatch) {
    const grade = gradeMatch[0]
      .replace(/Ｇ/g, 'G').replace(/Ｆ/g, 'F')
      .replace(/１/g, '1').replace(/２/g, '2').replace(/３/g, '3');
    const venueName = text.replace(/[GＧFＦ][123１２３]/g, '').trim();
    gradeMap[venueName] = grade;
  }
});

$('.kaisai-list_contents').each((i, el) => {
  const days = [];

  $(el).find('.kaisai-program_table').each((j, table) => {
    // テーブルの直前の要素から開催日ラベルを取得
    const labelElement = $(table).prev();
    let label = '';

    if (labelElement.is('a')) {
      // 直前がナビゲーションリンクの場合 (例: <a name="k23">2日目</a>)
      label = labelElement.text().trim();
    } else {
      // それ以外の場合 (例: <p class="kaisai-program_title">...<span>初日</span></p>)
      label = labelElement.find('span').text().trim();
    }

    if (!label) {
      // フォールバック
      label = `${j + 1}日目`;
    }

    const races = [];
    $(table).find('tbody tr').each((k, row) => {
      const raceNumTd = $(row).find('td').eq(0);
      const raceNumMatch = raceNumTd.text().match(/(\d{1,2})R/);
      if (raceNumMatch) {
        const raceNum = parseInt(raceNumMatch[1], 10);
        const raceId = $(row).find('td').eq(2).find('a').attr('href').split('/').pop();
        races.push({ raceNum, raceId });
      }
    });
    days.push({ day: j + 1, label, races });
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

  const jaName = VENUE_MAP[slug] || slug;
  const grade = gradeMap[jaName] || '';

  venues.push({ name: VENUE_MAP[slug] || slug, slug, grade: grade, days });
});
