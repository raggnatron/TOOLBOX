export function scoreItem(item, topicsConfig, sourceFrequency = 1) {
  const now = Date.now();
  const published = item.publishedAt ? new Date(item.publishedAt).getTime() : null;
  const ageHours = published ? Math.max(0, Math.round((now - published) / 36e5)) : 999;
  const topicWeight = topicsConfig[item.topic]?.weight || 1;

  let score = 0;

  score += recencyScore(ageHours);
  score += sourceWeight(item.basePriority);
  score += topicWeight * 12;
  score += item.dachSignal ? 14 : 0;
  score += item.operatorSignal ? 14 : 0;
  score += item.regulationSignal ? 18 : 0;
  score += item.launchSignal ? 6 : 0;
  score += sourceFrequency >= 2 ? 10 : 0;
  score += sourceFrequency >= 3 ? 8 : 0;

  const bucket = classify(score, item);

  return {
    ...item,
    ageHours,
    score: Math.round(score),
    bucket,
    readingClass: bucketToReadingClass(bucket)
  };
}

function recencyScore(ageHours) {
  if (ageHours <= 12) return 28;
  if (ageHours <= 24) return 22;
  if (ageHours <= 48) return 16;
  if (ageHours <= 72) return 10;
  if (ageHours <= 168) return 4;
  return 0;
}

function sourceWeight(basePriority) {
  return Math.round((basePriority || 1) * 10);
}

function classify(score, item) {
  if (item.regulationSignal && item.dachSignal && score >= 58) return 'today-important';
  if (item.operatorSignal && item.dachSignal && score >= 54) return 'today-important';
  if (score >= 60) return 'today-important';
  if (score >= 40) return 'watch';
  if (score >= 24) return 'read';
  return 'low';
}

function bucketToReadingClass(bucket) {
  if (bucket === 'today-important') return 'heute wichtig';
  if (bucket === 'watch') return 'beobachten';
  if (bucket === 'read') return 'lesen';
  return 'unwichtig';
}
