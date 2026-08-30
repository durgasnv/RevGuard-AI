import type { ReactNode } from 'react'
import type { Severity, Action, Outcome } from '../types'

/* ── Badges & Status Indicators ──────────────────────────────────── */

const severityConfig: Record<
  Severity,
  { bg: string; text: string; border: string; dot: string }
> = {
  high: {
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-500/20',
    dot: 'bg-rose-500',
  },
  medium: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-500/20',
    dot: 'bg-amber-500',
  },
  low: {
    bg: 'bg-slate-100 dark:bg-slate-500/10',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-500/20',
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
    cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    icon: '↻',
  },
  SEND_PAYMENT_LINK: {
    cls: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20',
    icon: '↗',
  },
  NOTIFY_CUSTOMER: {
    cls: 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/20',
    icon: '✉',
  },
  ESCALATE_HUMAN: {
    cls: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20',
    icon: '⚐',
  },
  STOP: {
    cls: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
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
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  },
  failed: {
    cls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
  },
  escalated: {
    cls: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20',
  },
  stopped: {
    cls: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  },
  blocked_by_policy: {
    cls: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20',
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
      ? 'bg-emerald-600 dark:bg-emerald-500'
      : value >= 0.55
        ? 'bg-blue-600 dark:bg-blue-500'
        : 'bg-amber-600 dark:bg-amber-500'
  const textColor =
    value >= 0.75
      ? 'text-emerald-700 dark:text-emerald-400'
      : value >= 0.55
        ? 'text-blue-700 dark:text-blue-400'
        : 'text-amber-700 dark:text-amber-400'

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
        />
      </div>
      <span className={`num text-[11px] font-semibold ${textColor}`}>
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
      className={`rounded-xl border border-border bg-card text-card-foreground p-5 shadow-xs transition-colors hover:border-border/80 ${
        className ?? ''
      }`}
    >
      {(title || right) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {icon && (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted/60 text-xs font-semibold text-foreground">
                {icon}
              </span>
            )}
            <div>
              {title && (
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
              )}
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
  red: 'border-t-2 border-t-rose-500',
  green: 'border-t-2 border-t-emerald-500',
  blue: 'border-t-2 border-t-primary',
  amber: 'border-t-2 border-t-amber-500',
  purple: 'border-t-2 border-t-indigo-500',
  slate: 'border-t-2 border-t-muted-foreground/40',
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
      ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20'
      : deltaTone === 'down'
        ? 'text-rose-600 bg-rose-500/10 border-rose-500/20'
        : 'text-muted-foreground bg-muted border-border'

  const trendIcon = deltaTone === 'up' ? '↑' : deltaTone === 'down' ? '↓' : '→'

  return (
    <div
      className={`rounded-xl border border-border bg-card text-card-foreground p-5 shadow-xs transition-colors hover:border-border/80 ${accentClass}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {icon && (
          <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
            {icon}
          </span>
        )}
      </div>

      <div className="num mt-2 text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
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
          {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
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
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
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
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground transition-all hover:bg-muted active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
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
    default: 'bg-muted text-muted-foreground border-border',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    purple: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  )
}



