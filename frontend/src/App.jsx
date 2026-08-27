import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import AuditView from './views/AuditView'
import LeakageView from './views/LeakageView'
import OverviewView from './views/OverviewView'
import QueueView from './views/QueueView'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'leakage', label: 'Revenue Leakage' },
  { id: 'queue', label: 'Recovery Queue' },
  { id: 'audit', label: 'Audit Trail' },
]

export default function App() {
  const [tab, setTab] = useState('overview')
  const [boot, setBoot] = useState('checking') // checking | empty | ready
  const [detectReport, setDetectReport] = useState(null)
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const [report, st] = await Promise.all([api.detect(), api.state()])
    setDetectReport(report)
    setState(st)
  }, [])

  useEffect(() => {
    api.health().then((h) => setBoot(h.transactions_in_store > 0 ? 'ready' : 'empty'))
  }, [])

  async function loadDemo() {
    setBusy(true)
    try {
      await api.seedDemo(600)
      await refresh()
      await api.run()
      setState(await api.state())
      setBoot('ready')
    } catch (e) {
      console.error('loadDemo failed:', e)
    } finally {
      setBusy(false)
    }
  }

  const runRecovery = useCallback(async () => {
    setBusy(true)
    try {
      await api.run()
      await refresh()
    } finally {
      setBusy(false)
    }
  }, [refresh])

  if (boot === 'checking') {
    return <div className="flex h-screen items-center justify-center text-sm text-slate-500">connecting to control tower…</div>
  }

  if (boot === 'empty') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <div className="text-4xl font-bold tracking-tight text-slate-200">
          Rev<span className="text-blue-400">Guard</span>
        </div>
        <p className="max-w-md text-center text-sm leading-relaxed text-slate-500">
          Revenue Recovery Control Tower. Load a synthetic batch of payment
          events to see leakage detection, AI diagnosis and bounded recovery in action.
        </p>
        <button onClick={loadDemo} disabled={busy}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
          {busy ? 'Generating batch…' : 'Load demo batch (600 txns)'}
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl p-5">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-100">
            Rev<span className="text-blue-400">Guard</span>{' '}
            <span className="font-normal text-slate-500">· Revenue Recovery Control Tower</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={runRecovery} disabled={busy}
            className="rounded-lg bg-emerald-600/90 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
            {busy ? 'Running…' : '▶ Run recovery cycle'}
          </button>
          <button onClick={async () => { await api.reset(); location.reload() }}
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:text-slate-200">
            Reset demo
          </button>
        </div>
      </header>

      <nav className="mb-5 flex gap-1 border-b border-slate-800 pb-px">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-4 py-2 text-sm transition-colors ${
              tab === t.id
                ? 'border-x border-t border-slate-800 bg-slate-900/80 font-medium text-slate-100'
                : 'text-slate-500 hover:text-slate-300'
            }`}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && <OverviewView detectReport={detectReport} goLeakage={() => setTab('leakage')} />}
      {tab === 'leakage' && <LeakageView detectReport={detectReport} />}
      {tab === 'queue' && <QueueView state={state} onRun={runRecovery} />}
      {tab === 'audit' && <AuditView state={state} />}

      <footer className="mt-8 border-t border-slate-800/60 pt-3 text-[11px] text-slate-600">
        Test-mode simulation only — no real-money transactions (SC-01). All financial actions bounded by deterministic policy.
      </footer>
    </div>
  )
}
