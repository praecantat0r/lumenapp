'use client'
import { useState } from 'react'
import { LumenWordmark } from './ui'
import { Button } from './ui'
import { useT } from './LangContext'
import { useBreakpoint } from './useBreakpoint'
import type { Lang } from './i18n'

function LangToggle({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div style={{
      display: 'inline-flex', padding: 2, borderRadius: 9999,
      background: 'transparent', border: '1px solid var(--border)',
      fontFamily: 'var(--font-ibm)', fontSize: 11, letterSpacing: '0.1em', fontWeight: 500,
    }}>
      {(['en', 'sk'] as Lang[]).map(l => (
        <button key={l} onClick={() => onChange(l)}
          aria-pressed={lang === l}
          style={{
            padding: '5px 10px', minWidth: 34, borderRadius: 9999, border: 'none',
            background: lang === l ? 'var(--candle)' : 'transparent',
            color: lang === l ? '#fff' : 'var(--sand)',
            cursor: 'pointer', textTransform: 'uppercase',
            transition: 'background .15s, color .15s',
            fontFamily: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit', fontWeight: 'inherit',
          }}>{l}</button>
      ))}
    </div>
  )
}

function ThemeToggle({ theme, onChange }: { theme: string; onChange: (t: string) => void }) {
  return (
    <button onClick={() => onChange(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
      style={{
        width: 34, height: 34, borderRadius: 9999,
        background: 'transparent', border: '1px solid var(--border)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: 'var(--sand)', transition: 'border-color .15s, color .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(182,141,64,.4)'; e.currentTarget.style.color = 'var(--candle)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--sand)' }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
        {theme === 'dark' ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  )
}

interface NavProps {
  theme: string
  scrolled: boolean
  onThemeChange: (t: string) => void
  onCTA: () => void
}

export function Nav({ theme, scrolled, onThemeChange, onCTA }: NavProps) {
  const { t, lang, setLang } = useT()
  const { isMobile } = useBreakpoint()
  const [hover, setHover] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const links = [
    { label: t.nav.product, href: '#product' },
    { label: t.nav.how,     href: '#how-it-works' },
    { label: t.nav.pricing, href: '#pricing' },
    { label: t.nav.faq,     href: '#faq' },
  ]

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        padding: scrolled ? '10px 0' : '18px 0',
        background: scrolled
          ? (theme === 'light' ? 'rgba(252,249,244,0.85)' : 'rgba(14,14,13,0.75)')
          : 'transparent',
        backdropFilter: scrolled ? 'blur(18px) saturate(140%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(18px) saturate(140%)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        transition: 'padding .25s ease, background .25s ease, border-color .25s ease',
      }}>
        <div style={{
          maxWidth: 1240, margin: '0 auto', padding: isMobile ? '0 20px' : '0 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <LumenWordmark size={18} />

          {isMobile ? (
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Toggle menu"
              style={{
                width: 36, height: 36, borderRadius: 9999,
                background: 'transparent', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--sand)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                {menuOpen ? 'close' : 'menu'}
              </span>
            </button>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {links.map((l, i) => (
                  <a key={i} href={l.href}
                    onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                    style={{
                      padding: '8px 14px', fontFamily: 'var(--font-ibm)', fontSize: 13,
                      color: hover === i ? 'var(--candle)' : 'var(--sand)',
                      textDecoration: 'none', fontWeight: 400, transition: 'color .15s',
                    }}>{l.label}</a>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <LangToggle lang={lang} onChange={setLang} />
                <ThemeToggle theme={theme} onChange={onThemeChange} />
                <a href="/login" style={{
                  fontFamily: 'var(--font-ibm)', fontSize: 13, color: 'var(--sand)',
                  textDecoration: 'none', padding: '8px 14px',
                }}>{t.nav.signIn}</a>
                <Button variant="primary" size="md" onClick={onCTA}>{t.nav.cta}</Button>
              </div>
            </>
          )}
        </div>
      </nav>

      {/* Mobile menu drawer */}
      {isMobile && menuOpen && (
        <div style={{
          position: 'fixed', top: scrolled ? 54 : 70, left: 0, right: 0, zIndex: 49,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          padding: '16px 20px 24px',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {links.map((l, i) => (
            <a key={i} href={l.href} onClick={closeMenu}
              style={{
                padding: '14px 4px',
                fontFamily: 'var(--font-ibm)', fontSize: 15,
                color: 'var(--parchment)', textDecoration: 'none', fontWeight: 400,
                borderBottom: '1px solid var(--border)',
              }}>{l.label}</a>
          ))}
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <LangToggle lang={lang} onChange={setLang} />
              <ThemeToggle theme={theme} onChange={onThemeChange} />
              <a href="/login" onClick={closeMenu} style={{
                fontFamily: 'var(--font-ibm)', fontSize: 13, color: 'var(--sand)',
                textDecoration: 'none', marginLeft: 4,
              }}>{t.nav.signIn}</a>
            </div>
            <Button variant="primary" size="lg" icon="arrow_forward" onClick={() => { closeMenu(); onCTA() }}>
              {t.nav.cta}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
