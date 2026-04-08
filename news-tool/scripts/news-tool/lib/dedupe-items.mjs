export function dedupeItems(items) {
  const exactSeen = new Set();
  const titleSeen = new Set();
  const deduped = [];

  for (const item of items) {
    const exactKey = `${item.url}|${item.title}`.toLowerCase();
    const looseTitle = simplify(item.title);

    if (exactSeen.has(exactKey)) continue;
    if (titleSeen.has(looseTitle)) continue;

    exactSeen.add(exactKey);
    titleSeen.add(looseTitle);
    deduped.push(item);
  }

  return deduped;
}

function simplify(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/\b(update|live|breaking|meinung|kommentar)\b/g, ' ')
    .replace(/[^a-z0-9äöüß]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
