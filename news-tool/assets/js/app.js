import { loadNewsData } from './lib/api.js';
import { loadState, saveState } from './lib/state.js';
import { applyFilters, groupByBucket } from './lib/filters.js';
import { fillTopicSelect, renderBucket, renderRadar, renderSourceStats } from './lib/render.js';

const els = {
  generatedAt: document.getElementById('generatedAt'),
  itemCount: document.getElementById('itemCount'),
  sourceCount: document.getElementById('sourceCount'),
  searchInput: document.getElementById('searchInput'),
  bucketFilter: document.getElementById('bucketFilter'),
  topicFilter: document.getElementById('topicFilter'),
  todayImportantList: document.getElementById('todayImportantList'),
  watchList: document.getElementById('watchList'),
  readList: document.getElementById('readList'),
  todayImportantCount: document.getElementById('todayImportantCount'),
  watchCount: document.getElementById('watchCount'),
  readCount: document.getElementById('readCount'),
  radarBox: document.getElementById('radarBox'),
  sourceStatsBox: document.getElementById('sourceStatsBox'),
  notesInput: document.getElementById('notesInput'),
  saveNotesBtn: document.getElementById('saveNotesBtn')
};

let dataset = null;

init().catch((error) => {
  els.todayImportantList.innerHTML = `<div class="empty">${error.message}</div>`;
  els.watchList.innerHTML = '<div class="empty">Keine Daten.</div>';
  els.readList.innerHTML = '<div class="empty">Keine Daten.</div>';
});

async function init() {
  const state = loadState();
  els.searchInput.value = state.query || '';
  els.bucketFilter.value = state.bucket || 'all';
  els.notesInput.value = state.notes || '';

  dataset = await loadNewsData();

  const topicLabels = buildTopicLabels(dataset.items);
  fillTopicSelect(els.topicFilter, dataset.items, topicLabels);
  els.topicFilter.value = state.topic || 'all';

  els.generatedAt.textContent = dataset.generatedAt ? `Stand ${new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dataset.generatedAt))}` : 'Kein Datenstand';
  els.itemCount.textContent = `${dataset.totals?.items || 0} Meldungen`;
  els.sourceCount.textContent = `${dataset.totals?.sources || 0} Quellen`;

  bindEvents(topicLabels);
  render(topicLabels);
}

function bindEvents(topicLabels) {
  els.searchInput.addEventListener('input', () => render(topicLabels));
  els.bucketFilter.addEventListener('change', () => render(topicLabels));
  els.topicFilter.addEventListener('change', () => render(topicLabels));
  els.saveNotesBtn.addEventListener('click', () => {
    persist();
    els.saveNotesBtn.textContent = 'Gespeichert';
    window.setTimeout(() => {
      els.saveNotesBtn.textContent = 'Notizen speichern';
    }, 900);
  });
}

function render(topicLabels) {
  const filters = currentFilters();
  const filteredItems = applyFilters(dataset.items, filters);
  const grouped = groupByBucket(filteredItems);

  renderBucket(els.todayImportantList, grouped.todayImportant.slice(0, 8));
  renderBucket(els.watchList, grouped.watch.slice(0, 12));
  renderBucket(els.readList, grouped.read.slice(0, 24));
  renderRadar(els.radarBox, dataset.radar, topicLabels);
  renderSourceStats(els.sourceStatsBox, dataset.sourceStats);

  els.todayImportantCount.textContent = String(grouped.todayImportant.length);
  els.watchCount.textContent = String(grouped.watch.length);
  els.readCount.textContent = String(grouped.read.length);

  persist();
}

function currentFilters() {
  return {
    query: els.searchInput.value.trim().toLowerCase(),
    bucket: els.bucketFilter.value,
    topic: els.topicFilter.value
  };
}

function persist() {
  saveState({
    ...currentFilters(),
    notes: els.notesInput.value
  });
}

function buildTopicLabels(items) {
  const labels = {
    market: 'Markt',
    packaging: 'Verpackung',
    distribution: 'Distribution',
    alcohol: 'Alkohol',
    nonalcoholic: 'Alkoholfrei',
    regulation: 'Regulierung',
    sustainability: 'Nachhaltigkeit',
    launches: 'Launches'
  };

  for (const item of items) {
    if (!labels[item.topic]) labels[item.topic] = item.topic;
  }

  return labels;
}
