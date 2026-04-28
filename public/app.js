export function $(sel, root = document) { return root.querySelector(sel); }
export function $all(sel, root = document) { return [...root.querySelectorAll(sel)]; }
export function joinCodeFromPath() { return location.pathname.split('/').filter(Boolean).pop(); }
export function getToken(key) {
  let token = localStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(key, token);
  }
  return token;
}
export async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
export function fmtPct(n) { return `${Math.round(Number(n || 0) * 100)}%`; }
export function fmtCoC(n) {
  const v = Number(n || 0);
  if (Math.abs(v) < 0.03) return '0.00 aligned';
  return `${v > 0 ? '+' : ''}${v.toFixed(2)} ${v > 0 ? 'overconfident' : 'underconfident'}`;
}
export function fmtMs(ms) {
  if (ms == null) return '—';
  return `${Math.ceil(ms / 1000)}s`;
}
export function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
export function jitter(ms) { return Math.max(500, Number(ms || 1000) + Math.round(Math.random() * 400 - 200)); }
