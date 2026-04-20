'use client'

interface Props {
  label: string
  value: string | number
  trend?: string
  trendDir?: 'up' | 'down' | 'neutral'
  unit?: string
}

export function StatCard({ label, value, trend, trendDir = 'neutral', unit }: Props) {
  const trendColor = trendDir === 'up' ? '#6EBF8B' : trendDir === 'down' ? '#E07070' : 'var(--muted)'

  return (
    <div
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px 12px', position: 'relative', overflow: 'hidden', cursor: 'default' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(212,168,75,.3)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(212,168,75,.2),transparent)' }} />

      <div style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 400, marginBottom: 6, fontFamily: 'var(--font-ibm)' }}>
        {label}
      </div>

      <div style={{ fontFamily: 'var(--font-syne)', fontSize: 26, fontWeight: 700, color: 'var(--candle)', letterSpacing: '-.02em', lineHeight: 1, marginBottom: 6 }}>
        {value}
        {unit && <span style={{ fontSize: 14, fontWeight: 400, color: 'rgba(212,168,75,.6)', marginLeft: 2 }}>{unit}</span>}
      </div>

      {trend && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 300, color: trendColor, fontFamily: 'var(--font-ibm)' }}>
          {trendDir === 'up' && (
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <polyline points="1,9 4.5,4 7.5,6.5 11,1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          )}
          {trendDir === 'down' && (
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <polyline points="1,2.5 4.5,7 7.5,5 11,9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          )}
          {trend}
        </div>
      )}
    </div>
  )
}
