export function formatDate(value) {
  if (!value) return 'ohne Datum';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'ohne Datum';
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function relativeAge(value) {
  if (!value) return 'ohne Zeit';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'ohne Zeit';

  const hours = Math.max(0, Math.floor((Date.now() - date.getTime()) / 36e5));
  if (hours < 1) return 'gerade eben';
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return `vor ${days} Tag${days === 1 ? '' : 'en'}`;
}

export function truncate(text = '', max = 220) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
