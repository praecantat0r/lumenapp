import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Lumen',
  description: 'How Lumen collects, uses, and protects your data.',
}

const sections = [
  {
    number: '01',
    title: 'Information We Collect',
    body: [
      'When you connect your Instagram account, we collect your Instagram username and a long-lived access token issued by Meta. This token allows Lumen to publish content on your behalf.',
      'We also store the brand settings you provide during onboarding — including your brand name, industry, tone of voice, target audience, and any uploaded brand assets such as logos and photos.',
      'Your email address is collected at account registration and used solely for authentication and service communications.',
    ],
  },
  {
    number: '02',
    title: 'How We Use Your Data',
    body: [
      'Your Instagram access token is used exclusively to create and publish posts to your Instagram account through the Meta Graph API. We do not read your direct messages, follower list, or any other account data beyond what is necessary to publish content.',
      'Your brand settings are passed to AI models (OpenAI, Anthropic, Google Gemini) solely to generate captions, image prompts, and visual content tailored to your brand. We do not use your data to train third-party models.',
      'Aggregated, anonymised usage data may be used to improve Lumen\'s generation quality and reliability.',
    ],
  },
  {
    number: '03',
    title: 'Data Storage',
    body: [
      'All user data is stored in a PostgreSQL database hosted by Supabase. Media assets and generated images are stored in Supabase Storage.',
      'Data is encrypted at rest and in transit. Access is governed by Row-Level Security policies — no user can access another user\'s data.',
      'Our Supabase project is hosted in the EU (West Europe region). If you are located outside the EU, your data may be transferred internationally when processed by third-party AI services.',
    ],
  },
  {
    number: '04',
    title: 'Third-Party Services',
    body: [
      'Lumen integrates with the following third-party services to deliver its core functionality:',
    ],
    list: [
      'Meta / Instagram Graph API — for OAuth authentication and post publishing',
      'Anthropic — for generating image prompts and template text',
      'Google Gemini — for AI image generation',
      'Supabase — for database, authentication, and file storage',
      'Vercel — for application hosting and serverless execution',
    ],
  },
  {
    number: '05',
    title: 'Data Retention',
    body: [
      'Your data is retained for as long as your account is active. Generated posts and brand assets are stored indefinitely to power your content history and generation improvements.',
      'Upon account deletion, all personally identifiable data — including your access token, brand settings, and generated posts — is permanently deleted within 30 days.',
      'You may request deletion of your Instagram access token at any time without deleting your account. This will disconnect Instagram publishing until you reconnect.',
    ],
  },
  {
    number: '06',
    title: 'Your Rights',
    body: [
      'You have the right to access, correct, or delete any personal data we hold about you. You may also request a copy of your data in a portable format.',
      'To exercise any of these rights, email us at teodorvelicky@gmail.com. We will respond within 30 days.',
      'You can revoke Lumen\'s access to your Instagram account at any time through Meta\'s app permission settings at facebook.com/settings/connected-apps.',
    ],
  },
  {
    number: '07',
    title: 'Contact',
    body: [
      'If you have any questions or concerns about this Privacy Policy or how your data is handled, please contact us at:',
    ],
    contact: 'lumenhq.contact@gmail.com',
  },
]

export default function PrivacyPage() {
  return (
    <div style={{ background: 'var(--carbon)', minHeight: '100vh', color: 'var(--parchment)' }}>

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid var(--border)',
        background: 'rgba(17,16,9,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '0 32px',
        height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <a href="/landing" style={{
          fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 17,
          color: 'var(--candle)', textDecoration: 'none', letterSpacing: '0.06em',
        }}>LUMEN</a>
        <a href="/landing" style={{
          fontFamily: 'var(--font-ibm)', fontSize: 13, color: 'var(--sand)',
          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
          transition: 'color .15s',
        }}
          onMouseEnter={undefined}
        >
          <span style={{ fontSize: 16, verticalAlign: 'middle' }}>←</span>
          Back to home
        </a>
      </nav>

      {/* Hero */}
      <header style={{
        maxWidth: 760, margin: '0 auto',
        padding: '80px 32px 56px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '5px 12px', borderRadius: 9999,
          background: 'rgba(212,168,75,0.08)', border: '1px solid rgba(212,168,75,0.2)',
          fontFamily: 'var(--font-ibm)', fontSize: 11, color: 'var(--candle)',
          letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500,
          marginBottom: 24,
        }}>Legal</div>

        <h1 style={{
          margin: '0 0 16px',
          fontFamily: 'var(--font-syne)', fontWeight: 700,
          fontSize: 'clamp(36px, 6vw, 56px)',
          lineHeight: 1.05, letterSpacing: '-0.03em',
          color: 'var(--parchment)',
        }}>Privacy Policy</h1>

        <p style={{
          margin: 0, fontFamily: 'var(--font-ibm)', fontWeight: 300,
          fontSize: 15, color: 'var(--sand)', lineHeight: 1.6,
        }}>
          Last updated: <span style={{ color: 'var(--parchment)' }}>April 20, 2026</span>
        </p>

        <p style={{
          margin: '20px 0 0', fontFamily: 'var(--font-ibm)', fontWeight: 300,
          fontSize: 15, color: 'var(--sand)', lineHeight: 1.7, maxWidth: 600,
        }}>
          Lumen is committed to protecting your privacy. This policy explains what data we collect,
          why we collect it, and how we handle it.
        </p>
      </header>

      {/* Sections */}
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '0 32px 80px' }}>
        {sections.map((section, i) => (
          <section key={i} style={{
            padding: '48px 0',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
              <span style={{
                fontFamily: 'var(--font-syne)', fontWeight: 700,
                fontSize: 12, color: 'var(--candle)', opacity: 0.6,
                letterSpacing: '0.1em', marginTop: 6, flexShrink: 0,
                minWidth: 28,
              }}>{section.number}</span>

              <div style={{ flex: 1 }}>
                <h2 style={{
                  margin: '0 0 20px',
                  fontFamily: 'var(--font-syne)', fontWeight: 700,
                  fontSize: 22, letterSpacing: '-0.02em',
                  color: 'var(--parchment)',
                }}>{section.title}</h2>

                {section.body.map((para, j) => (
                  <p key={j} style={{
                    margin: j < section.body.length - 1 ? '0 0 14px' : 0,
                    fontFamily: 'var(--font-ibm)', fontWeight: 300,
                    fontSize: 15, lineHeight: 1.75, color: 'var(--sand)',
                  }}>{para}</p>
                ))}

                {section.list && (
                  <ul style={{ margin: '16px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {section.list.map((item, j) => (
                      <li key={j} style={{
                        display: 'flex', gap: 12, alignItems: 'flex-start',
                        fontFamily: 'var(--font-ibm)', fontWeight: 300,
                        fontSize: 15, color: 'var(--sand)', lineHeight: 1.6,
                      }}>
                        <span style={{
                          width: 4, height: 4, borderRadius: '50%',
                          background: 'var(--candle)', marginTop: 9, flexShrink: 0,
                        }}/>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

                {section.contact && (
                  <a href={`mailto:${section.contact}`} style={{
                    display: 'inline-block', marginTop: 16,
                    fontFamily: 'var(--font-ibm)', fontWeight: 400,
                    fontSize: 15, color: 'var(--candle)', textDecoration: 'none',
                    borderBottom: '1px solid rgba(212,168,75,0.3)',
                    paddingBottom: 2,
                  }}>{section.contact}</a>
                )}
              </div>
            </div>
          </section>
        ))}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '28px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
        maxWidth: 760, margin: '0 auto',
      }}>
        <span style={{ fontFamily: 'var(--font-ibm)', fontSize: 12, color: 'var(--sand)', fontWeight: 300 }}>
          © 2026 Lumen. All rights reserved.
        </span>
        <a href="/landing" style={{
          fontFamily: 'var(--font-ibm)', fontSize: 12, color: 'var(--sand)',
          textDecoration: 'none', fontWeight: 300,
        }}>← Back to home</a>
      </footer>

    </div>
  )
}
