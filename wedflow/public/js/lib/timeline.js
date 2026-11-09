import { toMinutes } from './time.js';
import { esc, fmtDT } from './ui.js';

/**
 * Línea de tiempo horizontal (tipo Gantt). Reconoce turnos que pasan la medianoche:
 * el eje se extiende al día siguiente y se marca la medianoche con una línea punteada.
 * rows: [{ label, sub, bars: [{ start_at, end_at, color, text, title, conflict, long }] }]
 */
export function renderTimeline(container, { rows, activities = [], emptyText = 'Sin turnos para mostrar.' }) {
  const all = rows.flatMap((r) => r.bars);
  if (!all.length) {
    container.innerHTML = `<div class="empty">${esc(emptyText)}</div>`;
    return;
  }
  const starts = [...all, ...activities].map((b) => toMinutes(b.start_at));
  const ends = [...all, ...activities].map((b) => toMinutes(b.end_at));
  const min = Math.floor(Math.min(...starts) / 60) * 60;
  const max = Math.ceil(Math.max(...ends) / 60) * 60;
  const span = Math.max(60, max - min);
  const hours = span / 60;
  const pos = (dt) => ((toMinutes(dt) - min) / span) * 100;
  const hourLabels = [];
  const midnights = [];
  for (let m = min; m < max; m += 60) {
    const h = new Date(m * 60000).getUTCHours();
    if (h === 0 && m !== min) midnights.push(((m - min) / span) * 100);
    hourLabels.push(h === 0 ? '00' : h < 12 ? `${h} a` : h === 12 ? '12 p' : `${h - 12} p`);
  }
  const grid = `grid-template-columns:repeat(${hours}, 1fr)`;
  const bg = `background-size:${100 / hours}% 100%`;
  container.innerHTML = `<div class="timeline"><div class="tl-inner">
    <div class="tl-row" style="min-height:0"><div class="tl-label" style="background:#fcfaf6"><span class="tiny muted">${esc(rows.length)} fila(s)</span></div><div class="tl-hours" style="${grid}">${hourLabels.map((h) => `<div>${h}</div>`).join('')}</div></div>
    ${rows.map((r) => `<div class="tl-row"><div class="tl-label"><b>${esc(r.label)}</b>${r.sub ? `<span class="tiny muted">${r.sub}</span>` : ''}</div>
      <div class="tl-track" style="${bg}">
        ${activities.map((a) => `<div class="tl-act" style="left:${pos(a.start_at)}%;width:${pos(a.end_at) - pos(a.start_at)}%"></div>`).join('')}
        ${midnights.map((m) => `<div class="tl-midnight" style="left:${m}%" title="Medianoche"></div>`).join('')}
        ${r.bars.map((b) => `<div class="tl-bar ${b.conflict ? 'conflict' : ''} ${b.long ? 'long' : ''}" style="left:${pos(b.start_at)}%;width:${Math.max(1.5, pos(b.end_at) - pos(b.start_at))}%;background:${b.color || '#B08D57'}" title="${esc(b.title || `${fmtDT(b.start_at)} – ${fmtDT(b.end_at)}`)}">${esc(b.text || '')}</div>`).join('')}
      </div></div>`).join('')}
    ${activities.length ? `<div class="tl-row" style="min-height:30px"><div class="tl-label"><span class="tiny muted">Actividades</span></div><div class="tl-track" style="${bg}">${activities.map((a) => `<div class="tl-act" style="left:${pos(a.start_at)}%;width:${pos(a.end_at) - pos(a.start_at)}%"><span>${esc(a.name)}</span></div>`).join('')}</div></div>` : ''}
  </div></div>`;
}
