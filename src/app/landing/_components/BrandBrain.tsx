'use client'
import { useT } from './LangContext'
import { useBreakpoint } from './useBreakpoint'

export function BrandBrain() {
  const { t } = useT()
  const { isMobile, isTablet } = useBreakpoint()
  const keys = ['voice','palette','topics','taboos','formats','cadence'] as const
  const categories = keys.map(k => ({ label: t.brain.cats[k], items: t.brain.values[k] }))
  const stats: [string, string][] = [
    ['30', t.brain.stat_1],
    ['12', t.brain.stat_2],
    ['~2m', t.brain.stat_3],
  ]

  return (
    <section style={{ padding: isMobile ? '72px 20px' : '120px 32px', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 900, height: 500, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, rgba(212,168,75,0.1) 0%, transparent 60%)',
      }}/>

      <div style={{
        position: 'relative', maxWidth: 1240, margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: isTablet ? '1fr' : '0.9fr 1.1fr',
        gap: isMobile ? 48 : 80,
        alignItems: 'center',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-ibm)', fontSize: 11, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: 'var(--candle)', fontWeight: 500, marginBottom: 16,
          }}>{t.brain.eyebrow}</div>
          <h2 style={{
            margin: 0, fontFamily: 'var(--font-syne)', fontWeight: 700,
            fontSize: 'clamp(32px, 4.5vw, 56px)', lineHeight: 1.05,
            letterSpacing: '-0.03em', color: 'var(--parchment)',
            textWrap: 'balance' as React.CSSProperties['textWrap'],
          }}>
            {t.brain.title_1}{' '}
            <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--candle)' }}>{t.brain.title_2}</span>
            {t.brain.title_3}
          </h2>
          <p style={{
            margin: '24px 0 0', fontFamily: 'var(--font-ibm)', fontWeight: 300,
            fontSize: isMobile ? 15 : 17, lineHeight: 1.6, color: 'var(--sand)', maxWidth: 500,
            textWrap: 'pretty' as React.CSSProperties['textWrap'],
          }}>{t.brain.body}</p>

          <div style={{
            marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(3, auto)',
            gap: isMobile ? '12px 20px' : '14px 32px', fontFamily: 'var(--font-ibm)', justifyContent: 'start',
          }}>
            {stats.map(([n, l]) => (
              <div key={l}>
                <div style={{
                  fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: isMobile ? 28 : 34,
                  letterSpacing: '-0.04em', color: 'var(--candle)', lineHeight: 1,
                }}>{n}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 6 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          padding: isMobile ? 20 : 32, borderRadius: 16,
          background: 'var(--surface)', border: '1px solid var(--border)',
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.5)',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(182,141,64,0.6), transparent)',
          }}/>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--candle)', fontVariationSettings: "'FILL' 1" }}>psychology</span>
              <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15, color: 'var(--parchment)' }}>Ember & Oak</span>
              <span style={{
                padding: '2px 8px', borderRadius: 9999, fontFamily: 'var(--font-ibm)',
                fontSize: 9, letterSpacing: '0.1em', fontWeight: 700,
                background: 'rgba(110,191,139,0.15)', color: '#6EBF8B',
              }}>{t.brain.synced}</span>
            </div>
            <span style={{ fontFamily: 'var(--font-ibm)', fontSize: 11, color: 'var(--muted)' }}>{t.brain.version}</span>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            {categories.map(c => (
              <div key={c.label}>
                <div style={{
                  fontFamily: 'var(--font-ibm)', fontSize: 10, letterSpacing: '0.15em',
                  textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 500, marginBottom: 8,
                }}>{c.label}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {c.items.map(it => (
                    <span key={it} style={{
                      padding: '5px 11px', borderRadius: 9999,
                      background: 'rgba(182,141,64,0.08)', border: '1px solid rgba(182,141,64,0.18)',
                      fontFamily: 'var(--font-ibm)', fontSize: 11.5,
                      color: 'var(--parchment)', fontWeight: 300,
                    }}>{it}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
