import { formatDate, relativeAge, truncate } from './format.js';

export function fillTopicSelect(select, items, topicLabels) {
  const topics = ['all', ...new Set(items.map((item) => item.topic))];
  select.innerHTML = topics
    .map((topic) => `<option value="${escapeHtml(topic)}">${escapeHtml(topic === 'all' ? 'Alle Themen' : (topicLabels[topic] || topic))}</option>`)
    .join('');
}

export function renderBucket(container, items) {
  if (!items.length) {
    container.innerHTML = '<div class="empty">Keine passenden Meldungen.</div>';
    return;
  }

  container.innerHTML = items.map(renderStoryCard).join('');
}

export function renderRadar(container, radar, topicLabels) {
  const dominantLabel = radar?.dominantTopic ? (topicLabels[radar.dominantTopic.id] || radar.dominantTopic.id) : 'keine klare Dominanz';
  container.innerHTML = [
    { title: 'Dominantes Thema', value: radar?.dominantTopic ? `${dominantLabel} · ${radar.dominantTopic.count} Meldungen` : dominantLabel },
    { title: 'DACH-Signal', value: `${radar?.dachSignals || 0} Meldungen mit DACH-/EU-Bezug` },
    { title: 'Regulatorischer Druck', value: `${radar?.regulationSignals || 0} Meldungen mit Regulierungssignal` },
    { title: 'Operative Relevanz', value: `${radar?.operatorSignals || 0} Meldungen mit Handels-/Logistikbezug` }
  ]
    .map((item) => `<div class="radar-item"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.value)}</span></div>`)
    .join('');
}

export function renderSourceStats(container, sourceStats = []) {
  if (!sourceStats.length) {
    container.innerHTML = '<div class="empty">Keine Quellenstatistik verfügbar.</div>';
    return;
  }

  container.innerHTML = sourceStats
    .map((entry) => `
      <div class="story-card">
        <div class="story-meta">
          <span class="badge">${escapeHtml(entry.feedName)}</span>
          <span class="badge-plain">Ø Score ${escapeHtml(String(entry.avgScore))}</span>
        </div>
        <p>${escapeHtml(`${entry.count} sichtbare Meldungen aus diesem Feed.`)}</p>
      </div>
    `)
    .join('');
}

function renderStoryCard(item) {
  return `
    <article class="story-card">
      <div class="story-meta">
        <span class="badge">${escapeHtml(item.readingClass)}</span>
        <span class="badge-plain">${escapeHtml(item.feedName)}</span>
        <span class="badge-plain">${escapeHtml(item.topic)}</span>
        <span class="badge-plain">Score ${escapeHtml(String(item.score))}</span>
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(truncate(item.summary, 240))}</p>
      <div class="story-actions">
        <div class="story-meta">
          <span class="badge-plain">${escapeHtml(formatDate(item.publishedAt))}</span>
          <span class="badge-plain">${escapeHtml(relativeAge(item.publishedAt))}</span>
        </div>
        <a class="story-link" href="${escapeAttribute(item.url)}" target="_blank" rel="noopener noreferrer">Artikel öffnen</a>
      </div>
    </article>
  `;
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value = '') {
  return escapeHtml(value);
}
