export function applyFilters(items, filters) {
  return items.filter((item) => {
    if (filters.bucket !== 'all' && item.bucket !== filters.bucket) return false;
    if (filters.topic !== 'all' && item.topic !== filters.topic) return false;
    if (filters.query) {
      const haystack = `${item.title} ${item.summary} ${item.feedName} ${item.topic}`.toLowerCase();
      if (!haystack.includes(filters.query)) return false;
    }
    return true;
  });
}

export function groupByBucket(items) {
  return {
    todayImportant: items.filter((item) => item.bucket === 'today-important'),
    watch: items.filter((item) => item.bucket === 'watch'),
    read: items.filter((item) => item.bucket === 'read')
  };
}
