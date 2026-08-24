export function SeverityBadge({ severity }) {
  const tones = {
    high: 'bg-red-500/15 text-red-400 border-red-500/30',
    medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    low: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  }
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tones[severity] || tones.low}`}>
      {severity}
    </span>
  )
}

export function ActionPill({ action }) {
  const map = {
    RETRY_PAYMENT: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    SEND_PAYMENT_LINK: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    NOTIFY_CUSTOMER: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    ESCALATE_HUMAN: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    STOP: 'bg-slate-600/20 text-slate-400 border-slate-600/40',
  }
  const label = action?.replace(/_/g, ' ').toLowerCase()
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${map[action] || map.STOP}`}>
      {label}
    </span>
  )
}

export function OutcomeTag({ outcome }) {
  const map = {
    recovered: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    failed: 'text-red-400 bg-red-500/10 border-red-500/30',
    escalated: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    stopped: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
    blocked_by_policy: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  }
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${map[outcome] || map.stopped}`}>
      {outcome?.replace(/_/g, ' ')}
    </span>
  )
}

export function ConfidenceBar({ value }) {
  const tone = value >= 0.75 ? 'bg-emerald-400' : value >= 0.55 ? 'bg-blue-400' : 'bg-amber-400'
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-700">
        <div className={`h-full ${tone}`} style={{ width: `${value * 100}%` }} />
      </div>
      <span className="num text-[11px] text-slate-400">{(value * 100).toFixed(0)}%</span>
    </div>
  )
}

export function KpiCard({ label, value, sub, tone = 'slate' }) {
  const tones = {
    red: 'border-red-500/25 bg-red-500/[0.04]',
    green: 'border-emerald-500/25 bg-emerald-500/[0.04]',
    blue: 'border-blue-500/25 bg-blue-500/[0.04]',
    amber: 'border-amber-500/25 bg-amber-500/[0.04]',
    slate: 'border-slate-800 bg-slate-900/50',
  }
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className="num mt-1.5 text-2xl font-semibold text-slate-100">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

export function Card({ title, children, right }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      {title && (
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
          {right}
        </div>
      )}
      {children}
    </div>
  )
}
