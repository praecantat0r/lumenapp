'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LumenMark } from '@/components/ui/LumenLogo'
import toast from 'react-hot-toast'

const RATE_KEY = 'pw_reset_attempts'
const MAX_ATTEMPTS = 3
const WINDOW_MS = 15 * 60 * 1000

function getAttempts(): number[] {
  try {
    const raw = localStorage.getItem(RATE_KEY)
    if (!raw) return []
    const attempts: number[] = JSON.parse(raw)
    const now = Date.now()
    return attempts.filter(t => now - t < WINDOW_MS)
  } catch { return [] }
}

function recordAttempt() {
  const attempts = getAttempts()
  attempts.push(Date.now())
  localStorage.setItem(RATE_KEY, JSON.stringify(attempts))
}

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]     = useState(false)
  const [cooldown, setCooldown] = useState<number | null>(null)

  useEffect(() => {
    const attempts = getAttempts()
    if (attempts.length >= MAX_ATTEMPTS) {
      const oldestInWindow = attempts[attempts.length - MAX_ATTEMPTS]
      const unlocksAt = oldestInWindow + WINDOW_MS
      setCooldown(unlocksAt)
    }
  }, [])

  useEffect(() => {
    if (cooldown === null) return
    const id = setInterval(() => {
      if (Date.now() >= cooldown) {
        setCooldown(null)
        clearInterval(id)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [cooldown])

  function formatTimeLeft() {
    if (cooldown === null) return ''
    const secs = Math.max(0, Math.ceil((cooldown - Date.now()) / 1000))
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const attempts = getAttempts()
    if (attempts.length >= MAX_ATTEMPTS) {
      const unlocksAt = attempts[attempts.length - MAX_ATTEMPTS] + WINDOW_MS
      setCooldown(unlocksAt)
      toast.error('Too many attempts. Please wait before trying again.')
      return
    }
    setLoading(true)
    recordAttempt()
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      if (error.message.toLowerCase().includes('rate limit') || error.status === 429) {
        // Force max attempts so cooldown kicks in
        const now = Date.now()
        const fakeAttempts = Array.from({ length: MAX_ATTEMPTS }, (_, i) => now - i * 1000)
        localStorage.setItem(RATE_KEY, JSON.stringify(fakeAttempts))
        setCooldown(now + WINDOW_MS)
        toast.error('Too many emails sent. Please wait 15 minutes.')
      } else {
        toast.error(error.message)
      }
      setLoading(false)
      return
    }
    setSent(true)
    setLoading(false)
  }

  return (
    <>
      <style>{`
        @keyframes authFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .a-field { animation: authFadeUp 0.55s cubic-bezier(0.22,1,0.36,1) forwards; opacity: 0; }
        .a-f1 { animation-delay: 0.05s; }
        .a-f2 { animation-delay: 0.14s; }
        .a-f3 { animation-delay: 0.23s; }

        .auth-input {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(45,42,31,0.9);
          color: #F6F2EA;
          font-family: var(--font-ibm);
          font-weight: 300;
          font-size: 15px;
          padding: 10px 0;
          outline: none;
          transition: border-color 0.2s;
          caret-color: #D4A84B;
        }
        .auth-input:focus { border-bottom-color: #D4A84B; }
        .auth-input::placeholder { color: rgba(196,185,154,0.28); }
        .auth-input:-webkit-autofill,
        .auth-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #111009 inset;
          -webkit-text-fill-color: #F6F2EA;
          transition: background-color 5000s;
        }

        .auth-btn {
          width: 100%;
          background: #D4A84B;
          color: #ffffff;
          border: none;
          padding: 15px 0;
          font-family: var(--font-syne);
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          border-radius: 3px;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
        }
        .auth-btn:hover:not(:disabled) { background: #c4983d; }
        .auth-btn:active:not(:disabled) { transform: scale(0.985); }
        .auth-btn:disabled { opacity: 0.45; cursor: not-allowed; }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: '#111009', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ width: '100%', maxWidth: 360 }}>

          <div className="a-field a-f1" style={{ marginBottom: 44 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 32 }}>
              <LumenMark size={20} />
              <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em', color: '#F6F2EA' }}>
                lumen
              </span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.025em', color: '#F6F2EA', marginBottom: 8 }}>
              Reset password
            </h1>
            <p style={{ fontFamily: 'var(--font-ibm)', fontWeight: 300, fontSize: 13.5, color: 'rgba(196,185,154,0.5)' }}>
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          {sent ? (
            <div className="a-field a-f2" style={{ textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'rgba(212,168,75,0.12)',
                border: '1px solid rgba(212,168,75,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4A84B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <p style={{ fontFamily: 'var(--font-ibm)', fontWeight: 300, fontSize: 14, color: '#F6F2EA', marginBottom: 8 }}>
                Check your inbox
              </p>
              <p style={{ fontFamily: 'var(--font-ibm)', fontWeight: 300, fontSize: 13, color: 'rgba(196,185,154,0.5)', marginBottom: 28 }}>
                We sent a reset link to <span style={{ color: 'rgba(196,185,154,0.8)' }}>{email}</span>
              </p>
              <Link href="/login" style={{ fontFamily: 'var(--font-ibm)', fontSize: 13, fontWeight: 300, color: '#D4A84B', textDecoration: 'none' }}>
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
              <div className="a-field a-f2">
                <label style={{ display: 'block', fontFamily: 'var(--font-ibm)', fontSize: 9.5, fontWeight: 400, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(196,185,154,0.45)', marginBottom: 10 }}>
                  Email address
                </label>
                <input
                  className="auth-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="a-field a-f3" style={{ paddingTop: 6 }}>
                <button type="submit" className="auth-btn" disabled={loading || cooldown !== null}>
                  {loading ? 'Sending…' : cooldown !== null ? `Try again in ${formatTimeLeft()}` : 'Send reset link'}
                </button>
                {cooldown !== null && (
                  <p style={{ fontFamily: 'var(--font-ibm)', fontSize: 11.5, color: 'rgba(196,185,154,0.38)', textAlign: 'center', marginTop: 12 }}>
                    3 attempts reached — resets in {formatTimeLeft()}
                  </p>
                )}
              </div>

              <div style={{ textAlign: 'center', marginTop: -8 }}>
                <Link href="/login" style={{ fontFamily: 'var(--font-ibm)', fontSize: 13, fontWeight: 300, color: 'rgba(196,185,154,0.38)', textDecoration: 'none' }}>
                  ← Back to sign in
                </Link>
              </div>
            </form>
          )}

        </div>
      </div>
    </>
  )
}
