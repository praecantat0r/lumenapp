'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LumenMark } from '@/components/ui/LumenLogo'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]       = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: bb } = await supabase
        .from('brand_brains')
        .select('onboarding_complete')
        .eq('user_id', user.id)
        .single()
      if (bb?.onboarding_complete) router.push('/dashboard/overview')
      else router.push('/onboarding')
    }
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
        .a-f5 { animation-delay: 0.41s; }

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

        .dot-field {
          background-image: radial-gradient(circle, rgba(212,168,75,0.1) 1px, transparent 1px);
          background-size: 30px 30px;
        }
        .panel-glow {
          background: radial-gradient(ellipse at 55% 38%, rgba(212,168,75,0.1) 0%, transparent 62%);
        }

        @media (max-width: 840px) {
          .auth-left { display: none !important; }
          .auth-right { padding: 40px 28px !important; }
        }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: '#111009' }}>

        {/* ── Left panel ── */}
        <div
          className="auth-left dot-field panel-glow"
          style={{
            width: '44%',
            flexShrink: 0,
            borderRight: '1px solid rgba(212,168,75,0.12)',
            background: '#0D0C07',
            display: 'flex',
            flexDirection: 'column',
            padding: '44px 48px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <LumenMark size={20} />
            <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em', color: '#F6F2EA' }}>
              lumen
            </span>
          </div>

          {/* Hero copy */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: 32 }}>
            <LumenMark size={52} />
            <div style={{ marginTop: 32 }}>
              <p style={{
                fontFamily: 'var(--font-ibm)',
                fontSize: 10,
                fontWeight: 400,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#D4A84B',
                marginBottom: 18,
                opacity: 0.85,
              }}>
                AI Brand Publishing
              </p>
              <h2 style={{
                fontFamily: 'var(--font-syne)',
                fontWeight: 700,
                fontSize: 'clamp(30px, 3vw, 44px)',
                lineHeight: 1.08,
                color: '#F6F2EA',
                marginBottom: 18,
                letterSpacing: '-0.02em',
              }}>
                Your brand,<br />
                <span style={{ color: '#D4A84B' }}>always on.</span>
              </h2>
              <p style={{
                fontFamily: 'var(--font-ibm)',
                fontWeight: 300,
                fontSize: 13.5,
                lineHeight: 1.75,
                color: 'rgba(196,185,154,0.55)',
                maxWidth: 280,
              }}>
                AI-generated posts designed and published automatically — so your brand never goes quiet.
              </p>
            </div>
          </div>

          {/* Feature list */}
          <div style={{ borderTop: '1px solid rgba(45,42,31,0.9)', paddingTop: 22, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[
              'AI content & caption generation',
              'Auto-scheduled Instagram publishing',
              'Brand-consistent visual templates',
            ].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#D4A84B', opacity: 0.55, flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-ibm)', fontWeight: 300, fontSize: 11.5, color: 'rgba(196,185,154,0.45)', letterSpacing: '0.03em' }}>
                  {f}
                </span>
              </div>
            ))}
          </div>

          {/* Decorative corner */}
          <div style={{
            position: 'absolute', bottom: 0, right: -1,
            width: 100, height: 100,
            borderTop: '1px solid rgba(212,168,75,0.07)',
            borderLeft: '1px solid rgba(212,168,75,0.07)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* ── Right form panel ── */}
        <div
          className="auth-right"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 64px',
          }}
        >
          <div style={{ width: '100%', maxWidth: 360 }}>

            {/* Heading */}
            <div className="a-field a-f1" style={{ marginBottom: 44 }}>
              <h1 style={{
                fontFamily: 'var(--font-syne)',
                fontWeight: 700,
                fontSize: 26,
                letterSpacing: '-0.025em',
                color: '#F6F2EA',
                marginBottom: 8,
              }}>
                Welcome back
              </h1>
              <p style={{ fontFamily: 'var(--font-ibm)', fontWeight: 300, fontSize: 13.5, color: 'rgba(196,185,154,0.5)' }}>
                Sign in to your Lumen workspace
              </p>
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>

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

              <div className="a-field a-f3">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <label style={{ display: 'block', fontFamily: 'var(--font-ibm)', fontSize: 9.5, fontWeight: 400, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(196,185,154,0.45)' }}>
                    Password
                  </label>
                  <Link href="/forgot-password" style={{ fontFamily: 'var(--font-ibm)', fontSize: 11.5, fontWeight: 300, color: 'rgba(196,185,154,0.4)', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#D4A84B')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(196,185,154,0.4)')}>
                    Forgot password?
                  </Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    className="auth-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    style={{ paddingRight: 32 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                      color: 'rgba(196,185,154,0.4)', display: 'flex', alignItems: 'center',
                      transition: 'color 0.2s',
                    }}
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

              <div className="a-field a-f4" style={{ paddingTop: 6 }}>
                <button type="submit" className="auth-btn" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </div>

            </form>

            <div className="a-field a-f5" style={{ marginTop: 28, textAlign: 'center' }}>
              <span style={{ fontFamily: 'var(--font-ibm)', fontWeight: 300, fontSize: 13, color: 'rgba(196,185,154,0.38)' }}>
                No account?{' '}
                <Link href="/signup" style={{ color: '#D4A84B', textDecoration: 'none' }}>
                  Create one
                </Link>
              </span>
            </div>

          </div>
        </div>

      </div>
    </>
  )
}
