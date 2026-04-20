'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const GENERATING_STEPS = ['Analyzing image…', 'Writing caption…']

export function CaptionGeneratingOverlay({ step }: { step: string }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(12,11,6,0.75)', backdropFilter: 'blur(8px)',
    }}>
      <style>{`
        @keyframes cg-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes cg-breathe { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '44px 52px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28,
        minWidth: 340, maxWidth: 420,
        boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
      }}>
        <div style={{ position: 'relative', width: 56, height: 56 }}>
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ position: 'absolute', inset: 0 }}>
            <circle cx="28" cy="28" r="26" stroke="var(--border)" strokeWidth="1.5"/>
            <circle cx="28" cy="28" r="26" stroke="#D4A84B" strokeWidth="1.5"
              strokeDasharray="40 124" strokeLinecap="round"
              style={{ transformOrigin: '28px 28px', animation: 'cg-spin 1.4s linear infinite' }}
            />
          </svg>
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ position: 'absolute', inset: 0 }}>
            <line x1="28" y1="20" x2="28" y2="14" stroke="#D4A84B" strokeWidth="1.5" strokeLinecap="round" style={{ animation: 'cg-breathe 2s ease-in-out infinite 0s' }}/>
            <line x1="28" y1="36" x2="28" y2="42" stroke="#D4A84B" strokeWidth="1.5" strokeLinecap="round" style={{ animation: 'cg-breathe 2s ease-in-out infinite .5s' }}/>
            <line x1="20" y1="28" x2="14" y2="28" stroke="#D4A84B" strokeWidth="1.5" strokeLinecap="round" style={{ animation: 'cg-breathe 2s ease-in-out infinite 1s' }}/>
            <line x1="36" y1="28" x2="42" y2="28" stroke="#D4A84B" strokeWidth="1.5" strokeLinecap="round" style={{ animation: 'cg-breathe 2s ease-in-out infinite 1.5s' }}/>
            <circle cx="28" cy="28" r="3.5" fill="#D4A84B"/>
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 20, color: 'var(--parchment)', letterSpacing: '-0.02em', marginBottom: 8 }}>
            Generating caption
          </div>
          <div style={{ fontFamily: 'var(--font-ibm)', fontWeight: 300, fontSize: 13, color: 'var(--sand)', letterSpacing: '0.02em' }}>
            {step}
          </div>
        </div>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {GENERATING_STEPS.map((s, i) => {
            const activeIdx = GENERATING_STEPS.indexOf(step)
            const isDone = i < activeIdx
            const isActive = s === step
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: isDone ? '#6EBF8B' : isActive ? '#D4A84B' : 'var(--border)',
                  boxShadow: isActive ? '0 0 8px rgba(212,168,75,0.5)' : 'none',
                  transition: 'background 0.3s',
                }} />
                <div style={{
                  fontFamily: 'var(--font-ibm)', fontSize: 12, fontWeight: 300,
                  color: isDone ? '#6EBF8B' : isActive ? 'var(--parchment)' : 'var(--muted)',
                  transition: 'color 0.3s',
                }}>
                  {s}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}

export function CaptionResultModal({
  caption,
  hashtags,
  onClose,
  onRetry,
}: {
  caption: string
  hashtags: string
  onClose: () => void
  onRetry: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [copiedCaption, setCopiedCaption] = useState(false)
  const [copiedHashtags, setCopiedHashtags] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  function copyCaption() {
    navigator.clipboard.writeText(caption)
    setCopiedCaption(true)
    setTimeout(() => setCopiedCaption(false), 2000)
  }

  function copyHashtags() {
    navigator.clipboard.writeText(hashtags)
    setCopiedHashtags(true)
    setTimeout(() => setCopiedHashtags(false), 2000)
  }

  if (!mounted) return null

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(12,11,6,0.75)', backdropFilter: 'blur(8px)',
        padding: '24px 16px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '32px 36px',
        display: 'flex', flexDirection: 'column', gap: 24,
        width: '100%', maxWidth: 520,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18, color: 'var(--parchment)', letterSpacing: '-0.02em' }}>
            Caption ready
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4, borderRadius: 6, display: 'flex', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--parchment)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="13" y1="3" x2="3" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Caption */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Caption</div>
            <button
              onClick={copyCaption}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: copiedCaption ? 'rgba(110,191,139,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${copiedCaption ? 'rgba(110,191,139,0.3)' : 'var(--border)'}`,
                borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                fontSize: 11, color: copiedCaption ? '#6EBF8B' : 'var(--sand)',
                fontFamily: 'var(--font-ibm)', transition: 'all 0.2s',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                {copiedCaption ? 'check' : 'content_copy'}
              </span>
              {copiedCaption ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '16px 18px',
            fontSize: 13, lineHeight: 1.7, color: 'var(--parchment)',
            fontFamily: 'var(--font-ibm)', whiteSpace: 'pre-wrap',
          }}>
            {caption}
          </div>
        </div>

        {/* Hashtags */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Hashtags</div>
            <button
              onClick={copyHashtags}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: copiedHashtags ? 'rgba(110,191,139,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${copiedHashtags ? 'rgba(110,191,139,0.3)' : 'var(--border)'}`,
                borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                fontSize: 11, color: copiedHashtags ? '#6EBF8B' : 'var(--sand)',
                fontFamily: 'var(--font-ibm)', transition: 'all 0.2s',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                {copiedHashtags ? 'check' : 'content_copy'}
              </span>
              {copiedHashtags ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '14px 18px',
            fontSize: 12, lineHeight: 1.8, color: 'var(--candle)',
            fontFamily: 'var(--font-ibm)',
          }}>
            {hashtags}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onRetry}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 9999,
              background: 'none', border: '1px solid var(--border)',
              color: 'var(--sand)', fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--font-syne)', cursor: 'pointer',
              transition: 'border-color 0.2s, color 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(182,141,64,0.4)'; e.currentTarget.style.color = 'var(--parchment)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--sand)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>refresh</span>
            Try again
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 9999,
              background: 'var(--candle)', border: 'none',
              color: '#fff', fontSize: 13, fontWeight: 700,
              fontFamily: 'var(--font-syne)', cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--ember)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--candle)')}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
