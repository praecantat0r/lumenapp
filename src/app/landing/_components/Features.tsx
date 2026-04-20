'use client'
import { useState } from 'react'
import { SectionHeader } from './ui'
import { useT } from './LangContext'
import { useBreakpoint } from './useBreakpoint'

const icons = ['psychology', 'edit_note', 'image', 'schedule', 'forum', 'insights', 'shield_person', 'bolt']

export function Features() {
  const { t } = useT()
  const { isMobile, isTablet } = useBreakpoint()
  const [hovered, setHovered] = useState<number | null>(null)
  const items = t.features.items.map((f, i) => ({ ...f, icon: icons[i] }))

  const cols = isMobile || isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'

  return (
    <section id="product" style={{ padding: isMobile ? '72px 20px' : '120px 32px', position: 'relative' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <SectionHeader
          eyebrow={t.features.eyebrow}
          title={
            <span style={{ whiteSpace: 'pre-line' }}>
              {t.features.title_1}{' '}
              <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--candle)' }}>{t.features.title_2}</span>
              {t.features.title_3}
            </span>
          }
          subtitle={t.features.sub}
        />

        <div style={{
          marginTop: 72, display: 'grid', gridTemplateColumns: cols, gap: 1,
          background: 'var(--border)', border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          {items.map((f, i) => (
            <div key={f.title}
              style={{
                background: hovered === i ? 'var(--surface)' : 'var(--carbon)',
                padding: isMobile ? 20 : 28, minHeight: isMobile ? 'auto' : 220,
                display: 'flex', flexDirection: 'column', gap: 14,
                transition: 'background .2s', cursor: 'default',
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(182,141,64,0.1)', border: '1px solid rgba(182,141,64,0.2)',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--candle)' }}>{f.icon}</span>
              </div>
              <h3 style={{
                margin: 0, fontFamily: 'var(--font-syne)', fontWeight: 700,
                fontSize: 17, letterSpacing: '-0.02em', color: 'var(--parchment)',
              }}>{f.title}</h3>
              <p style={{
                margin: 0, fontFamily: 'var(--font-ibm)', fontWeight: 300,
                fontSize: 13, lineHeight: 1.6, color: 'var(--sand)',
                textWrap: 'pretty' as React.CSSProperties['textWrap'],
              }}>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
