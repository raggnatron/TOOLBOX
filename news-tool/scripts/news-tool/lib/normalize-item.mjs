import crypto from 'node:crypto';

export function stripHtml(input = '') {
  return String(input)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeItem(rawItem, feed, topicsConfig) {
  const title = String(rawItem.title || '').trim();
  const summary = stripHtml(rawItem.contentSnippet || rawItem.content || rawItem.summary || rawItem.description || '');
  const url = String(rawItem.link || '').trim();
  const publishedAt = rawItem.isoDate || rawItem.pubDate || null;
  const topic = detectTopic({ title, summary }, feed.topic, topicsConfig);
  const domain = getDomain(url);

  return {
    id: crypto.createHash('sha1').update(`${title}|${url}`).digest('hex').slice(0, 12),
    title,
    summary,
    url,
    domain,
    publishedAt,
    topic,
    feedId: feed.id,
    feedName: feed.name,
    feedKind: feed.kind,
    basePriority: feed.basePriority || 1,
    dachSignal: hasDachSignal(`${title} ${summary}`),
    operatorSignal: hasOperatorSignal(`${title} ${summary}`),
    regulationSignal: hasRegulationSignal(`${title} ${summary}`),
    launchSignal: hasLaunchSignal(`${title} ${summary}`),
    financeLike: isFinanceLike(`${title} ${summary}`)
  };
}

function detectTopic(item, fallbackTopic, topicsConfig) {
  const haystack = `${item.title} ${item.summary}`.toLowerCase();
  for (const [topicId, topic] of Object.entries(topicsConfig)) {
    if ((topic.keywords || []).some((keyword) => haystack.includes(String(keyword).toLowerCase()))) {
      return topicId;
    }
  }
  return fallbackTopic || 'market';
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unbekannt';
  }
}

function hasDachSignal(text) {
  return /\b(deutschland|deutsch|österreich|schweiz|dach|eu|europa|bayern|berlin|österreichisch|schweizer)\b/i.test(text);
}

function hasOperatorSignal(text) {
  return /\b(handel|retail|sortiment|distribution|logistik|gastro|filiale|wholesale|mehrweg|preis|lieferkette|listung)\b/i.test(text);
}

function hasRegulationSignal(text) {
  return /\b(gesetz|verordnung|pfand|steuer|kennzeichnung|regulierung|compliance|gericht|court|lobby|ban)\b/i.test(text);
}

function hasLaunchSignal(text) {
  return /\b(launch|neuheit|new product|debut|line extension|range|innovation|produktneuheit)\b/i.test(text);
}

function isFinanceLike(text) {
  return /\b(aktie|aktien|aktienkurs|börse|boerse|nasdaq|dax|dividende|anleger|broker|wertpapier|outperform|underperform|analyst)\b/i.test(text);
}
