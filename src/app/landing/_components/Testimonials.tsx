'use client'
import { SectionHeader } from './ui'
import { useT } from './LangContext'
import { useBreakpoint } from './useBreakpoint'

export function Testimonials() {
  const { t } = useT()
  const { isMobile, isTablet } = useBreakpoint()

  const cols = isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'

  return (
    <section style={{ padding: isMobile ? '72px 20px' : '120px 32px', position: 'relative' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <SectionHeader
          eyebrow={t.tm.eyebrow}
          title={<>{t.tm.title_1} <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--candle)' }}>{t.tm.title_2}</span>{t.tm.title_3}</>}
          center
        />
        <div style={{ marginTop: 64, display: 'grid', gridTemplateColumns: cols, gap: 24 }}>
          {t.tm.quotes.map((q, i) => (
            <figure key={i} style={{
              margin: 0, padding: isMobile ? 24 : 32, borderRadius: 14,
              background: 'var(--surface)', border: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', gap: 24,
              position: 'relative', overflow: 'hidden',
            }}>
              <span style={{
                position: 'absolute', top: 20, right: 24,
                fontFamily: 'var(--font-syne)', fontSize: isMobile ? 60 : 80,
                color: 'var(--candle)', opacity: 0.15, lineHeight: 1,
              }}>&ldquo;</span>
              <blockquote style={{
                margin: 0, fontFamily: 'var(--font-syne)', fontStyle: 'italic',
                fontWeight: 400, fontSize: isMobile ? 17 : 19, lineHeight: 1.45,
                color: 'var(--parchment)',
                textWrap: 'pretty' as React.CSSProperties['textWrap'],
                flex: 1,
              }}>{q.q}</blockquote>
              <figcaption style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #b68d40, #d4a84b)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 13, color: '#0e0e0d',
                  flexShrink: 0,
                }}>{q.who[0]}</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-ibm)', fontSize: 13, color: 'var(--parchment)', fontWeight: 400 }}>{q.who}</div>
                  <div style={{ fontFamily: 'var(--font-ibm)', fontSize: 11, color: 'var(--muted)', fontWeight: 300 }}>{q.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
