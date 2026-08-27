import type { ReactNode } from 'react'
import type { Severity, Action, Outcome } from '../types'

/* ── Design Tokens & Badges ──────────────────────────────────────── */

const severityConfig: Record<
  Severity,
  { bg: string; text: string; border: string; dot: string; glow: string }
> = {
  high: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    dot: 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]',
    glow: 'shadow-rose-950/30',
  },
  medium: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-300',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]',
    glow: 'shadow-amber-950/30',
  },
  low: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-300',
    border: 'border-slate-500/30',
    dot: 'bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.5)]',
    glow: 'shadow-slate-950/30',
  },
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const conf = severityConfig[severity] ?? severityConfig.low
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${conf.bg} ${conf.text} ${conf.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} />
      <span className="capitalize">{severity}</span>
    </span>
  )
}

const actionMap: Record<Action, { cls: string; icon: string }> = {
  RETRY_PAYMENT: {
    cls: 'bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/15',
    icon: '↻',
  },
  SEND_PAYMENT_LINK: {
    cls: 'bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/15',
    icon: '⧉',
  },
  NOTIFY_CUSTOMER: {
    cls: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/15',
    icon: '✉',
  },
  ESCALATE_HUMAN: {
    cls: 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/15',
    icon: '⚑',
  },
  STOP: {
    cls: 'bg-slate-700/20 text-slate-400 border-slate-600/30 hover:bg-slate-700/30',
    icon: '■',
  },
}

export function ActionPill({ action }: { action: Action }) {
  const meta = actionMap[action] ?? actionMap.STOP
  const formattedText = action.replace(/_/g, ' ').toLowerCase()

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-tight backdrop-blur-sm transition-all ${meta.cls}`}
    >
      <span className="text-[10px] opacity-75">{meta.icon}</span>
      <span className="capitalize">{formattedText}</span>
    </span>
  )
}

const outcomeMap: Record<Outcome, { cls: string; icon: string }> = {
  recovered: {
    cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
    icon: '✓',
  },
  failed: {
    cls: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    icon: '✕',
  },
  escalated: {
    cls: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    icon: '⚠',
  },
  stopped: {
    cls: 'bg-slate-700/20 text-slate-400 border-slate-600/30',
    icon: '■',
  },
  blocked_by_policy: {
    cls: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
    icon: '🛡',
  },
}

export function OutcomeTag({ outcome }: { outcome: Outcome }) {
  const conf = outcomeMap[outcome] ?? outcomeMap.stopped
  const text = outcome?.replace(/_/g, ' ') || 'unknown'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium capitalize backdrop-blur-sm ${conf.cls}`}
    >
      <span className="text-[9px] opacity-70">{conf.icon}</span>
      {text}
    </span>
  )
}

export function ConfidenceBar({ value }: { value: number }) {
  const percentage = Math.round(value * 100)
  const tone =
    value >= 0.75
      ? 'from-emerald-500 to-teal-400'
      : value >= 0.55
        ? 'from-blue-500 to-cyan-400'
        : 'from-amber-500 to-yellow-400'
  const textColor =
    value >= 0.75
      ? 'text-emerald-300'
      : value >= 0.55
        ? 'text-blue-300'
        : 'text-amber-300'

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800/90 ring-1 ring-white/5">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${tone} transition-all duration-500`}
          style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
        />
      </div>
      <span className={`num text-[11px] font-medium ${textColor}`}>
        {percentage}%
      </span>
    </div>
  )
}

/* ── Card ───────────────────────────────────────────────────────── */

export function Card({
  title,
  subtitle,
  children,
  right,
  className,
  icon,
  hoverable = true,
}: {
  title?: string
  subtitle?: string
  children: ReactNode
  right?: ReactNode
  className?: string
  icon?: ReactNode
  hoverable?: boolean
}) {
  return (
    <section
      className={`animate-rise relative overflow-hidden rounded-2xl border border-white/[0.07] bg-slate-900/50 p-5 shadow-xl shadow-black/30 backdrop-blur-md transition-all duration-300 ${
        hoverable
          ? 'hover:-translate-y-0.5 hover:border-slate-700/80 hover:shadow-2xl hover:shadow-black/50'
          : ''
      } ${className ?? ''}`}
    >
      {(title || right) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {icon && (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-300 shadow-sm shadow-blue-500/10">
                {icon}
              </span>
            )}
            <div>
              {title && <h3 className="text-sm font-semibold tracking-tight text-slate-100">{title}</h3>}
              {subtitle && <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>}
            </div>
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  )
}

/* ── KPI / Stat Card ────────────────────────────────────────────── */

const kpiTones = {
  red: {
    gradient: 'from-rose-500/15 via-rose-500/5 to-transparent',
    border: 'hover:border-rose-500/30',
    iconBg: 'bg-rose-500/15 text-rose-300 border-rose-500/20',
    accentText: 'text-rose-400',
  },
  green: {
    gradient: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
    border: 'hover:border-emerald-500/30',
    iconBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    accentText: 'text-emerald-400',
  },
  blue: {
    gradient: 'from-blue-500/15 via-blue-500/5 to-transparent',
    border: 'hover:border-blue-500/30',
    iconBg: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
    accentText: 'text-blue-400',
  },
  amber: {
    gradient: 'from-amber-500/15 via-amber-500/5 to-transparent',
    border: 'hover:border-amber-500/30',
    iconBg: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
    accentText: 'text-amber-400',
  },
  purple: {
    gradient: 'from-purple-500/15 via-purple-500/5 to-transparent',
    border: 'hover:border-purple-500/30',
    iconBg: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
    accentText: 'text-purple-400',
  },
  slate: {
    gradient: 'from-slate-700/15 via-slate-700/5 to-transparent',
    border: 'hover:border-slate-600/30',
    iconBg: 'bg-slate-800 text-slate-300 border-slate-700/40',
    accentText: 'text-slate-400',
  },
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
  const t = kpiTones[tone] ?? kpiTones.slate
  const deltaCls =
    deltaTone === 'up'
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      : deltaTone === 'down'
        ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
        : 'text-slate-400 bg-slate-700/20 border-slate-600/20'

  const trendIcon = deltaTone === 'up' ? '↑' : deltaTone === 'down' ? '↓' : '→'

  return (
    <div
      className={`animate-rise group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-slate-900/60 p-5 shadow-xl shadow-black/30 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/50 ${t.border}`}
    >
      {/* Background glow gradient */}
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80 transition-opacity duration-300 group-hover:opacity-100 ${t.gradient}`}
      />

      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </span>
          {icon && (
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-semibold shadow-inner ${t.iconBg}`}
            >
              {icon}
            </span>
          )}
        </div>

        <div className="num mt-2 text-2xl font-bold tracking-tight text-white lg:text-3xl">
          {value}
        </div>

        {(sub || delta) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {delta && (
              <span
                className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${deltaCls}`}
              >
                <span>{trendIcon}</span>
                {delta}
              </span>
            )}
            {sub && <span className="text-[11px] text-slate-400">{sub}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Buttons ─────────────────────────────────────────────────────── */

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
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-800/50 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
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
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/70 bg-slate-800/40 px-3.5 py-2 text-xs font-medium text-slate-300 backdrop-blur-sm transition-all duration-200 hover:border-slate-600 hover:bg-slate-700/50 hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
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
    default: 'bg-slate-800/80 text-slate-300 border-slate-700',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    blue: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    rose: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    purple: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

