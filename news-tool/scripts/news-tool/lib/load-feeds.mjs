import Parser from 'rss-parser';
import fs from 'node:fs/promises';

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'getraenke-news-tool/0.1'
  }
});

export async function loadFeeds() {
  const raw = await fs.readFile(new URL('../../../config/news-tool/feeds.json', import.meta.url), 'utf8');
  return JSON.parse(raw).filter((feed) => feed.enabled);
}

export async function fetchFeedItems(feed) {
  const parsed = await parser.parseURL(feed.url);
  return parsed.items || [];
}
