'use client'
import { useState } from 'react'
import { SectionHeader } from './ui'
import { useT } from './LangContext'
import { useBreakpoint } from './useBreakpoint'

export function FAQ() {
  const { t } = useT()
  const { isMobile } = useBreakpoint()
  const [open, setOpen] = useState<number>(0)

  return (
    <section id="faq" style={{ padding: isMobile ? '72px 20px' : '120px 32px', position: 'relative' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <SectionHeader
          eyebrow={t.faq.eyebrow}
          title={<>{t.faq.title_1} <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--candle)' }}>{t.faq.title_2}</span>{t.faq.title_3}</>}
          center
        />
        <div style={{
          marginTop: 64, display: 'flex', flexDirection: 'column', gap: 2,
          background: 'var(--border)', borderRadius: 14, overflow: 'hidden',
          border: '1px solid var(--border)',
        }}>
          {t.faq.items.map(([q, a], i) => {
            const isOpen = open === i
            return (
              <div key={i} style={{ background: 'var(--carbon)' }}>
                <button onClick={() => setOpen(isOpen ? -1 : i)}
                  style={{
                    width: '100%', padding: isMobile ? '18px 20px' : '22px 26px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: isMobile ? 15 : 17,
                    letterSpacing: '-0.01em', color: 'var(--parchment)', textAlign: 'left',
                  }}>
                  <span style={{ paddingRight: 16, textWrap: 'balance' as React.CSSProperties['textWrap'] }}>{q}</span>
                  <span className="material-symbols-outlined" style={{
                    fontSize: 22, color: isOpen ? 'var(--candle)' : 'var(--muted)',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform .25s, color .15s', flexShrink: 0,
                  }}>expand_more</span>
                </button>
                <div style={{ maxHeight: isOpen ? 400 : 0, overflow: 'hidden', transition: 'max-height .35s ease' }}>
                  <p style={{
                    margin: 0, padding: isMobile ? '0 20px 20px' : '0 26px 24px',
                    fontFamily: 'var(--font-ibm)', fontWeight: 300, fontSize: 15,
                    lineHeight: 1.65, color: 'var(--sand)',
                    textWrap: 'pretty' as React.CSSProperties['textWrap'],
                    maxWidth: 720,
                  }}>{a}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
