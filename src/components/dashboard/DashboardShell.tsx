'use client'
import { useState } from 'react'
import { Sidebar } from './Sidebar'

interface Props {
  children: React.ReactNode
  userEmail: string
  userName: string
  brandName: string
  plan: string
  pendingCount: number
  instagramConnected: boolean
  initialCollapsed: boolean
}

const EXPANDED  = 256
const COLLAPSED = 60

export function DashboardShell({ children, initialCollapsed, ...sidebarProps }: Props) {
  const [collapsed, setCollapsed]       = useState(initialCollapsed)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  function toggle() {
    const next = !collapsed
    setCollapsed(next)
    document.cookie = `sidebar-collapsed=${next};path=/;max-age=31536000`
  }

  return (
    <>
      <style>{`
        .ds-mobile-header { display: none; }
        .ds-spacer { display: block; }
        @media (max-width: 767px) {
          .ds-mobile-header {
            display: flex; align-items: center; justify-content: space-between;
            position: fixed; top: 0; left: 0; right: 0; height: 56px;
            background: var(--surface); border-bottom: 1px solid var(--border);
            padding: 0 16px; z-index: 201; gap: 12px;
          }
          .ds-spacer { display: none !important; }
          .ds-main { padding-top: 56px; }
          .ds-sidebar-outer {
            width: 280px !important;
            transform: translateX(-280px) !important;
            transition: transform 0.3s cubic-bezier(.4,0,.2,1) !important;
          }
          .ds-sidebar-outer.ds-open {
            transform: translateX(0) !important;
          }
        }
      `}</style>

      {/* ── Mobile top header ── */}
      <header className="ds-mobile-header">
        <button
          onClick={() => setMobileNavOpen(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sand)', display: 'flex', alignItems: 'center', padding: 4 }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <line x1="3" y1="6"  x2="19" y2="6"  stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <line x1="3" y1="11" x2="19" y2="11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <line x1="3" y1="16" x2="19" y2="16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
            <line x1="14" y1="8"  x2="14" y2="2"  stroke="#b68d40" strokeWidth="1.6" strokeLinecap="round"/>
            <line x1="14" y1="20" x2="14" y2="26" stroke="#b68d40" strokeWidth="1.6" strokeLinecap="round"/>
            <line x1="8"  y1="14" x2="2"  y2="14" stroke="#b68d40" strokeWidth="1.6" strokeLinecap="round"/>
            <line x1="20" y1="14" x2="26" y2="14" stroke="#b68d40" strokeWidth="1.6" strokeLinecap="round"/>
            <circle cx="14" cy="14" r="3.5" fill="#b68d40"/>
          </svg>
          <span style={{ fontFamily: 'var(--font-syne)', fontSize: 18, fontWeight: 700, color: 'var(--candle)', letterSpacing: '-0.03em' }}>
            Lumen
          </span>
        </div>

        {/* Placeholder right side — keeps logo visually centred */}
        <div style={{ width: 30 }} />
      </header>

      {/* ── Mobile backdrop ── */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 299,
            display: 'none', // overridden by media query below
          }}
          className="ds-backdrop"
        />
      )}
      <style>{`
        @media (max-width: 767px) {
          .ds-backdrop { display: block !important; }
        }
      `}</style>

      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

        {/* Spacer — matches sidebar width on desktop, hidden on mobile */}
        <div
          className="ds-spacer"
          style={{
            width: collapsed ? COLLAPSED : EXPANDED,
            flexShrink: 0,
            transition: 'width 0.35s cubic-bezier(.4,0,.2,1)',
          }}
        />

        {/* Sidebar — fixed, zero layout-reflow on desktop; overlay drawer on mobile */}
        <div
          className={`ds-sidebar-outer${mobileNavOpen ? ' ds-open' : ''}`}
          style={{
            position: 'fixed',
            top: 0, left: 0, bottom: 0,
            width: collapsed ? COLLAPSED : EXPANDED,
            transition: 'width 0.35s cubic-bezier(.4,0,.2,1)',
            zIndex: 300,
          }}
        >
          <Sidebar
            {...sidebarProps}
            collapsed={collapsed}
            onToggle={toggle}
            onMobileClose={() => setMobileNavOpen(false)}
          />
        </div>

        {/* Main content */}
        <main
          className="ds-main"
          style={{
            flex: 1,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            background: 'var(--carbon)',
          }}
        >
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {children}
          </div>
        </main>

      </div>
    </>
  )
}
