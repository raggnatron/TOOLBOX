const BUCKET_ALIASES = {
  'today-important': 'prioritized',
  watch: 'monitor',
  read: 'reference',
  prioritized: 'prioritized',
  monitor: 'monitor',
  reference: 'reference'
};

export function applyFilters(items, filters) {
  return items.filter((item) => {
    const bucket = normalizeBucket(item.bucket);

    if (filters.bucket !== 'all' && bucket !== filters.bucket) return false;
    if (filters.topic !== 'all' && item.topic !== filters.topic) return false;

    if (filters.query) {
      const haystack = [
        item.title,
        item.summary,
        item.feedName,
        item.topic,
        item.topicLabel,
        ...(item.searchTerms || []),
        ...(item.signalTags || [])
      ]
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(filters.query)) return false;
    }

    return true;
  });
}

export function groupByBucket(items) {
  const normalized = items.map((item) => ({ ...item, bucket: normalizeBucket(item.bucket) }));

  return {
    prioritized: normalized.filter((item) => item.bucket === 'prioritized'),
    monitor: normalized.filter((item) => item.bucket === 'monitor'),
    reference: normalized.filter((item) => item.bucket === 'reference')
  };
}

export function normalizeBucket(bucket) {
  return BUCKET_ALIASES[bucket] || 'reference';
}
