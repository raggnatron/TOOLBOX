import fs from 'node:fs/promises';
import { loadFeeds, fetchFeedItems } from './lib/load-feeds.mjs';
import { normalizeItem } from './lib/normalize-item.mjs';
import { dedupeItems } from './lib/dedupe-items.mjs';
import { scoreItem } from './lib/score-item.mjs';

const topicsConfig = JSON.parse(
  await fs.readFile(new URL('../../config/news-tool/topics.json', import.meta.url), 'utf8')
);

async function main() {
  const feeds = await loadFeeds();
  const collected = [];
  const failures = [];

  for (const feed of feeds) {
    try {
      const items = await fetchFeedItems(feed);
      for (const rawItem of items) {
        const normalized = normalizeItem(rawItem, feed, topicsConfig);
        if (!normalized.title || !normalized.url) continue;
        if (normalized.financeLike) continue;
        collected.push(normalized);
      }
    } catch (error) {
      failures.push({ feed: feed.name, message: error.message });
    }
  }

  const deduped = dedupeItems(collected);
  const frequencyMap = buildTitleFrequencyMap(deduped);
  const scored = deduped
    .map((item) => scoreItem(item, topicsConfig, frequencyMap.get(simplify(item.title)) || 1))
    .sort((a, b) => b.score - a.score || sortByDateDesc(a, b));

  const payload = {
    generatedAt: new Date().toISOString(),
    totals: {
      items: scored.length,
      sources: feeds.length,
      failures: failures.length,
      todayImportant: scored.filter((item) => item.bucket === 'today-important').length,
      watch: scored.filter((item) => item.bucket === 'watch').length,
      read: scored.filter((item) => item.bucket === 'read').length
    },
    failures,
    sections: {
      todayImportant: scored.filter((item) => item.bucket === 'today-important').slice(0, 8),
      watch: scored.filter((item) => item.bucket === 'watch').slice(0, 12),
      read: scored.filter((item) => item.bucket === 'read').slice(0, 24)
    },
    radar: buildRadar(scored),
    sourceStats: buildSourceStats(scored),
    items: scored.slice(0, 80)
  };

  await fs.mkdir(new URL('../../news-tool/data/', import.meta.url), { recursive: true });
  await fs.writeFile(
    new URL('../../news-tool/data/latest.json', import.meta.url),
    JSON.stringify(payload, null, 2),
    'utf8'
  );

  console.log(`Generated news-tool/data/latest.json with ${payload.totals.items} items.`);
}

function buildTitleFrequencyMap(items) {
  const map = new Map();
  for (const item of items) {
    const key = simplify(item.title);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

function simplify(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sortByDateDesc(a, b) {
  return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
}

function buildRadar(items) {
  const topicCounts = new Map();
  let dach = 0;
  let regulation = 0;
  let operator = 0;

  for (const item of items) {
    topicCounts.set(item.topic, (topicCounts.get(item.topic) || 0) + 1);
    if (item.dachSignal) dach += 1;
    if (item.regulationSignal) regulation += 1;
    if (item.operatorSignal) operator += 1;
  }

  const dominantTopic = [...topicCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    dominantTopic: dominantTopic ? { id: dominantTopic[0], count: dominantTopic[1] } : null,
    dachSignals: dach,
    regulationSignals: regulation,
    operatorSignals: operator
  };
}

function buildSourceStats(items) {
  const stats = new Map();
  for (const item of items) {
    const current = stats.get(item.feedName) || { feedName: item.feedName, count: 0, avgScore: 0, scores: [] };
    current.count += 1;
    current.scores.push(item.score);
    stats.set(item.feedName, current);
  }

  return [...stats.values()]
    .map((entry) => ({
      feedName: entry.feedName,
      count: entry.count,
      avgScore: Math.round(entry.scores.reduce((sum, value) => sum + value, 0) / entry.scores.length)
    }))
    .sort((a, b) => b.avgScore - a.avgScore || b.count - a.count);
}

await main();
