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
      className={`rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-[#111622] dark:hover:border-slate-750 ${
        className ?? ''
      }`}
    >
      {(title || right) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {icon && (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-700 dark:border-slate-750 dark:bg-slate-850 dark:text-slate-300">
                {icon}
              </span>
            )}
            <div>
              {title && (
                <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
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
  blue: 'border-t-2 border-t-blue-500',
  amber: 'border-t-2 border-t-amber-500',
  purple: 'border-t-2 border-t-indigo-500',
  slate: 'border-t-2 border-t-slate-400 dark:border-t-slate-600',
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
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20'
      : deltaTone === 'down'
        ? 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20'
        : 'text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700'

  const trendIcon = deltaTone === 'up' ? '↑' : deltaTone === 'down' ? '↓' : '→'

  return (
    <div
      className={`rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-[#111622] dark:hover:border-slate-750 ${accentClass}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
        {icon && (
          <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {icon}
          </span>
        )}
      </div>

      <div className="num mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white lg:text-3xl">
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
          {sub && <span className="text-xs text-slate-500 dark:text-slate-400">{sub}</span>}
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
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
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
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-750 dark:bg-slate-850 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
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
    default: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    amber: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20',
    rose: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
    purple: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

/* ── Shadcn Alert Component ──────────────────────────────────────── */

const alertVariants = {
  default: 'border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100',
  destructive: 'border-rose-500/30 bg-rose-50/70 text-rose-900 dark:border-rose-500/20 dark:bg-rose-950/40 dark:text-rose-200',
  success: 'border-emerald-500/30 bg-emerald-50/70 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-200',
  warning: 'border-amber-500/30 bg-amber-50/70 text-amber-900 dark:border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-200',
  info: 'border-blue-500/30 bg-blue-50/70 text-blue-900 dark:border-blue-500/20 dark:bg-blue-950/40 dark:text-blue-200',
}

const alertIcons = {
  default: 'ℹ️',
  destructive: '⚠️',
  success: '✅',
  warning: '⚡',
  info: '💡',
}

export function Alert({
  variant = 'default',
  icon,
  className = '',
  children,
}: {
  variant?: keyof typeof alertVariants
  icon?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div
      role="alert"
      className={`relative w-full rounded-xl border p-4 shadow-sm text-xs flex gap-3 items-start ${alertVariants[variant]} ${className}`}
    >
      <span className="shrink-0 text-base leading-none mt-0.5">
        {icon ?? alertIcons[variant]}
      </span>
      <div className="flex-1 space-y-1">{children}</div>
    </div>
  )
}

export function AlertTitle({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <h5 className={`font-semibold tracking-tight leading-none text-xs ${className}`}>
      {children}
    </h5>
  )
}

export function AlertDescription({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`text-[11px] opacity-90 leading-relaxed ${className}`}>
      {children}
    </div>
  )
}

/* ── Shadcn Pagination Component ─────────────────────────────────── */

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}) {
  if (totalPages <= 1) return null

  const getPages = () => {
    const pages: (number | 'ellipsis')[] = []
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('ellipsis')
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (currentPage < totalPages - 2) pages.push('ellipsis')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={`mx-auto flex w-full justify-center gap-1.5 text-xs ${className}`}
    >
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
      >
        <span>‹</span>
        <span>Previous</span>
      </button>

      {getPages().map((p, idx) =>
        p === 'ellipsis' ? (
          <span
            key={`ellipsis-${idx}`}
            className="flex h-8 w-8 items-center justify-center text-slate-400 font-bold"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`h-8 w-8 rounded-lg font-semibold transition-all ${
              currentPage === p
                ? 'bg-blue-600 text-white shadow-sm'
                : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
      >
        <span>Next</span>
        <span>›</span>
      </button>
    </nav>
  )
}

/* ── Shadcn Attachment / Dropzone Component ──────────────────────── */

export interface AttachmentFile {
  name: string
  size: number
  type: string
  status?: 'ready' | 'uploading' | 'analyzed' | 'error'
  previewUrl?: string
}

export function AttachmentCard({
  file,
  onRemove,
}: {
  file: AttachmentFile
  onRemove?: () => void
}) {
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  const fileIcon = file.name.endsWith('.csv')
    ? '📊'
    : file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
      ? '📈'
      : file.name.endsWith('.json')
        ? '⚙️'
        : '📄'

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-750">
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-850 text-lg">
          {fileIcon}
        </span>
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
            {file.name}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            <span>{formatBytes(file.size)}</span>
            {file.status && (
              <>
                <span>•</span>
                <span
                  className={
                    file.status === 'analyzed'
                      ? 'text-emerald-500 font-semibold'
                      : file.status === 'uploading'
                        ? 'text-blue-500 font-semibold'
                        : 'text-slate-400'
                  }
                >
                  {file.status.toUpperCase()}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {onRemove && (
        <button
          onClick={onRemove}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800 transition-colors"
          title="Remove attachment"
        >
          ✕
        </button>
      )}
    </div>
  )
}



