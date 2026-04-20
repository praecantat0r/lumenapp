'use client'
import { SectionHeader } from './ui'
import { useT } from './LangContext'
import { useBreakpoint } from './useBreakpoint'

interface ColProps {
  kind: 'before' | 'after'
  label: string
  title: string
  subtitle: string
  items: readonly (readonly [string, string])[]
  hours: string
  per: string
  isMobile: boolean
}

function Col({ kind, label, title, subtitle, items, hours, per, isMobile }: ColProps) {
  const isAfter = kind === 'after'
  return (
    <div style={{
      position: 'relative', padding: isMobile ? '32px 24px' : '48px 40px', overflow: 'hidden',
      background: isAfter ? 'var(--surface)' : 'var(--carbon)',
      border: '1px solid var(--border)', borderRadius: 14,
    }}>
      {isAfter && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(182,141,64,0.6), transparent)',
        }}/>
      )}
      <div style={{
        display: 'inline-block',
        fontFamily: 'var(--font-ibm)', fontSize: 10, letterSpacing: '0.2em',
        textTransform: 'uppercase', fontWeight: 500,
        color: isAfter ? 'var(--candle)' : 'var(--muted)',
        padding: '4px 10px', borderRadius: 9999,
        background: isAfter ? 'rgba(182,141,64,0.1)' : 'transparent',
        border: isAfter ? '1px solid rgba(182,141,64,0.2)' : '1px solid var(--border)',
        marginBottom: 28,
      }}>{label}</div>

      <h3 style={{
        margin: 0, fontFamily: 'var(--font-syne)', fontWeight: 700,
        fontSize: isMobile ? 24 : 32, lineHeight: 1.1, letterSpacing: '-0.03em',
        color: isAfter ? 'var(--candle)' : 'var(--parchment)',
        textWrap: 'balance' as React.CSSProperties['textWrap'],
      }}>{title}</h3>

      <p style={{
        margin: '12px 0 28px', fontFamily: 'var(--font-ibm)', fontWeight: 300,
        fontSize: 15, lineHeight: 1.55, color: 'var(--sand)',
      }}>{subtitle}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((it, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 10,
            background: isAfter ? 'var(--surface-2)' : 'transparent',
            border: '1px solid rgba(78,69,56,0.15)',
          }}>
            <span className="material-symbols-outlined" style={{
              fontSize: 16,
              color: isAfter ? '#6EBF8B' : '#ffb4ab',
              fontVariationSettings: "'FILL' 1",
            }}>{isAfter ? 'check_circle' : 'cancel'}</span>
            <span style={{
              flex: 1, fontFamily: 'var(--font-ibm)', fontSize: 13,
              color: 'var(--parchment)', fontWeight: 300,
            }}>{it[0]}</span>
            <span style={{
              fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 13,
              color: isAfter ? 'var(--candle)' : 'var(--muted)', whiteSpace: 'nowrap',
            }}>{it[1]}</span>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'baseline', gap: 10,
      }}>
        <div style={{
          fontFamily: 'var(--font-syne)', fontWeight: 700,
          fontSize: isMobile ? 44 : 56, letterSpacing: '-0.04em', lineHeight: 1,
          color: isAfter ? 'var(--candle)' : 'var(--parchment)',
        }}>{hours}</div>
        <div style={{ fontFamily: 'var(--font-ibm)', fontSize: 13, color: 'var(--sand)', fontWeight: 300 }}>{per}</div>
      </div>
    </div>
  )
}

export function BeforeAfter() {
  const { t } = useT()
  const { isMobile, isTablet } = useBreakpoint()
  return (
    <section style={{ padding: isMobile ? '72px 20px' : '120px 32px', position: 'relative' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <SectionHeader
          eyebrow={t.ba.eyebrow}
          title={<>{t.ba.title_1} <span style={{ fontStyle: 'italic', fontWeight: 400 }}>{t.ba.title_2}</span> {t.ba.title_3} <span style={{ color: 'var(--candle)' }}>{t.ba.title_4}</span>{t.ba.title_5}</>}
          subtitle={t.ba.sub}
          center
        />
        <div style={{
          marginTop: 64, display: 'grid',
          gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr',
          gap: 24,
        }}>
          <Col kind="before" label={t.ba.before.label} title={t.ba.before.title}
               subtitle={t.ba.before.subtitle} items={t.ba.before.items}
               hours={t.ba.before.hours} per={t.ba.before.per} isMobile={isMobile}/>
          <Col kind="after" label={t.ba.after.label} title={t.ba.after.title}
               subtitle={t.ba.after.subtitle} items={t.ba.after.items}
               hours={t.ba.after.hours} per={t.ba.after.per} isMobile={isMobile}/>
        </div>
      </div>
    </section>
  )
}
