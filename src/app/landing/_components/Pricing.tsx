'use client'
import { Button, SectionHeader } from './ui'
import { useT } from './LangContext'
import { useBreakpoint } from './useBreakpoint'

export function Pricing({ onCTA }: { onCTA: () => void }) {
  const { t } = useT()
  const { isMobile, isTablet } = useBreakpoint()
  const variants = ['ghost', 'primary', 'ghost'] as const

  return (
    <section id="pricing" style={{ padding: isMobile ? '72px 20px' : '120px 32px', position: 'relative' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <SectionHeader
          eyebrow={t.pricing.eyebrow}
          title={<>{t.pricing.title_1} <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--candle)' }}>{t.pricing.title_2}</span> {t.pricing.title_3}</>}
          subtitle={t.pricing.sub || undefined}
          center
        />

        <div style={{
          marginTop: 64, display: 'grid',
          gridTemplateColumns: isTablet ? '1fr' : 'repeat(3, 1fr)',
          gap: 20,
          maxWidth: isTablet ? 520 : 'none',
          margin: isTablet ? '64px auto 0' : '64px 0 0',
        }}>
          {t.pricing.tiers.map((tier, i) => {
            const popular = i === 1
            return (
              <div key={tier.name} style={{
                position: 'relative', padding: isMobile ? '28px 22px' : '36px 30px',
                background: popular ? 'var(--surface)' : 'var(--carbon)',
                border: `1px solid ${popular ? 'rgba(182,141,64,0.4)' : 'var(--border)'}`,
                borderRadius: 16, overflow: 'hidden',
                boxShadow: popular ? '0 30px 80px -20px rgba(182,141,64,0.15)' : 'none',
              }}>
                {popular && (
                  <>
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                      background: 'linear-gradient(90deg, transparent, var(--candle), transparent)',
                    }}/>
                    <div style={{
                      position: 'absolute', top: 16, right: 16,
                      padding: '3px 10px', borderRadius: 9999,
                      background: 'rgba(182,141,64,0.15)', border: '1px solid rgba(182,141,64,0.3)',
                      fontFamily: 'var(--font-ibm)', fontSize: 9, letterSpacing: '0.12em',
                      textTransform: 'uppercase', fontWeight: 700, color: 'var(--candle)',
                    }}>{t.pricing.popular}</div>
                  </>
                )}
                <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 22, color: 'var(--parchment)', letterSpacing: '-0.02em' }}>{tier.name}</div>
                <div style={{ marginTop: 4, fontFamily: 'var(--font-ibm)', fontSize: 13, color: 'var(--sand)', fontWeight: 300, minHeight: 36 }}>{tier.tagline}</div>

                <div style={{ marginTop: 24, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: isMobile ? 44 : 52, letterSpacing: '-0.04em', color: 'var(--parchment)', lineHeight: 1 }}>{tier.price}</span>
                  <span style={{ fontFamily: 'var(--font-ibm)', fontSize: 14, color: 'var(--muted)' }}>{t.pricing.per}</span>
                </div>

                <div style={{ marginTop: 28 }}>
                  <Button variant={variants[i]} size="lg" style={{ width: '100%' }} onClick={onCTA}>{tier.cta}</Button>
                </div>

                <div style={{ marginTop: 28, borderTop: '1px solid var(--border)', paddingTop: 22, display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {tier.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--candle)' }}>check</span>
                      <span style={{ fontFamily: 'var(--font-ibm)', fontSize: 13.5, color: 'var(--parchment)', fontWeight: 300 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
