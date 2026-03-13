const { getKaisai } = require('./kaisai.js');

let venueMapCache = null;
let lastUpdated = null;
let isUpdating = false;

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 開催情報をスキャンし、VENUE_MAPキャッシュを再構築する
 */
async function updateVenueMap() {
    if (isUpdating) return;
    isUpdating = true;
    console.log('Starting VENUE_MAP update scan...');

    try {
        const newVenueMap = {};
        const today = new Date();
        const promises = [];

        // 過去30日～未来30日の計60日分をスキャン対象とする
        for (let i = -30; i <= 30; i++) {
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + i);
            const dateString = `${targetDate.getFullYear()}${String(targetDate.getMonth() + 1).padStart(2, '0')}${String(targetDate.getDate()).padStart(2, '0')}`;
            promises.push(getKaisai(dateString));
        }

        const results = await Promise.all(promises);

        // 階層構造を正しくパースしてVENUE_MAPを構築する
        results.forEach(result => {
            if (!result || !result.venues) return;
            result.venues.forEach(venue => {
                if (!venue.slug || !venue.days) return;
                venue.days.forEach(day => {
                    if (!day.races) return;
                    day.races.forEach(race => {
                        if (!race.raceId) return;
                        const venueCode = String(race.raceId).substring(0, 2);
                        if (!newVenueMap[venueCode]) {
                            newVenueMap[venueCode] = venue.slug;
                        }
                    });
                });
            });
        });

        if (Object.keys(newVenueMap).length > 0) {
            venueMapCache = newVenueMap;
            lastUpdated = Date.now();
            console.log(`VENUE_MAP update complete. Found ${Object.keys(newVenueMap).length} venues.`);
        } else {
            console.log('VENUE_MAP update: No venues found in scan range. Cache not updated.');
        }
    } catch (error) {
        console.error('Failed to update VENUE_MAP:', error);
    } finally {
        isUpdating = false;
    }
}

/**
 * VENUE_MAP（場コードと場名の対応表）を取得する。
 * キャッシュが存在しない、または古い場合は自動的に更新処理を開始する。
 * @returns {Promise<Object>} VENUE_MAPオブジェクト
 */
async function getVenueMap() {
    const now = Date.now();
    const isCacheStale = !lastUpdated || (now - lastUpdated > SEVEN_DAYS_IN_MS);

    // 初回起動時（キャッシュが空）
    if (!venueMapCache) {
        // 他のプロセスが更新中の場合は待機
        while (isUpdating) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        // それでもキャッシュがなければ、このプロセスが責任をもって更新し、完了を待つ
        if (!venueMapCache) {
            console.log('Initial VENUE_MAP cache is empty. Blocking until update is complete...');
            await updateVenueMap();
        }
        return venueMapCache;
    }

    // キャッシュが古い場合、バックグラウンドで更新を開始（リクエストはブロックしない）
    if (isCacheStale && !isUpdating) {
        console.log('VENUE_MAP is stale. Triggering background update.');
        updateVenueMap(); // Fire and forget
    }

    // 常に現在利用可能なキャッシュを返す（古くても）
    return venueMapCache;
}

module.exports = { getVenueMap };
