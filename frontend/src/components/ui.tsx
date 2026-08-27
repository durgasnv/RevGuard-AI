import type { ReactNode } from 'react'
import type { Severity, Action, Outcome } from '../types'

/* ── Badges & Status Indicators ──────────────────────────────────── */

const severityConfig: Record<
  Severity,
  { bg: string; text: string; border: string; dot: string }
> = {
  high: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
    dot: 'bg-rose-500',
  },
  medium: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-300',
    border: 'border-amber-500/20',
    dot: 'bg-amber-500',
  },
  low: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-300',
    border: 'border-slate-500/20',
    dot: 'bg-slate-400',
  },
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const conf = severityConfig[severity] ?? severityConfig.low
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium ${conf.bg} ${conf.text} ${conf.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} />
      <span className="capitalize">{severity}</span>
    </span>
  )
}

const actionConfig: Record<Action, { cls: string; icon: string }> = {
  RETRY_PAYMENT: {
    cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    icon: '↻',
  },
  SEND_PAYMENT_LINK: {
    cls: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
    icon: '↗',
  },
  NOTIFY_CUSTOMER: {
    cls: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
    icon: '✉',
  },
  ESCALATE_HUMAN: {
    cls: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    icon: '⚐',
  },
  STOP: {
    cls: 'bg-slate-800 text-slate-400 border-slate-700',
    icon: '—',
  },
}

export function ActionPill({ action }: { action: Action }) {
  const conf = actionConfig[action] ?? actionConfig.STOP
  const formattedText = action.replace(/_/g, ' ').toLowerCase()

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1 text-[11px] font-medium ${conf.cls}`}
    >
      <span className="text-[10px] font-bold opacity-80">{conf.icon}</span>
      <span className="capitalize">{formattedText}</span>
    </span>
  )
}

const outcomeConfig: Record<Outcome, { cls: string }> = {
  recovered: {
    cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  failed: {
    cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  },
  escalated: {
    cls: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  },
  stopped: {
    cls: 'bg-slate-800 text-slate-400 border-slate-700',
  },
  blocked_by_policy: {
    cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  },
}

export function OutcomeTag({ outcome }: { outcome: Outcome }) {
  const conf = outcomeConfig[outcome] ?? outcomeConfig.stopped
  const text = outcome?.replace(/_/g, ' ') || 'unknown'
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize ${conf.cls}`}
    >
      {text}
    </span>
  )
}

export function ConfidenceBar({ value }: { value: number }) {
  const percentage = Math.round(value * 100)
  const barColor =
    value >= 0.75
      ? 'bg-emerald-500'
      : value >= 0.55
        ? 'bg-blue-500'
        : 'bg-amber-500'
  const textColor =
    value >= 0.75
      ? 'text-emerald-400'
      : value >= 0.55
        ? 'text-blue-400'
        : 'text-amber-400'

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
        />
      </div>
      <span className={`num text-[11px] font-medium ${textColor}`}>
        {percentage}%
      </span>
    </div>
  )
}

/* ── Container Card ──────────────────────────────────────────────── */

export function Card({
  title,
  subtitle,
  children,
  right,
  className,
  icon,
}: {
  title?: string
  subtitle?: string
  children: ReactNode
  right?: ReactNode
  className?: string
  icon?: ReactNode
}) {
  return (
    <section
      className={`rounded-xl border border-slate-800 bg-[#111622] p-5 shadow-card transition-colors hover:border-slate-750 ${
        className ?? ''
      }`}
    >
      {(title || right) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {icon && (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-750 bg-slate-850 text-xs font-semibold text-slate-300">
                {icon}
              </span>
            )}
            <div>
              {title && (
                <h3 className="text-sm font-semibold tracking-tight text-white">{title}</h3>
              )}
              {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
            </div>
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  )
}

/* ── KPI / Metric Card ───────────────────────────────────────────── */

const kpiAccents = {
  red: 'border-t-2 border-t-rose-500/80',
  green: 'border-t-2 border-t-emerald-500/80',
  blue: 'border-t-2 border-t-blue-500/80',
  amber: 'border-t-2 border-t-amber-500/80',
  purple: 'border-t-2 border-t-indigo-500/80',
  slate: 'border-t-2 border-t-slate-600',
}

export function KpiCard({
  label,
  value,
  sub,
  tone = 'slate',
  icon,
  delta,
  deltaTone = 'neutral',
}: {
  label: string
  value: string | number
  sub?: string
  tone?: 'red' | 'green' | 'blue' | 'amber' | 'purple' | 'slate'
  icon?: ReactNode
  delta?: string
  deltaTone?: 'up' | 'down' | 'neutral'
}) {
  const accentClass = kpiAccents[tone] ?? kpiAccents.slate
  const deltaCls =
    deltaTone === 'up'
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      : deltaTone === 'down'
        ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
        : 'text-slate-400 bg-slate-800 border-slate-700'

  const trendIcon = deltaTone === 'up' ? '↑' : deltaTone === 'down' ? '↓' : '→'

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-[#111622] p-5 shadow-card transition-colors hover:border-slate-750 ${accentClass}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          {label}
        </span>
        {icon && (
          <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-800 text-xs text-slate-400">
            {icon}
          </span>
        )}
      </div>

      <div className="num mt-2 text-2xl font-bold tracking-tight text-white lg:text-3xl">
        {value}
      </div>

      {(sub || delta) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {delta && (
            <span
              className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[11px] font-semibold ${deltaCls}`}
            >
              <span>{trendIcon}</span>
              {delta}
            </span>
          )}
          {sub && <span className="text-xs text-slate-400">{sub}</span>}
        </div>
      )}
    </div>
  )
}

/* ── Clean Buttons ───────────────────────────────────────────────── */

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 active:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}

export function GhostButton({
  children,
  onClick,
  className = '',
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-slate-750 bg-slate-850 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-slate-700 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: 'default' | 'emerald' | 'blue' | 'amber' | 'rose' | 'purple'
}) {
  const tones = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    purple: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  )
}


