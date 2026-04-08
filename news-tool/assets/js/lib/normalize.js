import { normalizeBucket } from './filters.js';

const DEFAULT_TOPIC_LABELS = {
  market: 'Markt',
  packaging: 'Verpackung',
  distribution: 'Distribution',
  alcohol: 'Alkohol',
  nonalcoholic: 'Alkoholfrei',
  regulation: 'Regulierung',
  sustainability: 'Nachhaltigkeit',
  launches: 'Neuheiten',
  spirits: 'Spirituosen',
  retail: 'Handel'
};

export function buildTopicLabels(items) {
  const labels = { ...DEFAULT_TOPIC_LABELS };

  for (const item of items) {
    if (!labels[item.topic]) labels[item.topic] = item.topicLabel || item.topic;
  }

  return labels;
}

export function normalizeDataset(raw = {}) {
  const items = (raw.items || [])
    .map(normalizeItem)
    .filter((item) => item.bucket !== 'hidden')
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime();
    });

  return {
    generatedAt: raw.generatedAt || null,
    items,
    totals: {
      items: items.length,
      sources: raw.totals?.sources || countSources(items),
      prioritized: items.filter((item) => item.bucket === 'prioritized').length,
      monitor: items.filter((item) => item.bucket === 'monitor').length,
      reference: items.filter((item) => item.bucket === 'reference').length
    },
    signalSummary: buildSignalSummary(raw, items),
    sourceStats: normalizeSourceStats(raw.sourceStats || [], items)
  };
}

function normalizeItem(item = {}) {
  const strengths = normalizeStrengths(item);
  const topicLabel = DEFAULT_TOPIC_LABELS[item.topic] || item.topic || 'Unbekannt';
  const source = normalizeSource(item);
  const bucket = normalizeBucket(item.bucket || deriveBucket(item.score || 0, strengths));
  const signalTags = buildSignalTags(strengths, source);

  return {
    ...item,
    topicLabel,
    bucket,
    readingClass: labelForBucket(bucket),
    score: Number(item.score || 0),
    source,
    strengths,
    signalTags,
    searchTerms: [topicLabel, ...signalTags]
  };
}

function normalizeStrengths(item) {
  const sourceQualityFromTier = {
    high: 3,
    medium: 2,
    low: 1,
    downweight: 0
  };

  return {
    dachStrength: numberOrFallback(item.dachStrength, item.dachSignal ? 2 : 0),
    regulationStrength: numberOrFallback(item.regulationStrength, item.regulationSignal ? 2 : 0),
    operationalStrength: numberOrFallback(item.operationalStrength, item.operatorSignal ? 2 : 0),
    tradeStrength: numberOrFallback(item.tradeStrength, item.operatorSignal ? 2 : 0),
    packagingStrength: numberOrFallback(item.packagingStrength, item.topic === 'packaging' ? 2 : 0),
    launchStrength: numberOrFallback(item.launchStrength, item.launchSignal ? 2 : 0),
    sourceQuality: numberOrFallback(item.sourceQuality, sourceQualityFromTier[item.sourceTier] ?? 1),
    crossSourceConfirmation: numberOrFallback(item.crossSourceConfirmation, 0),
    noisePenalty: numberOrFallback(item.noisePenalty, item.financeLike ? 2 : 0)
  };
}

function normalizeSource(item) {
  return {
    tier: item.sourceTier || 'unknown',
    type: item.sourceType || 'feed',
    isOriginal: Boolean(item.isOriginal),
    domain: item.domain || ''
  };
}

function buildSignalSummary(raw, items) {
  const byTopic = new Map();

  for (const item of items) {
    byTopic.set(item.topic, (byTopic.get(item.topic) || 0) + 1);
  }

  const dominantTopicEntry = [...byTopic.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    dominantTopic: dominantTopicEntry ? { id: dominantTopicEntry[0], count: dominantTopicEntry[1] } : raw.radar?.dominantTopic || null,
    dachSignals: sumBy(items, (item) => item.strengths.dachStrength >= 2),
    regulationSignals: sumBy(items, (item) => item.strengths.regulationStrength >= 2),
    operationalSignals: sumBy(items, (item) => item.strengths.operationalStrength >= 2 || item.strengths.tradeStrength >= 2),
    packagingSignals: sumBy(items, (item) => item.strengths.packagingStrength >= 2),
    prioritizedCount: sumBy(items, (item) => item.bucket === 'prioritized')
  };
}

function normalizeSourceStats(sourceStats, items) {
  if (sourceStats.length) {
    return sourceStats.map((entry) => ({
      feedName: entry.feedName,
      count: entry.count,
      avgScore: entry.avgScore,
      sourceTier: entry.sourceTier || inferTierByAverage(entry.avgScore)
    }));
  }

  const grouped = new Map();
  for (const item of items) {
    const key = item.feedName || item.source.domain || 'Unbekannt';
    const current = grouped.get(key) || { feedName: key, count: 0, totalScore: 0, sourceTier: item.source.tier || 'unknown' };
    current.count += 1;
    current.totalScore += item.score || 0;
    grouped.set(key, current);
  }

  return [...grouped.values()]
    .map((entry) => ({
      feedName: entry.feedName,
      count: entry.count,
      avgScore: Math.round(entry.totalScore / entry.count),
      sourceTier: entry.sourceTier
    }))
    .sort((a, b) => b.avgScore - a.avgScore);
}

function buildSignalTags(strengths, source) {
  const tags = [];

  if (strengths.dachStrength >= 2) tags.push('DACH-Bezug');
  if (strengths.regulationStrength >= 2) tags.push('Regulierung');
  if (strengths.operationalStrength >= 2) tags.push('Operativ');
  if (strengths.tradeStrength >= 2) tags.push('Handel/Distribution');
  if (strengths.packagingStrength >= 2) tags.push('Verpackung');
  if (strengths.launchStrength >= 2) tags.push('Neuheit');
  if (source.isOriginal) tags.push('Originalquelle');
  if (source.tier === 'high') tags.push('Fachquelle hoch');

  return tags;
}

function deriveBucket(score, strengths) {
  if (
    score >= 62 ||
    strengths.regulationStrength >= 3 ||
    strengths.operationalStrength >= 3 ||
    (strengths.tradeStrength >= 2 && strengths.dachStrength >= 2)
  ) {
    return 'prioritized';
  }

  if (
    score >= 36 ||
    strengths.packagingStrength >= 2 ||
    strengths.launchStrength >= 2 ||
    strengths.dachStrength >= 2
  ) {
    return 'monitor';
  }

  return 'reference';
}

function labelForBucket(bucket) {
  return {
    prioritized: 'Priorisiert',
    monitor: 'Beobachtung',
    reference: 'Übersicht'
  }[bucket] || 'Übersicht';
}

function inferTierByAverage(avgScore = 0) {
  if (avgScore >= 60) return 'high';
  if (avgScore >= 40) return 'medium';
  if (avgScore >= 20) return 'low';
  return 'downweight';
}

function numberOrFallback(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function sumBy(items, predicate) {
  return items.reduce((sum, item) => sum + (predicate(item) ? 1 : 0), 0);
}

function countSources(items) {
  return new Set(items.map((item) => item.feedName || item.source.domain || item.domain || item.id)).size;
}
