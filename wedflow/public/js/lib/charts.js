// Gráficos con Chart.js (servido localmente). Paleta categórica validada para
// daltonismo y contraste sobre fondo blanco, en orden fijo:
// dorado, azul, terracota, violeta. Máximo 4 series por gráfico.
import { money, num } from './ui.js';

export const SERIES = ['#B9862C', '#2E6DB4', '#D0603A', '#7A5BC9'];
const INK = '#1E1B18';
const MUTED = '#7A7068';
const GRID = '#EFE7DB';

let configured = false;
function setup() {
  if (configured || !window.Chart) return;
  const C = window.Chart;
  C.defaults.font.family = "'Manrope', system-ui, sans-serif";
  C.defaults.font.size = 12;
  C.defaults.color = MUTED;
  C.defaults.borderColor = GRID;
  C.defaults.plugins.legend.labels.usePointStyle = true;
  C.defaults.plugins.legend.labels.pointStyle = 'rectRounded';
  C.defaults.plugins.legend.labels.color = INK;
  C.defaults.plugins.legend.position = 'top';
  C.defaults.plugins.legend.align = 'start';
  Object.assign(C.defaults.plugins.tooltip, {
    backgroundColor: '#1E1B18', titleColor: '#fff', bodyColor: '#EFE8DD', padding: 10, cornerRadius: 8,
    boxPadding: 4, titleFont: { weight: '700' }, displayColors: true,
  });
  C.defaults.maintainAspectRatio = false;
  configured = true;
}

const registry = new WeakMap();
function draw(canvas, config) {
  setup();
  if (!window.Chart) {
    canvas.replaceWith(Object.assign(document.createElement('p'), { className: 'muted small', textContent: 'No se pudo cargar la librería de gráficos.' }));
    return null;
  }
  registry.get(canvas)?.destroy();
  const chart = new window.Chart(canvas, config);
  registry.set(canvas, chart);
  return chart;
}

const axisMoney = { ticks: { callback: (v) => money(v, { compact: true }) }, grid: { color: GRID }, border: { display: false } };
const axisNum = { ticks: { precision: 0 }, grid: { color: GRID }, border: { display: false } };
const axisCat = { grid: { display: false }, border: { color: '#E2D8CA' }, ticks: { color: INK } };
const barStyle = (color) => ({ backgroundColor: color, hoverBackgroundColor: color, borderRadius: 4, borderSkipped: 'start', maxBarThickness: 34, borderWidth: 0 });

/** Barras de una o varias series (≤ 4). */
export function barChart(canvas, { labels, series, isMoney = false, horizontal = false, stacked = false }) {
  const valueAxis = isMoney ? axisMoney : axisNum;
  return draw(canvas, {
    type: 'bar',
    data: { labels, datasets: series.map((s, i) => ({ label: s.label, data: s.data, ...barStyle(s.color || SERIES[i]) })) },
    options: {
      indexAxis: horizontal ? 'y' : 'x',
      interaction: { mode: 'index', intersect: false },
      scales: horizontal
        ? { x: { ...valueAxis, stacked, beginAtZero: true }, y: { ...axisCat, stacked } }
        : { x: { ...axisCat, stacked }, y: { ...valueAxis, stacked, beginAtZero: true } },
      plugins: {
        legend: { display: series.length > 1 },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${isMoney ? money(c.raw) : num(c.raw, 2)}` } },
      },
    },
  });
}

/** Líneas (≤ 4 series) con cruz de lectura en el índice. */
export function lineChart(canvas, { labels, series, isMoney = false }) {
  return draw(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: series.map((s, i) => ({
        label: s.label, data: s.data, borderColor: s.color || SERIES[i], backgroundColor: s.color || SERIES[i],
        borderWidth: 2, pointRadius: 4, pointHoverRadius: 6, pointBorderColor: '#fff', pointBorderWidth: 2, tension: 0.25,
      })),
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      scales: { x: axisCat, y: { ...(isMoney ? axisMoney : axisNum), beginAtZero: false } },
      plugins: {
        legend: { display: series.length > 1 },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${isMoney ? money(c.raw) : num(c.raw, 2)}` } },
      },
    },
  });
}
