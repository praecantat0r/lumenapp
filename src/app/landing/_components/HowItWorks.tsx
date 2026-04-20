'use client'
import { SectionHeader } from './ui'
import { useT } from './LangContext'
import { useBreakpoint } from './useBreakpoint'

const icons = ['link', 'psychology', 'auto_awesome', 'publish']

export function HowItWorks() {
  const { t } = useT()
  const { isMobile, isTablet } = useBreakpoint()
  const steps = t.how.steps.map((s, i) => ({
    ...s,
    num: String(i + 1).padStart(2, '0'),
    icon: icons[i],
  }))

  const cols = isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'

  return (
    <section id="how-it-works" style={{ padding: isMobile ? '72px 20px' : '120px 32px', position: 'relative' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <SectionHeader
          eyebrow={t.how.eyebrow}
          title={<>{t.how.title_1} <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--candle)' }}>{t.how.title_2}</span>{t.how.title_3}</>}
          subtitle={t.how.sub}
        />

        <div style={{ marginTop: 72, display: 'grid', gridTemplateColumns: cols, gap: 24 }}>
          {steps.map(s => (
            <div key={s.num} style={{
              padding: isMobile ? 22 : 28, borderRadius: 14,
              background: 'var(--surface)', border: '1px solid var(--border)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(182,141,64,0.5), transparent)',
              }}/>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
                <span style={{
                  fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 38,
                  letterSpacing: '-0.04em', color: 'var(--candle)', lineHeight: 1,
                }}>{s.num}</span>
                <div style={{
                  width: 36, height: 36, borderRadius: 9999,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(182,141,64,0.1)', border: '1px solid rgba(182,141,64,0.2)',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--candle)' }}>{s.icon}</span>
                </div>
              </div>
              <div style={{
                fontFamily: 'var(--font-ibm)', fontSize: 10, letterSpacing: '0.15em',
                textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8, fontWeight: 500,
              }}>{s.tag}</div>
              <h3 style={{
                margin: 0, fontFamily: 'var(--font-syne)', fontWeight: 700,
                fontSize: 19, lineHeight: 1.2, letterSpacing: '-0.02em',
                color: 'var(--parchment)', textWrap: 'balance' as React.CSSProperties['textWrap'],
              }}>{s.title}</h3>
              <p style={{
                margin: '12px 0 0', fontFamily: 'var(--font-ibm)', fontWeight: 300,
                fontSize: 13.5, lineHeight: 1.6, color: 'var(--sand)',
                textWrap: 'pretty' as React.CSSProperties['textWrap'],
              }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
