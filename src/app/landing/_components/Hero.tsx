'use client'
import { Button } from './ui'
import { HeroProductPreview } from './HeroProductPreview'
import { useT } from './LangContext'
import { useBreakpoint } from './useBreakpoint'

function HeroGlow({ theme }: { theme: string }) {
  return (
    <>
      <div suppressHydrationWarning style={{
        position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)',
        width: 1100, height: 700, pointerEvents: 'none', zIndex: 0,
        background: theme === 'light'
          ? 'radial-gradient(ellipse at center, rgba(212,168,75,0.18) 0%, rgba(182,141,64,0.05) 40%, transparent 70%)'
          : 'radial-gradient(ellipse at center, rgba(212,168,75,0.22) 0%, rgba(182,141,64,0.07) 38%, transparent 70%)',
      }}/>
      <div suppressHydrationWarning style={{
        position: 'absolute', inset: 0, opacity: theme === 'light' ? 0.35 : 0.5,
        backgroundImage: theme === 'light'
          ? 'radial-gradient(circle, rgba(78,69,56,0.1) 1px, transparent 1px)'
          : 'radial-gradient(circle, rgba(196,185,154,0.08) 1px, transparent 1px)',
        backgroundSize: '28px 28px', pointerEvents: 'none',
        maskImage: 'radial-gradient(ellipse at center, black 10%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 10%, transparent 70%)',
      }}/>
    </>
  )
}

interface HeroProps {
  theme: string
  headline?: string
  ctaLabel?: string
  onCTA: () => void
}

export function HeroA({ theme, headline, ctaLabel, onCTA }: HeroProps) {
  const { t } = useT()
  const { isMobile } = useBreakpoint()
  return (
    <section style={{
      position: 'relative', overflow: 'hidden',
      padding: isMobile ? '100px 20px 60px' : '160px 32px 80px',
    }}>
      <HeroGlow theme={theme} />
      <div style={{
        position: 'relative', maxWidth: 1240, margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1.1fr 1fr',
        gap: isMobile ? 48 : 64,
        alignItems: 'center',
      }}>
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 12px 6px 8px', borderRadius: 9999,
            background: 'rgba(182,141,64,0.1)', border: '1px solid rgba(182,141,64,0.25)',
            fontFamily: 'var(--font-ibm)', fontSize: 11, color: 'var(--candle)',
            letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 24,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>bolt</span>
            {t.hero.badge}
          </div>

          <h1 style={{
            margin: 0, fontFamily: 'var(--font-syne)', fontWeight: 700,
            fontSize: 'clamp(40px, 5.5vw, 80px)', lineHeight: 1.02,
            letterSpacing: '-0.035em', color: 'var(--parchment)',
            textWrap: 'balance' as React.CSSProperties['textWrap'],
          }}>
            {headline || (<>
              {t.hero.headlineA_1}<br/>
              <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--candle)' }}>
                {t.hero.headlineA_2}
              </span>
            </>)}
          </h1>

          <p style={{
            marginTop: 28, fontFamily: 'var(--font-ibm)', fontWeight: 300,
            fontSize: isMobile ? 17 : 19, lineHeight: 1.55, color: 'var(--sand)', maxWidth: 520,
            textWrap: 'pretty' as React.CSSProperties['textWrap'],
          }}>{t.hero.sub}</p>

          <div style={{ marginTop: 36, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Button variant="primary" size="lg" icon="arrow_forward" onClick={onCTA}>
              {ctaLabel || t.hero.cta}
            </Button>
            <Button variant="ghost" size="lg" icon="play_circle">{t.hero.watch}</Button>
          </div>

          <div style={{
            marginTop: 40, display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 20,
            fontFamily: 'var(--font-ibm)', fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap',
          }}>
            {[t.hero.trial, t.hero.noCard, t.hero.cancel].map(x => (
              <span key={x} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#6EBF8B' }}>check_circle</span>
                {x}
              </span>
            ))}
          </div>
        </div>

        <div><HeroProductPreview /></div>
      </div>
    </section>
  )
}

export function HeroB({ theme, headline, ctaLabel, onCTA }: HeroProps) {
  const { t } = useT()
  const { isMobile } = useBreakpoint()
  return (
    <section style={{
      position: 'relative', overflow: 'hidden',
      padding: isMobile ? '100px 20px 60px' : '160px 32px 80px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <HeroGlow theme={theme} />

      <div style={{ position: 'relative', maxWidth: 1100, textAlign: 'center', zIndex: 1, width: '100%' }}>
        <div style={{
          fontFamily: 'var(--font-ibm)', fontSize: 11, letterSpacing: '0.25em',
          textTransform: 'uppercase', color: 'var(--candle)', fontWeight: 500, marginBottom: 32,
        }}>{t.hero.headlineB_eyebrow}</div>

        <h1 style={{
          margin: 0, fontFamily: 'var(--font-syne)', fontWeight: 700,
          fontSize: isMobile ? 'clamp(42px, 11vw, 64px)' : 'clamp(56px, 8vw, 120px)',
          lineHeight: 0.98,
          letterSpacing: '-0.04em', color: 'var(--parchment)',
          textWrap: 'balance' as React.CSSProperties['textWrap'],
        }}>
          {headline || (<>
            {t.hero.headlineB_1}<br/>
            <span style={{ fontStyle: 'italic', fontWeight: 400 }}>{t.hero.headlineB_2}</span>{' '}
            <span style={{ color: 'var(--candle)' }}>{t.hero.headlineB_3}</span>
          </>)}
        </h1>

        <p style={{
          margin: '36px auto 0', fontFamily: 'var(--font-ibm)', fontWeight: 300,
          fontSize: isMobile ? 17 : 20, lineHeight: 1.55, color: 'var(--sand)', maxWidth: 680,
          textWrap: 'pretty' as React.CSSProperties['textWrap'],
        }}>{t.hero.subB}</p>

        <div style={{ marginTop: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Button variant="primary" size="lg" icon="arrow_forward" onClick={onCTA}>
            {ctaLabel || t.hero.cta}
          </Button>
          <Button variant="ghost" size="lg" icon="play_circle">{t.hero.watch}</Button>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, marginTop: isMobile ? 48 : 80, width: '100%', maxWidth: 1040 }}>
        <HeroProductPreview />
      </div>
    </section>
  )
}
