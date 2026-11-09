// Utilidades de tiempo compartidas por el servidor y el navegador.
// Las fechas y horas se manejan como hora local del evento, en texto
// 'YYYY-MM-DDTHH:MM'. Así un turno de 5:00 p. m. a 1:00 a. m. queda
// representado como dos marcas de tiempo de días distintos.

const pad = (n) => String(n).padStart(2, '0');

export function isDate(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));
}

export function isHM(s) {
  if (typeof s !== 'string' || !/^\d{2}:\d{2}$/.test(s)) return false;
  const [h, m] = s.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

export function isDateTime(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) && isDate(s.slice(0, 10)) && isHM(s.slice(11));
}

export function hmToMinutes(s) {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}

export function addDays(date, n) {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Minutos absolutos de una marca 'YYYY-MM-DDTHH:MM' (sin zona horaria). */
export function toMinutes(dt) {
  return Math.round(Date.parse(dt + ':00Z') / 60000);
}

export function fromMinutes(min) {
  const d = new Date(min * 60000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/**
 * Convierte fecha + hora de inicio + hora de fin en un intervalo absoluto.
 * Si la hora de fin es menor o igual que la de inicio, el turno termina al día
 * siguiente (por ejemplo 17:00 → 01:00). `startDayOffset` permite turnos que
 * comienzan después de la medianoche del día del evento.
 */
export function buildInterval(date, start, end, startDayOffset = 0) {
  const startDate = addDays(date, Number(startDayOffset) || 0);
  const s = hmToMinutes(start);
  const e = hmToMinutes(end);
  const endDate = e <= s ? addDays(startDate, 1) : startDate;
  return {
    start_at: `${startDate}T${start}`,
    end_at: `${endDate}T${end}`,
    overnight: endDate !== startDate,
  };
}

export function durationHours(startAt, endAt) {
  return (toMinutes(endAt) - toMinutes(startAt)) / 60;
}

/** Dos intervalos semiabiertos [a, b) se cruzan si a.inicio < b.fin y b.inicio < a.fin. */
export function overlaps(a, b) {
  return toMinutes(a.start_at) < toMinutes(b.end_at) && toMinutes(b.start_at) < toMinutes(a.end_at);
}

/** Une ventanas de disponibilidad que se tocan o se cruzan. */
export function mergeWindows(windows) {
  const list = windows
    .map((w) => [toMinutes(w.start_at), toMinutes(w.end_at)])
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  const out = [];
  for (const [a, b] of list) {
    const last = out[out.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

/** ¿La unión de ventanas cubre por completo el intervalo? */
export function windowsCover(windows, interval) {
  const a = toMinutes(interval.start_at);
  const b = toMinutes(interval.end_at);
  return mergeWindows(windows).some(([x, y]) => x <= a && y >= b);
}

export function formatTime12(hm) {
  if (!hm) return '';
  const [h, m] = hm.split(':').map(Number);
  const suffix = h < 12 ? 'a. m.' : 'p. m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
