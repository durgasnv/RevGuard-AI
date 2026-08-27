import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from '../api'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function jsonResponse(data: unknown, ok = true) {
  return {
    ok,
    json: () => Promise.resolve(data),
  }
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('api helper functions', () => {
  it('inr formats Indian Rupees', async () => {
    const { inr } = await import('../api')
    expect(inr(123456)).toContain('1')
    expect(inr(0)).toContain('0')
  })

  it('pct formats percentages', async () => {
    const { pct } = await import('../api')
    expect(pct(0.75)).toBe('75.0%')
    expect(pct(1, 2)).toBe('100.00%')
  })
})

describe('api.health', () => {
  it('fetches health endpoint', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ status: 'ok', transactions_in_store: 10 }))
    const result = await api.health()
    expect(mockFetch).toHaveBeenCalledWith('/api/health')
    expect(result).toEqual({ status: 'ok', transactions_in_store: 10 })
  })
})

describe('api.detect', () => {
  it('fetches detect endpoint', async () => {
    const report = { clusters: [], revenue_at_risk_inr: 0, expected_recoverable_inr: 0, unrecoverable_inr: 0, failed_count: 0, transactions_analyzed: 0 }
    mockFetch.mockResolvedValue(jsonResponse(report))
    const result = await api.detect()
    expect(mockFetch).toHaveBeenCalledWith('/api/detect')
    expect(result.clusters).toEqual([])
  })
})

describe('api.seedDemo', () => {
  it('posts to synthetic endpoint with n_total', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}))
    await api.seedDemo(300)
    expect(mockFetch).toHaveBeenCalledWith('/api/ingest/synthetic?n_total=300', { method: 'POST' })
  })

  it('defaults to 600', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}))
    await api.seedDemo()
    expect(mockFetch).toHaveBeenCalledWith('/api/ingest/synthetic?n_total=600', { method: 'POST' })
  })
})

describe('api.run', () => {
  it('posts without approvals', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}))
    await api.run()
    expect(mockFetch).toHaveBeenCalledWith('/api/run', { method: 'POST' })
  })

  it('posts with approvals', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}))
    await api.run(['txn1', 'txn2'])
    expect(mockFetch).toHaveBeenCalledWith('/api/run?approve=txn1&approve=txn2', { method: 'POST' })
  })
})

describe('api.transactions', () => {
  it('fetches all transactions', async () => {
    mockFetch.mockResolvedValue(jsonResponse([]))
    await api.transactions()
    expect(mockFetch).toHaveBeenCalledWith('/api/transactions')
  })

  it('fetches filtered transactions', async () => {
    mockFetch.mockResolvedValue(jsonResponse([]))
    await api.transactions('failed')
    expect(mockFetch).toHaveBeenCalledWith('/api/transactions?status=failed')
  })
})

describe('error handling', () => {
  it('rejects on non-ok response with detail', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ detail: 'not found' }),
    })
    await expect(api.health()).rejects.toBe('not found')
  })

  it('rejects on non-ok response without detail', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'error' }),
    })
    await expect(api.health()).rejects.toEqual({ message: 'error' })
  })
})
