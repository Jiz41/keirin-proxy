## `kaisai.js`のgetKaisai()返り値の構造分析

### 結論

`getKaisai()`が返すオブジェクトは、レースオブジェクトのフラットな配列ではなく、開催日と開催場に基づいた階層構造を持っています。

この調査の結果、先日実装した`venueManager.js`の`updateVenueMap`関数が、このデータ構造を正しく解釈できておらず、**`VENUE_MAP`の自動更新が正常に機能しない**重大なバグを含んでいることが判明しました。

### 1. `getKaisai()`が返すオブジェクト構造

`kaisai.js`の`getKaisai(date)`関数は、指定された日付の開催情報をスクレイピングし、以下のような構造のオブジェクトを返します。

```json
{
  "date": "20240521",
  "venues": [
    {
      "name": "平塚",
      "slug": "hiratsuka",
      "grade": "G3",
      "days": [
        {
          "label": "初日",
          "races": [
            {
              "raceNo": 1,
              "raceId": "352024052101"
            },
            {
              "raceNo": 2,
              "raceId": "352024052102"
            }
            // ... more races
          ]
        }
        // ... more days
      ]
    },
    // ... more venues
  ]
}
```

### 2. `raceId`と`slug`フィールドの存在と形式

ご質問の点について、以下の通りです。

*   **`slug`フィールド:**
    *   `venues`配列内の各会場オブジェクトに`slug`フィールド（例: `"slug": "hiratsuka"`）が存在します。
*   **`raceId`フィールド:**
    *   `venues`配列 → `days`配列 → `races`配列、と深くネストした先の各レースオブジェクト内に`raceId`フィールドが存在します。
    *   **`getKaisai()`が返すトップレベルのオブジェクトや、`venues`オブジェクトの直下には`raceId`は存在しません。**

*   **`raceId`の形式:**
    *   `raceId`の形式は、ご認識の通り「**先頭2桁が場コード**」で間違いありません。（例: `"35..."`）

### 3. `venueManager.js`におけるバグ

`venueManager.js`の`updateVenueMap`関数では、`getKaisai()`の返り値を`Promise.all`で受け取った後、`results.flat()`で平坦化し、その各要素に`raceId`と`slug`が直接含まれていると仮定していました。

**▼ 問題のコード (`venueManager.js`)**
```javascript
const results = await Promise.all(promises);
const allKaisai = results.flat(); // resultsは[{date, venues}, ...]であり、この処理は意図通りに動作しない

allKaisai.forEach(kaisai => {
    // kaisaiは{date, venues}であり、raceIdとslugを持たないため、このifブロックは常に実行されない
    if (kaisai && kaisai.raceId && kaisai.slug) { 
        const venueCode = kaisai.raceId.substring(0, 2);
        newVenueMap[venueCode] = kaisai.slug;
    }
});
```

このロジックでは`newVenueMap`が空のままとなり、キャッシュが更新されることはありません。早急な修正が必要です。
