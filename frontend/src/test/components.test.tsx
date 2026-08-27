import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  SeverityBadge,
  ActionPill,
  OutcomeTag,
  ConfidenceBar,
  KpiCard,
  Card,
} from '../components/ui'

describe('SeverityBadge', () => {
  it('renders high severity', () => {
    render(<SeverityBadge severity="high" />)
    expect(screen.getByText('high')).toBeInTheDocument()
  })

  it('renders medium severity', () => {
    render(<SeverityBadge severity="medium" />)
    expect(screen.getByText('medium')).toBeInTheDocument()
  })

  it('renders low severity', () => {
    render(<SeverityBadge severity="low" />)
    expect(screen.getByText('low')).toBeInTheDocument()
  })
})

describe('ActionPill', () => {
  it('renders RETRY_PAYMENT', () => {
    render(<ActionPill action="RETRY_PAYMENT" />)
    expect(screen.getByText('retry payment')).toBeInTheDocument()
  })

  it('renders STOP', () => {
    render(<ActionPill action="STOP" />)
    expect(screen.getByText('stop')).toBeInTheDocument()
  })

  it('renders SEND_PAYMENT_LINK', () => {
    render(<ActionPill action="SEND_PAYMENT_LINK" />)
    expect(screen.getByText('send payment link')).toBeInTheDocument()
  })
})

describe('OutcomeTag', () => {
  it('renders recovered', () => {
    render(<OutcomeTag outcome="recovered" />)
    expect(screen.getByText('recovered')).toBeInTheDocument()
  })

  it('renders blocked_by_policy', () => {
    render(<OutcomeTag outcome="blocked_by_policy" />)
    expect(screen.getByText('blocked by policy')).toBeInTheDocument()
  })
})

describe('ConfidenceBar', () => {
  it('renders percentage', () => {
    render(<ConfidenceBar value={0.85} />)
    expect(screen.getByText('85%')).toBeInTheDocument()
  })

  it('renders zero', () => {
    render(<ConfidenceBar value={0} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })
})

describe('KpiCard', () => {
  it('renders label and value', () => {
    render(<KpiCard label="Revenue" value="₹1,000" />)
    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('₹1,000')).toBeInTheDocument()
  })

  it('renders subtitle', () => {
    render(<KpiCard label="Revenue" value="₹1,000" sub="test sub" />)
    expect(screen.getByText('test sub')).toBeInTheDocument()
  })
})

describe('Card', () => {
  it('renders children', () => {
    render(<Card><p>hello</p></Card>)
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('renders title', () => {
    render(<Card title="My Title"><p>content</p></Card>)
    expect(screen.getByText('My Title')).toBeInTheDocument()
  })

  it('renders right slot', () => {
    render(<Card title="T" right={<span>right</span>}><p>content</p></Card>)
    expect(screen.getByText('right')).toBeInTheDocument()
  })
})
