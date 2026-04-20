interface BadgeProps {
  status: 'published' | 'pending_review' | 'approved' | 'generating' | 'failed'
  className?: string
}

const statusConfig = {
  published:      { label: 'Published',       bg: 'rgba(34,197,94,0.12)',  color: '#22c55e',  border: 'rgba(34,197,94,0.3)' },
  pending_review: { label: 'Pending Review',  bg: 'rgba(212,168,75,0.12)', color: '#D4A84B',  border: 'rgba(212,168,75,0.3)' },
  approved:       { label: 'Approved',        bg: 'rgba(99,102,241,0.12)', color: '#818cf8',  border: 'rgba(99,102,241,0.3)' },
  generating:     { label: 'Generating',      bg: 'rgba(59,130,246,0.12)', color: '#60a5fa',  border: 'rgba(59,130,246,0.3)' },
  failed:         { label: 'Failed',          bg: 'rgba(255,107,107,0.12)',color: '#FF6B6B',  border: 'rgba(255,107,107,0.3)' },
}

export function Badge({ status, className = '' }: BadgeProps) {
  const cfg = statusConfig[status] || statusConfig.failed
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${className}`}
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontFamily: 'var(--font-ibm)', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase' }}
    >
      {cfg.label}
    </span>
  )
}
