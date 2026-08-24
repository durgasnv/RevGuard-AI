const j = (r) => {
  if (!r.ok) return r.json().then((e) => Promise.reject(e.detail || e))
  return r.json()
}

export const api = {
  health: () => fetch('/api/health').then(j),
  seedDemo: (n = 600) => fetch(`/api/ingest/synthetic?n_total=${n}`, { method: 'POST' }).then(j),
  detect: () => fetch('/api/detect').then(j),
  diagnose: (topN = 8) => fetch(`/api/diagnose?top_n=${topN}`).then(j),
  run: (approvals = []) =>
    fetch('/api/run' + (approvals.length ? '?' + approvals.map((id) => `approve=${id}`).join('&') : ''),
      { method: 'POST' }).then(j),
  state: () => fetch('/api/state').then(j),
  evaluate: () => fetch('/api/evaluate', { method: 'POST' }).then(j),
  reset: () => fetch('/api/reset', { method: 'POST' }).then(j),
}

export const inr = (v) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v)

export const pct = (v, digits = 1) => `${(v * 100).toFixed(digits)}%`
