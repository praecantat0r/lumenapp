import type { Metadata } from 'next'
import { Syne, IBM_Plex_Sans } from 'next/font/google'

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--syne-font',
})

const ibmPlex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--ibm-plex-font',
})

export const metadata: Metadata = {
  title: 'Lumen — Instagram, on autopilot.',
  description: 'Define your brand once. Lumen generates, designs, and publishes on-brand Instagram posts every day — so you can get back to running the business.',
  openGraph: {
    title: 'Lumen — Instagram, on autopilot.',
    description: 'AI-generated posts designed and published automatically. Your brand, always on.',
    siteName: 'Lumen',
  },
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${syne.variable} ${ibmPlex.variable}`}
      style={{
        '--font-syne': 'var(--syne-font)',
        '--font-ibm': 'var(--ibm-plex-font)',
      } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
