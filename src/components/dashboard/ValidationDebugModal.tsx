'use client'

export interface ValidationDebugData {
  validation_score: number
  validation_attempts: number
  validation_feedback: string
  caption?: string
  visual_concept?: string
}

export function ValidationDebugModal({ data, onClose }: { data: ValidationDebugData; onClose: () => void }) {
  const score = data.validation_score
  const scoreColor = score >= 0.7 ? '#6EBF8B' : score >= 0.4 ? '#D4A84B' : '#e05252'

  const rows: { label: string; value: string }[] = [
    { label: 'Score', value: `${score.toFixed(2)} / 1.00` },
    { label: 'Attempts', value: `${data.validation_attempts} / 3` },
    { label: 'Feedback', value: data.validation_feedback || '—' },
    ...(data.visual_concept ? [{ label: 'Visual concept', value: data.visual_concept }] : []),
    ...(data.caption ? [{ label: 'Caption (last attempt)', value: data.caption.slice(0, 300) + (data.caption.length > 300 ? '…' : '') }] : []),
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(10,9,8,0.82)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '28px 28px 24px', maxWidth: 560, width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{
              fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--muted)', fontFamily: 'var(--font-ibm)', marginBottom: 4,
            }}>DEBUG — Brand Validation Failed</div>
            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18, color: 'var(--parchment)', letterSpacing: '-0.02em' }}>
              Post did not pass validation
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', fontSize: 18, lineHeight: 1, padding: 4,
          }}>✕</button>
        </div>

        {/* Score bar */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--font-ibm)' }}>Brand match score</span>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-syne)', fontWeight: 700, color: scoreColor }}>{score.toFixed(2)}</span>
          </div>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 2, width: `${score * 100}%`, background: scoreColor, transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)' }}>
            Threshold: 0.70 &nbsp;·&nbsp; Attempts: {data.validation_attempts}/3
          </div>
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{
                  padding: '10px 0 10px 0', verticalAlign: 'top', width: 130,
                  fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: 'var(--muted)', fontFamily: 'var(--font-ibm)', paddingRight: 16,
                }}>{row.label}</td>
                <td style={{
                  padding: '10px 0', verticalAlign: 'top',
                  fontSize: 12, color: row.label === 'Score' ? scoreColor : 'var(--parchment)',
                  fontFamily: 'var(--font-ibm)', fontWeight: row.label === 'Score' ? 700 : 300,
                  lineHeight: 1.6,
                }}>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 20, fontSize: 10, color: 'rgba(196,185,154,0.3)', fontFamily: 'var(--font-ibm)', letterSpacing: '0.05em' }}>
          This modal is debug-only and will be removed.
        </div>
      </div>
    </div>
  )
}
