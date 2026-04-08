import { loadNewsData } from './lib/api.js';
import { loadState, saveState } from './lib/state.js';
import { applyFilters, groupByBucket } from './lib/filters.js';
import { normalizeDataset, buildTopicLabels } from './lib/normalize.js';
import { fillTopicSelect, renderBucket, renderSignalBox, renderSourceStats } from './lib/render.js';

const els = {
  generatedAt: document.getElementById('generatedAt'),
  itemCount: document.getElementById('itemCount'),
  sourceCount: document.getElementById('sourceCount'),
  prioritizedChip: document.getElementById('prioritizedChip'),
  searchInput: document.getElementById('searchInput'),
  bucketFilter: document.getElementById('bucketFilter'),
  topicFilter: document.getElementById('topicFilter'),
  prioritizedList: document.getElementById('prioritizedList'),
  monitorList: document.getElementById('monitorList'),
  referenceList: document.getElementById('referenceList'),
  prioritizedCount: document.getElementById('prioritizedCount'),
  monitorCount: document.getElementById('monitorCount'),
  referenceCount: document.getElementById('referenceCount'),
  signalBox: document.getElementById('signalBox'),
  sourceStatsBox: document.getElementById('sourceStatsBox'),
  notesInput: document.getElementById('notesInput'),
  saveNotesBtn: document.getElementById('saveNotesBtn')
};

let dataset = null;
let topicLabels = {};

init().catch((error) => {
  els.prioritizedList.innerHTML = `<div class="empty">${error.message}</div>`;
  els.monitorList.innerHTML = '<div class="empty">Keine Daten.</div>';
  els.referenceList.innerHTML = '<div class="empty">Keine Daten.</div>';
});

async function init() {
  const state = loadState();
  els.searchInput.value = state.query || '';
  els.bucketFilter.value = state.bucket || 'all';
  els.notesInput.value = state.notes || '';

  const rawDataset = await loadNewsData();
  dataset = normalizeDataset(rawDataset);
  topicLabels = buildTopicLabels(dataset.items);

  fillTopicSelect(els.topicFilter, dataset.items, topicLabels);
  els.topicFilter.value = state.topic || 'all';

  els.generatedAt.textContent = dataset.generatedAt
    ? `Stand ${new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dataset.generatedAt))}`
    : 'Kein Datenstand';
  els.itemCount.textContent = `${dataset.totals?.items || dataset.items.length || 0} Meldungen`;
  els.sourceCount.textContent = `${dataset.totals?.sources || dataset.sourceStats.length || 0} Quellen`;

  bindEvents();
  render();
}

function bindEvents() {
  els.searchInput.addEventListener('input', render);
  els.bucketFilter.addEventListener('change', render);
  els.topicFilter.addEventListener('change', render);
  els.saveNotesBtn.addEventListener('click', () => {
    persist();
    els.saveNotesBtn.textContent = 'Gespeichert';
    window.setTimeout(() => {
      els.saveNotesBtn.textContent = 'Notizen speichern';
    }, 900);
  });
}

function render() {
  const filters = currentFilters();
  const filteredItems = applyFilters(dataset.items, filters);
  const grouped = groupByBucket(filteredItems);

  renderBucket(els.prioritizedList, grouped.prioritized, topicLabels);
  renderBucket(els.monitorList, grouped.monitor, topicLabels);
  renderBucket(els.referenceList, grouped.reference, topicLabels);
  renderSignalBox(els.signalBox, dataset.signalSummary, topicLabels);
  renderSourceStats(els.sourceStatsBox, dataset.sourceStats);

  els.prioritizedCount.textContent = String(grouped.prioritized.length);
  els.monitorCount.textContent = String(grouped.monitor.length);
  els.referenceCount.textContent = String(grouped.reference.length);
  els.prioritizedChip.textContent = `${grouped.prioritized.length} priorisiert`;

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
