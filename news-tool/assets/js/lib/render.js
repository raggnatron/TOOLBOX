import { formatDate, relativeAge, truncate, formatStrengthLabel } from './format.js';

export function fillTopicSelect(select, items, topicLabels) {
  const topics = ['all', ...new Set(items.map((item) => item.topic))];
  select.innerHTML = topics
    .map((topic) => `<option value="${escapeHtml(topic)}">${escapeHtml(topic === 'all' ? 'Alle Themen' : (topicLabels[topic] || topic))}</option>`)
    .join('');
}

export function renderBucket(container, items, topicLabels) {
  if (!items.length) {
    container.innerHTML = '<div class="empty">Keine passenden Meldungen.</div>';
    return;
  }

  container.innerHTML = items.map((item) => renderStoryCard(item, topicLabels)).join('');
}

export function renderSignalBox(container, summary, topicLabels) {
  const dominantLabel = summary?.dominantTopic ? (topicLabels[summary.dominantTopic.id] || summary.dominantTopic.id) : 'keine klare Dominanz';

  container.innerHTML = [
    { title: 'Dominantes Feld', value: summary?.dominantTopic ? `${dominantLabel} · ${summary.dominantTopic.count} Meldungen` : dominantLabel },
    { title: 'DACH-Relevanz', value: `${summary?.dachSignals || 0} Meldungen mit klarem DACH-Bezug` },
    { title: 'Regulierung', value: `${summary?.regulationSignals || 0} Meldungen mit starkem Regulierungssignal` },
    { title: 'Operative Relevanz', value: `${summary?.operationalSignals || 0} Meldungen mit klarem Handels-, Logistik- oder Umsetzungsbezug` },
    { title: 'Verpackung', value: `${summary?.packagingSignals || 0} Meldungen mit starkem Verpackungssignal` },
    { title: 'Priorisiert', value: `${summary?.prioritizedCount || 0} Meldungen in der höchsten Arbeitsklasse` }
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
      <div class="story-card source-card">
        <div class="story-meta">
          <span class="badge">${escapeHtml(entry.feedName)}</span>
          <span class="badge-plain">Quellenstufe ${escapeHtml(sourceTierLabel(entry.sourceTier))}</span>
          <span class="badge-plain">Ø Relevanz ${escapeHtml(String(entry.avgScore))}</span>
        </div>
        <p>${escapeHtml(`${entry.count} sichtbare Meldungen in dieser Ausgabe.`)}</p>
      </div>
    `)
    .join('');
}

function renderStoryCard(item, topicLabels) {
  const topicLabel = topicLabels[item.topic] || item.topicLabel || item.topic;
  const sourceLine = item.source?.isOriginal ? 'Originalquelle' : 'Sekundärquelle';
  const visibleTags = (item.signalTags || []).slice(0, 4);

  return `
    <article class="story-card">
      <div class="story-meta">
        <span class="badge">${escapeHtml(item.readingClass)}</span>
        <span class="badge-plain">${escapeHtml(item.feedName || sourceLine)}</span>
        <span class="badge-plain">${escapeHtml(topicLabel)}</span>
        <span class="badge-plain">Quelle ${escapeHtml(sourceTierLabel(item.source?.tier))}</span>
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(truncate(item.summary, 240))}</p>
      <div class="signal-row">
        ${visibleTags.map((tag) => `<span class="signal-pill">${escapeHtml(tag)}</span>`).join('')}
      </div>
      <div class="story-actions">
        <div class="story-meta">
          <span class="badge-plain">${escapeHtml(formatDate(item.publishedAt))}</span>
          <span class="badge-plain">${escapeHtml(relativeAge(item.publishedAt))}</span>
          <span class="badge-plain">DACH ${escapeHtml(formatStrengthLabel(item.strengths?.dachStrength))}</span>
          <span class="badge-plain">Operativ ${escapeHtml(formatStrengthLabel(item.strengths?.operationalStrength || item.strengths?.tradeStrength))}</span>
        </div>
        <a class="story-link" href="${escapeAttribute(item.url)}" target="_blank" rel="noopener noreferrer">Quelle öffnen</a>
      </div>
    </article>
  `;
}

function sourceTierLabel(value = 'unknown') {
  return {
    high: 'hoch',
    medium: 'mittel',
    low: 'niedrig',
    downweight: 'abgewertet',
    unknown: 'offen'
  }[value] || 'offen';
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
