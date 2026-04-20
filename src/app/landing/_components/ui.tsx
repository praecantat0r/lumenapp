'use client'
import { useState } from 'react'

// ─── LumenMark ──────────────────────────────────────────────────────────────
export function LumenMark({ size = 52, color = '#b68d40' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none">
      <style>{`
        @keyframes lm-breathe { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes lm-rotate  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .lm-r1{animation:lm-breathe 3s ease-in-out infinite 0s}
        .lm-r2{animation:lm-breathe 3s ease-in-out infinite .4s}
        .lm-r3{animation:lm-breathe 3s ease-in-out infinite .8s}
        .lm-r4{animation:lm-breathe 3s ease-in-out infinite 1.2s}
        .lm-diag{transform-origin:26px 26px;animation:lm-rotate 18s linear infinite}
      `}</style>
      <line className="lm-r1" x1="26" y1="16" x2="26" y2="4"  stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line className="lm-r2" x1="26" y1="36" x2="26" y2="48" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line className="lm-r3" x1="16" y1="26" x2="4"  y2="26" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line className="lm-r4" x1="36" y1="26" x2="48" y2="26" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <g className="lm-diag">
        <line x1="18.9" y1="18.9" x2="11" y2="11" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.55"/>
        <line x1="33.1" y1="33.1" x2="41" y2="41" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.55"/>
        <line x1="33.1" y1="18.9" x2="41" y2="11" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.55"/>
        <line x1="18.9" y1="33.1" x2="11" y2="41" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.55"/>
      </g>
      <circle cx="26" cy="26" r="4" fill={color}/>
    </svg>
  )
}

export function LumenWordmark({ showTagline = false, size = 22 }: { showTagline?: boolean; size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <LumenMark size={28} />
      <div>
        <div style={{
          fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: size,
          color: 'var(--candle)', letterSpacing: '-0.03em', lineHeight: 1,
        }}>
          Lumen
        </div>
        {showTagline && (
          <div style={{
            fontFamily: 'var(--font-ibm)', fontSize: 9, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--muted)', marginTop: 3, fontWeight: 500,
          }}>
            The Curated Archive
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Button ─────────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'ghost' | 'gold-ghost' | 'danger' | 'auth'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children?: React.ReactNode
  onClick?: () => void
  style?: React.CSSProperties
  icon?: string
  iconFilled?: boolean
}

export function Button({ variant = 'primary', size = 'md', loading, children, onClick, style = {}, icon, iconFilled }: ButtonProps) {
  const [hover, setHover] = useState(false)

  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontFamily: 'var(--font-syne)', fontWeight: 700, borderRadius: 9999, border: 'none',
    cursor: loading ? 'wait' : 'pointer',
    transition: 'background .15s, transform .1s, border-color .15s, color .15s',
    whiteSpace: 'nowrap',
  }

  const sizes: Record<ButtonSize, React.CSSProperties> = {
    sm: { padding: '6px 14px', fontSize: 11 },
    md: { padding: '9px 20px', fontSize: 13 },
    lg: { padding: '11px 26px', fontSize: 14 },
  }

  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary:      { background: 'var(--candle)', color: '#ffffff' },
    ghost:        { background: 'transparent', border: '1px solid var(--border)', color: 'var(--sand)' },
    'gold-ghost': { background: 'rgba(182,141,64,0.12)', border: '1px solid rgba(182,141,64,0.25)', color: 'var(--candle)' },
    danger:       { background: 'transparent', border: '1px solid rgba(255,107,107,.4)', color: '#FF6B6B' },
    auth:         { background: 'var(--candle)', color: '#ffffff', padding: '13px 28px', fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase', borderRadius: 3, width: '100%' },
  }

  const v = variants[variant] ?? variants.primary
  const s = variant === 'auth' ? {} : sizes[size]

  const hoverStyle: React.CSSProperties = hover ? (
    variant === 'primary' || variant === 'auth' ? { background: 'var(--ember)' }
    : variant === 'ghost' ? { borderColor: 'rgba(182,141,64,.4)', color: 'var(--parchment)' }
    : variant === 'gold-ghost' ? { background: 'rgba(182,141,64,.2)' }
    : {}
  ) : {}

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...base, ...v, ...s, ...hoverStyle, ...style }}
    >
      {loading ? (
        <span className="material-symbols-outlined" style={{ fontSize: 16, animation: 'lm-rotate 1.4s linear infinite', display: 'inline-block' }}>autorenew</span>
      ) : icon ? (
        <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: iconFilled ? "'FILL' 1" : undefined }}>{icon}</span>
      ) : null}
      {children}
    </button>
  )
}

// ─── SectionHeader ───────────────────────────────────────────────────────────
interface SectionHeaderProps {
  eyebrow: string
  title: React.ReactNode
  subtitle?: string
  center?: boolean
}

export function SectionHeader({ eyebrow, title, subtitle, center = false }: SectionHeaderProps) {
  return (
    <div style={{ textAlign: center ? 'center' : 'left', maxWidth: center ? 720 : 'none', margin: center ? '0 auto' : undefined }}>
      <div style={{
        fontFamily: 'var(--font-ibm)', fontSize: 11, letterSpacing: '0.2em',
        textTransform: 'uppercase', color: 'var(--candle)', fontWeight: 500,
        marginBottom: 16,
      }}>{eyebrow}</div>
      <h2 style={{
        margin: 0, fontFamily: 'var(--font-syne)', fontWeight: 700,
        fontSize: 'clamp(36px, 4.5vw, 56px)', lineHeight: 1.05,
        letterSpacing: '-0.03em', color: 'var(--parchment)',
        textWrap: 'balance' as React.CSSProperties['textWrap'],
      }}>{title}</h2>
      {subtitle && (
        <p style={{
          margin: '18px 0 0', fontFamily: 'var(--font-ibm)', fontWeight: 300,
          fontSize: 17, lineHeight: 1.55, color: 'var(--sand)',
          maxWidth: center ? undefined : 620,
          textWrap: 'pretty' as React.CSSProperties['textWrap'],
        }}>{subtitle}</p>
      )}
    </div>
  )
}
