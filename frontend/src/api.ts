import type { HealthResponse, DetectReport, DiagnoseReport, AppState, Evaluation, Transaction, SummaryResponse } from './types'

const j = async <T,>(r: Response): Promise<T> => {
  if (!r.ok) {
    const e = await r.json()
    return Promise.reject((e as { detail?: unknown }).detail ?? e)
  }
  return r.json() as Promise<T>
}

const get = <T,>(url: string) => fetch(url).then((r) => j<T>(r))
const post = <T,>(url: string) => fetch(url, { method: 'POST' }).then((r) => j<T>(r))

export const api = {
  health: () => get<HealthResponse>('/api/health'),
  seedDemo: (n = 600) => post<unknown>(`/api/ingest/synthetic?n_total=${n}`),
  detect: () => get<DetectReport>('/api/detect'),
  diagnose: (topN = 8) => get<DiagnoseReport>(`/api/diagnose?top_n=${topN}`),
  run: (approvals: string[] = []) =>
    post<unknown>(
      '/api/run' +
        (approvals.length
          ? '?' + approvals.map((id) => `approve=${id}`).join('&')
          : ''),
    ),
  state: () => get<AppState>('/api/state'),
  evaluate: () => post<Evaluation>('/api/evaluate'),
  reset: () => post<unknown>('/api/reset'),
  transactions: (status?: string) =>
    get<Transaction[]>(`/api/transactions${status ? `?status=${status}` : ''}`),
  summary: () => get<SummaryResponse>('/api/summary'),
}

export const inr = (v: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v)

export const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`
