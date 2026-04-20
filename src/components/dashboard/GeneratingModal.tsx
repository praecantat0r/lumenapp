'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const STEPS = [
  { label: 'Analyzing brand identity…',   duration: 8 },
  { label: 'Crafting visual concept…',    duration: 20 },
  { label: 'Generating image…',           duration: 60 },
  { label: 'Writing caption…',            duration: 15 },
  { label: 'Composing final design…',     duration: 15 },
]

interface Props {
  step: string
}

export function GeneratingModal({ step }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const modal = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(12,11,6,0.75)', backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16, padding: '44px 52px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28,
        minWidth: 360, maxWidth: 440,
        boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
      }}>
        {/* Animated logo/spinner */}
        <div style={{ position: 'relative', width: 56, height: 56 }}>
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ position: 'absolute', inset: 0 }}>
            <circle cx="28" cy="28" r="26" stroke="var(--border)" strokeWidth="1.5"/>
            <circle cx="28" cy="28" r="26" stroke="#D4A84B" strokeWidth="1.5"
              strokeDasharray="40 124" strokeLinecap="round"
              style={{ transformOrigin: '28px 28px', animation: 'gm-spin 1.4s linear infinite' }}
            />
          </svg>
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ position: 'absolute', inset: 0 }}>
            <line x1="28" y1="20" x2="28" y2="14" stroke="#D4A84B" strokeWidth="1.5" strokeLinecap="round"
              style={{ transformOrigin: '28px 28px', animation: 'gm-breathe 2s ease-in-out infinite 0s' }}/>
            <line x1="28" y1="36" x2="28" y2="42" stroke="#D4A84B" strokeWidth="1.5" strokeLinecap="round"
              style={{ transformOrigin: '28px 28px', animation: 'gm-breathe 2s ease-in-out infinite .5s' }}/>
            <line x1="20" y1="28" x2="14" y2="28" stroke="#D4A84B" strokeWidth="1.5" strokeLinecap="round"
              style={{ transformOrigin: '28px 28px', animation: 'gm-breathe 2s ease-in-out infinite 1s' }}/>
            <line x1="36" y1="28" x2="42" y2="28" stroke="#D4A84B" strokeWidth="1.5" strokeLinecap="round"
              style={{ transformOrigin: '28px 28px', animation: 'gm-breathe 2s ease-in-out infinite 1.5s' }}/>
            <circle cx="28" cy="28" r="3.5" fill="#D4A84B"/>
          </svg>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 20, color: 'var(--parchment)', letterSpacing: '-0.02em', marginBottom: 8 }}>
            Generating post
          </div>
          <div style={{ fontFamily: 'var(--font-ibm)', fontWeight: 300, fontSize: 13, color: 'var(--sand)', letterSpacing: '0.02em', minHeight: 20, transition: 'opacity 0.4s' }}>
            {step}
          </div>
        </div>

        {/* Steps */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {STEPS.map(s => {
            const isActive = s.label === step
            const stepIdx  = STEPS.findIndex(x => x.label === step)
            const myIdx    = STEPS.indexOf(s)
            const isDone   = stepIdx > myIdx
            return (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: isDone ? '#6EBF8B' : isActive ? '#D4A84B' : 'var(--border)',
                  transition: 'background 0.3s',
                  boxShadow: isActive ? '0 0 8px rgba(212,168,75,0.5)' : 'none',
                }} />
                <div style={{
                  fontFamily: 'var(--font-ibm)', fontSize: 12, fontWeight: 300,
                  color: isDone ? '#6EBF8B' : isActive ? 'var(--parchment)' : 'var(--muted)',
                  transition: 'color 0.3s',
                }}>
                  {s.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        @keyframes gm-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes gm-breathe { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  )

  if (!mounted) return null
  return createPortal(modal, document.body)
}
