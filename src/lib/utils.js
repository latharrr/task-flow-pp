// Date and formatting utilities adapted from the prototype

export const STATUS_META = {
  blocked: { label: 'Blocked', bg: '#fef2f2', color: '#ef4444', dot: '#ef4444' },
  inprogress: { label: 'In Progress', bg: '#fffbeb', color: '#f59e0b', dot: '#f59e0b' },
  todo: { label: 'To Do', bg: '#eff6ff', color: '#3b82f6', dot: '#3b82f6' },
  done: { label: 'Done', bg: '#f0fdf4', color: '#22c55e', dot: '#22c55e' },
};

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const PRIORITY_OPTIONS = ['low', 'medium', 'high'];

export function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

export function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

export function addDays(dateStr, n) {
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

export function dayDiff(fromStr, toStr) {
  const a = fromStr.split('-').map(Number);
  const b = toStr.split('-').map(Number);
  const da = new Date(a[0], a[1] - 1, a[2]);
  const db = new Date(b[0], b[1] - 1, b[2]);
  return Math.round((da - db) / 86400000);
}

export function formatDateLabel(dateStr) {
  const parts = dateStr.split('-');
  const day = parseInt(parts[2], 10);
  const month = MONTH_NAMES[parseInt(parts[1], 10) - 1];
  return day + ' ' + month.slice(0, 3);
}

export function formatMinutes(m) {
  if (m <= 0) return '0m';
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h > 0) return h + 'h' + (mm > 0 ? ' ' + mm + 'm' : '');
  return mm + 'm';
}

export function truncate(str, max) {
  if (!str) return '';
  if (str.length <= max) return str;
  return str.slice(0, max) + '…';
}

export function getCapacityLabel(assigned, maxTasks) {
  const ratio = maxTasks > 0 ? assigned / maxTasks : 0;
  if (ratio >= 1) return 'At limit';
  if (ratio >= 0.5) return 'OK';
  return 'Under';
}

export function getCapacityPercent(assigned, maxTasks) {
  if (maxTasks <= 0) return 0;
  return Math.min(100, Math.round((assigned / maxTasks) * 100));
}

export function getTodayHeader() {
  const d = new Date();
  return 'Today, ' + d.getDate() + ' ' + MONTH_NAMES[d.getMonth()].slice(0, 3);
}

export function getMonthLabel(year, month) {
  return MONTH_NAMES[month] + ' ' + year;
}

export function timeAgo(dateStr) {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return diffMin + 'm ago';
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return diffHr + 'h ago';
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  return diffDay + ' days ago';
}
