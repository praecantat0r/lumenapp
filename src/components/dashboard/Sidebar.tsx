'use client'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/context'

interface Props {
  userEmail: string
  userName: string
  brandName: string
  plan: string
  pendingCount: number
  instagramConnected: boolean
  collapsed: boolean
  onToggle: () => void
  onMobileClose?: () => void
}

function getInitials(name: string, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

export function Sidebar({ userEmail, userName, brandName, plan, pendingCount, instagramConnected, collapsed, onToggle, onMobileClose }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const { t } = useLanguage()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = getInitials(userName, userEmail)
  const isActive = (href: string) => pathname === href || (href !== '/dashboard/overview' && pathname.startsWith(href))

  const navItems = [
    { href: '/dashboard/overview',           label: t('nav.overview'),          icon: 'dashboard' },
    { href: '/dashboard/posts',              label: t('nav.posts'),             icon: 'calendar_view_month', badge: pendingCount > 0 ? pendingCount : null },
    { href: '/dashboard/product-photos',     label: t('nav.productPhotos'),     icon: 'camera_enhance' },
    { href: '/dashboard/caption-generator',  label: t('nav.captionGenerator'),  icon: 'auto_awesome' },
    { href: '/dashboard/templates',          label: t('nav.templates'),         icon: 'grid_view' },
    { href: '/dashboard/statistics',         label: t('nav.analytics'),         icon: 'monitoring' },
    { href: '/dashboard/brand-brain',        label: t('nav.brandBrain'),        icon: 'psychology' },
  ]

  const bottomItems = [
    { href: '/api/instagram/auth',  label: t('nav.instagram'), icon: 'photo_camera' },
  ]

  return (
    <>
      <style>{`
        @keyframes sb-breathe { 0%,100%{opacity:1;}50%{opacity:.4;} }
        @keyframes sb-spin { from{transform:rotate(0deg);}to{transform:rotate(360deg);} }
        .sb-c1{animation:sb-breathe 3s ease-in-out infinite 0s}
        .sb-c2{animation:sb-breathe 3s ease-in-out infinite .4s}
        .sb-c3{animation:sb-breathe 3s ease-in-out infinite .8s}
        .sb-c4{animation:sb-breathe 3s ease-in-out infinite 1.2s}
        .sb-diag{transform-origin:14px 14px;animation:sb-spin 18s linear infinite}
        .sb2-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 16px; border-radius: 9999px; cursor: pointer;
          font-size: 14px; color: var(--sand); font-weight: 500;
          text-decoration: none; white-space: nowrap; overflow: hidden;
          transition: background 0.2s, color 0.2s;
          position: relative;
        }
        .sb2-item:hover { background: rgba(255,255,255,0.05); color: var(--parchment); }
        .sb2-item.active { background: rgba(182,141,64,0.12); color: var(--candle); font-weight: 600; }
        .sb2-icon { font-size: 20px; flex-shrink: 0; line-height: 1; }
        .sb2-label { transition: opacity 0.2s, max-width 0.35s cubic-bezier(.4,0,.2,1); overflow: hidden; white-space: nowrap; display: inline-block; }
        .sb2-toggle {
          position: absolute; right: -10px; top: 50%;
          transform: translateY(-50%);
          width: 20px; height: 32px; border-radius: 6px;
          background: var(--surface-2); border: 1px solid rgba(78,69,56,0.5);
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          color: var(--muted); transition: color 0.15s, background 0.15s;
          z-index: 30; padding: 0;
        }
        .sb2-toggle:hover { color: var(--candle); background: var(--surface-3); border-color: rgba(182,141,64,0.4); }
        @media (max-width: 767px) { .sb2-toggle { display: none !important; } }
        .sb2-new-post {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; padding: 12px 16px; border-radius: 9999px; border: none; cursor: pointer;
          background: var(--candle);
          color: #ffffff; font-weight: 700; font-size: 14px;
          font-family: var(--font-syne); transition: background 0.2s, transform 0.1s;
          white-space: nowrap; overflow: hidden; text-decoration: none;
        }
        .sb2-new-post:hover { background: var(--ember); }
        .sb2-new-post:active { transform: scale(0.97); }
      `}</style>

      <div style={{
        position: 'relative', flexShrink: 0,
        width: collapsed ? 60 : 256,
        minWidth: collapsed ? 60 : 256,
        height: '100%',
        transition: 'width 0.35s cubic-bezier(.4,0,.2,1), min-width 0.35s cubic-bezier(.4,0,.2,1)',
        willChange: 'width',
      }}>

        {/* Toggle button */}
        <button className="sb2-toggle" onClick={onToggle} title={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}>
          <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
            {collapsed
              ? <path d="M2 1L6 6L2 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              : <path d="M6 1L2 6L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            }
          </svg>
        </button>

        <aside style={{
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', width: '100%', height: '100%',
          padding: collapsed ? '28px 8px' : '28px 20px',
          transition: 'padding 0.35s cubic-bezier(.4,0,.2,1)',
        }}>

          {/* Logo */}
          <div style={{
            display: 'flex', alignItems: 'center',
            gap: collapsed ? 0 : 10,
            marginBottom: 36,
            paddingLeft: collapsed ? 0 : 4,
            justifyContent: collapsed ? 'center' : 'flex-start',
            overflow: 'hidden',
            width: '100%',
          }}>
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0 }}>
              <line className="sb-c1" x1="14" y1="8"  x2="14" y2="2"  stroke="#b68d40" strokeWidth="1.6" strokeLinecap="round"/>
              <line className="sb-c2" x1="14" y1="20" x2="14" y2="26" stroke="#b68d40" strokeWidth="1.6" strokeLinecap="round"/>
              <line className="sb-c3" x1="8"  y1="14" x2="2"  y2="14" stroke="#b68d40" strokeWidth="1.6" strokeLinecap="round"/>
              <line className="sb-c4" x1="20" y1="14" x2="26" y2="14" stroke="#b68d40" strokeWidth="1.6" strokeLinecap="round"/>
              <g className="sb-diag">
                <line x1="10.1" y1="10.1" x2="5"  y2="5"  stroke="#b68d40" strokeWidth="1" strokeLinecap="round" opacity=".5"/>
                <line x1="17.9" y1="17.9" x2="23" y2="23" stroke="#b68d40" strokeWidth="1" strokeLinecap="round" opacity=".5"/>
                <line x1="17.9" y1="10.1" x2="23" y2="5"  stroke="#b68d40" strokeWidth="1" strokeLinecap="round" opacity=".5"/>
                <line x1="10.1" y1="17.9" x2="5"  y2="23" stroke="#b68d40" strokeWidth="1" strokeLinecap="round" opacity=".5"/>
              </g>
              <circle cx="14" cy="14" r="3.5" fill="#b68d40"/>
            </svg>
            <div style={{
              opacity: collapsed ? 0 : 1,
              maxWidth: collapsed ? 0 : 180,
              overflow: 'hidden',
              transition: 'opacity 0.2s, max-width 0.35s cubic-bezier(.4,0,.2,1)',
            }}>
              <div style={{ fontFamily: 'var(--font-syne)', fontSize: 22, fontWeight: 700, color: 'var(--candle)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                Lumen
              </div>
              <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 3, fontWeight: 500 }}>
                {t('nav.tagline')}
              </div>
            </div>
          </div>

          {/* Main Nav */}
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', overflowX: 'hidden' }}>
            {navItems.map(item => {
              const active = isActive(item.href)
              if (collapsed) return (
                <a key={item.href} href={item.href} title={item.label} onClick={onMobileClose} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: 44, borderRadius: 10, textDecoration: 'none', cursor: 'pointer',
                  color: active ? 'var(--candle)' : 'var(--sand)',
                  background: active ? 'rgba(182,141,64,0.12)' : 'transparent',
                  transition: 'background 0.2s, color 0.2s', flexShrink: 0,
                }}>
                  <span className="material-symbols-outlined" style={{
                    fontSize: 20, lineHeight: 1, display: 'block',
                    fontVariationSettings: active ? "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                  }}>{item.icon}</span>
                </a>
              )
              return (
                <a key={item.href} href={item.href} onClick={onMobileClose} className={`sb2-item${active ? ' active' : ''}`}>
                  <span className="sb2-icon material-symbols-outlined" style={{
                    fontVariationSettings: active ? "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                  }}>{item.icon}</span>
                  <span className="sb2-label">{item.label}</span>
                  {item.badge && (
                    <span style={{ marginLeft: 'auto', background: 'rgba(182,141,64,0.15)', color: 'var(--candle)', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>
                      {item.badge}
                    </span>
                  )}
                </a>
              )
            })}

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(78,69,56,0.25)', margin: '10px 4px' }} />

            {bottomItems.map(item => {
              const active = isActive(item.href)
              if (collapsed) return (
                <a key={item.href} href={item.href} title={item.label} onClick={onMobileClose} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: 40, borderRadius: 10, textDecoration: 'none', cursor: 'pointer',
                  color: active ? 'var(--candle)' : 'var(--sand)',
                  background: active ? 'rgba(182,141,64,0.12)' : 'transparent',
                  transition: 'background 0.2s, color 0.2s', flexShrink: 0,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, lineHeight: 1, display: 'block' }}>{item.icon}</span>
                </a>
              )
              return (
                <a key={item.href} href={item.href} onClick={onMobileClose} className={`sb2-item${active ? ' active' : ''}`} style={{ fontSize: 13 }}>
                  <span className="sb2-icon material-symbols-outlined" style={{ fontSize: 18 }}>{item.icon}</span>
                  <span className="sb2-label">{item.label}</span>
                  {item.href === '/api/instagram/auth' && (
                    <span style={{ marginLeft: 'auto', fontSize: 9, padding: '2px 7px', borderRadius: 20, flexShrink: 0, ...(instagramConnected ? { background: 'rgba(110,191,139,0.12)', color: '#6EBF8B' } : { background: 'rgba(201,194,181,0.08)', color: 'var(--muted)' }) }}>
                      {instagramConnected ? t('nav.igLive') : t('nav.igConnect')}
                    </span>
                  )}
                </a>
              )
            })}
          </nav>

          {/* User section */}
          {!collapsed && (
            <div style={{ paddingTop: 20, borderTop: '1px solid rgba(78,69,56,0.2)', display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
              <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--parchment)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userName || userEmail.split('@')[0]}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'capitalize' }}>
                  {plan} {t('nav.plan')}
                </div>
              </div>
              <button
                onClick={signOut}
                title={t('nav.signOut')}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: 4, borderRadius: 6, flexShrink: 0, transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--parchment)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  <line x1="10" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  <polyline points="12.5,5.5 15,8 12.5,10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </button>
            </div>
          )}
        </aside>
      </div>
    </>
  )
}
