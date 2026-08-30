export type Severity = 'high' | 'medium' | 'low'

export type Action =
  | 'RETRY_PAYMENT'
  | 'SEND_PAYMENT_LINK'
  | 'NOTIFY_CUSTOMER'
  | 'ESCALATE_HUMAN'
  | 'STOP'

export type Outcome =
  | 'recovered'
  | 'failed'
  | 'escalated'
  | 'stopped'
  | 'blocked_by_policy'

export interface Cluster {
  cluster_id: string
  severity: Severity
  title: string
  txn_count: number
  revenue_at_risk_inr: number
  payment_methods: string[]
  evidence: string[]
  sample_transaction_ids: string[]
  top_failure_codes: string[]
}

export interface DetectReport {
  clusters: Cluster[]
  revenue_at_risk_inr: number
  expected_recoverable_inr: number
  unrecoverable_inr: number
  failed_count: number
  transactions_analyzed: number
}

export interface Diagnosis {
  cluster_id: string
  root_cause: string
  contributing_factors: string[]
  source: string
  confidence: number
  recommended_actions: string[]
}

export interface DiagnoseReport {
  diagnoses: Diagnosis[]
}

export interface OutreachInfo {
  payment_link?: string
  message_en?: string
  message_hi?: string
  channel?: string
}

export interface QueueItem {
  transaction_id: string
  rank?: number
  amount_inr: number
  failure_code: string
  failure_category?: string
  action: Action
  recovery_probability: number
  expected_recovery_value_inr: number
  confidence: number
  requires_approval: boolean
  reason: string
  outreach?: OutreachInfo
}

export interface Plan {
  queue: QueueItem[]
  escalations: QueueItem[]
  stops: QueueItem[]
  total_expected_recovery_inr: number
}

export interface AuditEvent {
  event_id: string
  timestamp: string
  actor: string
  action: string
  reason: string
  evidence: Record<string, unknown>
  policy_result: string
  outcome?: { value: Outcome } | Outcome
}

export interface Execution {
  recovered_inr: number
  outcome_counts: Record<string, number>
  audit_trail: AuditEvent[]
}

export interface AppState {
  plan: Plan | null
  execution: Execution | null
}

export interface HealthResponse {
  status: string
  transactions_in_store: number
}

export interface EvaluationStrategies {
  recovered_inr: number
  recovery_rate: number
  unnecessary_interventions: number
  prevented_interventions: number
}

export interface Evaluation {
  ai_strategy: EvaluationStrategies
  baseline: EvaluationStrategies
  uplift: {
    extra_recovered_inr: number
    rate_delta: number
    avoided_unnecessary_interventions: number
  }
}

export interface Transaction {
  transaction_id: string
  amount_inr: number
  currency: string
  payment_method: string
  status: string
  failure_code: string | null
  failure_category: string | null
  timestamp: string
  retry_count: number
}

export interface SummaryResponse {
  total: number
  failed: number
  by_category: Record<string, number>
}

export interface AnalyzeUpload {
  total_transactions: number
  failed: number
  succeeded: number
  success_rate_pct: number
  total_amount_inr: number
  lost_amount_inr: number
  by_method: Record<string, number>
  by_category: Record<string, number>
}

export interface AnalyzeDetection {
  clusters: Cluster[]
  revenue_at_risk_inr: number
  expected_recoverable_inr: number
  unrecoverable_inr: number
}

export interface AnalyzeDiagnosis {
  cluster_id: string
  root_cause: string
  contributing_factors: string[]
  recommended_action: Action
  confidence: number
  requires_human: boolean
  source: string
}

export interface AnalyzeReport {
  upload: AnalyzeUpload
  detection: AnalyzeDetection
  diagnoses: AnalyzeDiagnosis[]
  notification_summary: Record<string, unknown>
}

export type AgingBucket = '1_30_days' | '31_60_days' | '61_90_days' | '90_plus_days'
export type InvoiceStatus = 'overdue' | 'promised_to_pay' | 'recovered' | 'escalated_legal'
export type DunningStage = 'gentle_nudge' | 'invoice_link' | 'finance_director' | 'legal_notice'

export interface PTPCommitment {
  promised_date: string
  promised_amount_inr: number
  recorded_at: string
  notes: string
}

export interface B2BInvoice {
  invoice_id: string
  client_name: string
  client_contact: string
  client_email: string
  amount_inr: number
  due_date: string
  overdue_days: number
  aging_bucket: AgingBucket
  status: InvoiceStatus
  dunning_stage: DunningStage
  ptp?: PTPCommitment
  payment_link: string
  timeline: string[]
}

export interface B2BSummary {
  total_invoices: number
  total_overdue_inr: number
  total_ptp_committed_inr: number
  total_recovered_inr: number
  total_high_risk_inr: number
}

export interface B2BResponse {
  invoices: B2BInvoice[]
  summary: B2BSummary
}

export interface WebhookEvent {
  event_id: string
  event: string
  amount_inr: number
  payment_method: string
  error_code: string
  timestamp: string
}

