'use client'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('lumen-theme')
    if (stored) document.documentElement.setAttribute('data-theme', stored)
    setIsDark((stored ?? document.documentElement.getAttribute('data-theme')) === 'dark')
    setMounted(true)
  }, [])

  function toggle() {
    const next = isDark ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('lumen-theme', next)
    setIsDark(!isDark)
  }

  if (!mounted) return null

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        position: 'fixed',
        bottom: 72,
        right: 24,
        zIndex: 1000,
        width: 38,
        height: 38,
        borderRadius: '50%',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        color: 'var(--sand)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
        padding: 0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--candle)'
        e.currentTarget.style.color = 'var(--candle)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.color = 'var(--sand)'
      }}
    >
      {isDark ? (
        /* Sun icon */
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <line x1="12" y1="2" x2="12" y2="5"/>
          <line x1="12" y1="19" x2="12" y2="22"/>
          <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/>
          <line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
          <line x1="2" y1="12" x2="5" y2="12"/>
          <line x1="19" y1="12" x2="22" y2="12"/>
          <line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/>
          <line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        /* Moon icon */
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
        </svg>
      )}
    </button>
  )
}
