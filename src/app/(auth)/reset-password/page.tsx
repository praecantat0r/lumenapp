'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LumenMark } from '@/components/ui/LumenLogo'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [ready, setReady]   = useState(false)
  const [expired, setExpired] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    window.history.replaceState({}, '', '/reset-password')

    if (params.get('verified') === 'true') {
      setReady(true)
    } else if (params.get('error') === 'invalid') {
      setExpired(true)
    } else if (params.get('code')) {
      const code = params.get('code')!
      const supabase = createClient()
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) setExpired(true)
        else setReady(true)
      })
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    toast.success('Password updated!')
    router.push('/dashboard/overview')
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
        .a-f4 { animation-delay: 0.32s; }

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
              New password
            </h1>
            <p style={{ fontFamily: 'var(--font-ibm)', fontWeight: 300, fontSize: 13.5, color: 'rgba(196,185,154,0.5)' }}>
              {ready ? 'Choose a new password for your account.' : expired ? 'This link can no longer be used.' : 'Verifying your reset link…'}
            </p>
          </div>

          {expired ? (
            <div className="a-field a-f2" style={{ textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'rgba(201,80,80,0.1)', border: '1px solid rgba(201,80,80,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C95050" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <p style={{ fontFamily: 'var(--font-ibm)', fontWeight: 400, fontSize: 14, color: '#F6F2EA', marginBottom: 8 }}>
                Link expired
              </p>
              <p style={{ fontFamily: 'var(--font-ibm)', fontWeight: 300, fontSize: 13, color: 'rgba(196,185,154,0.5)', marginBottom: 28 }}>
                This reset link is invalid or has already been used.
              </p>
              <Link href="/forgot-password" style={{ fontFamily: 'var(--font-ibm)', fontSize: 13, fontWeight: 400, color: '#D4A84B', textDecoration: 'none' }}>
                Request a new link →
              </Link>
            </div>
          ) : !ready ? (
            <div className="a-field a-f2" style={{ textAlign: 'center' }}>
              <div style={{ width: 20, height: 20, border: '2px solid rgba(212,168,75,0.3)', borderTopColor: '#D4A84B', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <p style={{ fontFamily: 'var(--font-ibm)', fontSize: 12, color: 'rgba(196,185,154,0.35)', marginTop: 16 }}>
                Verifying reset link…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>

              <div className="a-field a-f2">
                <label style={{ display: 'block', fontFamily: 'var(--font-ibm)', fontSize: 9.5, fontWeight: 400, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(196,185,154,0.45)', marginBottom: 10 }}>
                  New password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="auth-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    style={{ paddingRight: 32 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'rgba(196,185,154,0.4)', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(196,185,154,0.8)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(196,185,154,0.4)')}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="a-field a-f3">
                <label style={{ display: 'block', fontFamily: 'var(--font-ibm)', fontSize: 9.5, fontWeight: 400, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(196,185,154,0.45)', marginBottom: 10 }}>
                  Confirm password
                </label>
                <input
                  className="auth-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <div className="a-field a-f4" style={{ paddingTop: 6 }}>
                <button type="submit" className="auth-btn" disabled={loading}>
                  {loading ? 'Updating…' : 'Set new password'}
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </>
  )
}
