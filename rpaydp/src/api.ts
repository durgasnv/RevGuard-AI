import type { HealthResponse, DetectReport, DiagnoseReport, AppState, Evaluation, Transaction, SummaryResponse, AnalyzeReport } from './types'

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
  analyze: (file: File, format: string) => {
    return fetch(`/api/analyze?format=${format}`, {
      method: 'POST',
      body: file,
      headers: { 'Content-Type': 'application/octet-stream' },
    }).then((r) => j<AnalyzeReport>(r))
  },
  b2bInvoices: () => get<import('./types').B2BResponse>('/api/b2b/invoices'),
  b2bSetPtp: (invoiceId: string, promisedDate: string, promisedAmount: number, notes: string) =>
    fetch(`/api/b2b/invoices/${invoiceId}/ptp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        promised_date: promisedDate,
        promised_amount_inr: promisedAmount,
        notes,
      }),
    }).then((r) => j<{ status: string; invoice: import('./types').B2BInvoice }>(r)),
  b2bChase: (invoiceId: string) =>
    post<{ status: string; action_taken: string; invoice: import('./types').B2BInvoice }>(
      `/api/b2b/invoices/${invoiceId}/chase`,
    ),
  b2bRecover: (invoiceId: string) =>
    post<{ status: string; invoice: import('./types').B2BInvoice }>(
      `/api/b2b/invoices/${invoiceId}/recover`,
    ),
  fireWebhook: (payload: { event: string; amount_inr: number; payment_method: string; error_code: string }) =>
    fetch('/api/webhooks/razorpay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => j<{ status: string; event: import('./types').WebhookEvent }>(r)),
  webhookEvents: () => get<{ events: import('./types').WebhookEvent[] }>('/api/webhooks/events'),
}

export const inr = (v: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v)

export const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`
