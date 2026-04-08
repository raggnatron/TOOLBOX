export async function loadNewsData() {
  const response = await fetch('./data/latest.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Daten konnten nicht geladen werden (${response.status}).`);
  }
  return response.json();
}
