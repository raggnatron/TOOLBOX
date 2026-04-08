import fs from 'node:fs/promises';

export async function loadRelevanceConfig(path = './config/relevance-config.example.json') {
  const raw = await fs.readFile(path, 'utf8');
  return JSON.parse(raw);
}

export function scoreArticle(article, config) {
  const text = normalizeText(`${article.title || ''} ${article.summary || ''}`);

  if (containsAny(text, config.hardExcludeTerms)) {
    return { excluded: true, reason: 'hard_exclude_term' };
  }

  const strengths = {
    dachStrength: detectStrength(text, config.signalLexicon.dach),
    regulationStrength: detectStrength(text, config.signalLexicon.regulation),
    operationalStrength: detectStrength(text, config.signalLexicon.trade),
    tradeStrength: detectStrength(text, config.signalLexicon.trade),
    packagingStrength: detectStrength(text, config.signalLexicon.packaging),
    launchStrength: detectStrength(text, config.signalLexicon.launch),
    sourceQuality: sourceQualityFromTier(article.sourceTier)
  };

  let score = 0;
  score += weightFromBand(config.scoreWeights.dach, strengths.dachStrength);
  score += weightFromBand(config.scoreWeights.regulation, strengths.regulationStrength);
  score += weightFromBand(config.scoreWeights.operational, strengths.operationalStrength);
  score += weightFromBand(config.scoreWeights.trade, strengths.tradeStrength);
  score += weightFromBand(config.scoreWeights.packaging, strengths.packagingStrength);
  score += weightFromBand(config.scoreWeights.launch, strengths.launchStrength);
  score += weightFromBand(config.scoreWeights.sourceQuality, strengths.sourceQuality);

  if (article.isOriginal) score += config.scoreWeights.originalSourceBonus;
  if ((article.crossSourceConfirmation || 0) > 0) score += config.scoreWeights.crossSourceConfirmationBonus;
  score += Math.min(config.scoreWeights.recencyMaxBonus, recencyBonus(article.publishedAt));

  if (containsAny(text, config.downweightPatterns.financeLike)) score -= config.scoreWeights.financePenalty;
  if (containsAny(text, config.downweightPatterns.decorative)) score -= config.scoreWeights.decorativePenalty;
  if (article.sourceTier === 'downweight') score -= config.scoreWeights.lowValuePenalty;

  const bucket = deriveBucket(score, strengths, config.bucketThresholds);

  return {
    excluded: false,
    score,
    bucket,
    ...strengths
  };
}

function normalizeText(value = '') {
  return String(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

function containsAny(text, terms = []) {
  return terms.some((term) => text.includes(String(term).toLowerCase()));
}

function detectStrength(text, lexicon = []) {
  const hits = lexicon.filter((term) => text.includes(String(term).toLowerCase())).length;
  if (hits >= 3) return 3;
  if (hits >= 2) return 2;
  if (hits >= 1) return 1;
  return 0;
}

function sourceQualityFromTier(sourceTier = 'low') {
  return {
    high: 3,
    medium: 2,
    low: 1,
    downweight: 0
  }[sourceTier] ?? 1;
}

function weightFromBand(bands, strength = 0) {
  return Array.isArray(bands) ? (bands[strength] || 0) : 0;
}

function recencyBonus(publishedAt) {
  const timestamp = new Date(publishedAt || 0).getTime();
  if (!timestamp) return 0;
  const hours = Math.max(0, Math.floor((Date.now() - timestamp) / 36e5));
  if (hours <= 6) return 4;
  if (hours <= 18) return 3;
  if (hours <= 36) return 2;
  if (hours <= 72) return 1;
  return 0;
}

function deriveBucket(score, strengths, thresholds) {
  if (
    score >= thresholds.prioritized ||
    strengths.regulationStrength >= 3 ||
    strengths.operationalStrength >= 3 ||
    (strengths.tradeStrength >= 2 && strengths.dachStrength >= 2)
  ) return 'prioritized';

  if (score >= thresholds.monitor || strengths.packagingStrength >= 2 || strengths.dachStrength >= 2) {
    return 'monitor';
  }

  return 'reference';
}
