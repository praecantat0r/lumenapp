import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — Lumen',
  description: 'Terms and conditions for using the Lumen platform.',
}

const sections = [
  {
    number: '01',
    title: 'Acceptance of Terms',
    body: [
      'By creating an account or using Lumen, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.',
      'We may update these terms from time to time. Continued use of Lumen after changes are posted constitutes acceptance of the revised terms.',
    ],
  },
  {
    number: '02',
    title: 'Description of Service',
    body: [
      'Lumen is an AI-powered brand publishing platform that generates and publishes content to your Instagram account on your behalf. The service includes brand configuration, AI content generation (captions, images), post scheduling, and analytics.',
      'Lumen is provided as a Software-as-a-Service (SaaS) and requires a valid subscription to access core features.',
    ],
  },
  {
    number: '03',
    title: 'Account Responsibilities',
    body: [
      'You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.',
      'You must provide accurate information during registration and keep your account details up to date.',
      'You agree not to share your account with others or use the service in any way that violates applicable laws or these terms.',
    ],
  },
  {
    number: '04',
    title: 'Instagram & Meta Platform',
    body: [
      'By connecting your Instagram account, you authorise Lumen to publish content, access insights, and manage your connected account through the Meta Graph API.',
      'Your use of Instagram through Lumen is also subject to Meta\'s Terms of Service and Community Standards. Lumen is not responsible for actions taken by Meta regarding your account.',
      'You can revoke Lumen\'s access to your Instagram account at any time through Meta\'s connected apps settings.',
    ],
  },
  {
    number: '05',
    title: 'Content & Intellectual Property',
    body: [
      'You retain ownership of all brand assets, logos, and photos you upload to Lumen. By uploading them, you grant Lumen a limited licence to use them solely to generate and publish content on your behalf.',
      'AI-generated content (captions, images, copy) produced by Lumen using your brand settings is provided to you for your use. You are solely responsible for reviewing and approving content before it is published.',
      'Lumen retains all rights to its platform, software, design, and proprietary systems.',
    ],
  },
  {
    number: '06',
    title: 'Prohibited Uses',
    body: [
      'You agree not to use Lumen to generate or publish content that is unlawful, hateful, deceptive, or violates any third-party rights.',
      'You may not attempt to reverse-engineer, scrape, or exploit the Lumen platform or its APIs beyond normal authorised use.',
      'Abuse of the platform — including generating spam, operating multiple accounts to circumvent limits, or attempting to bypass rate limits — may result in account suspension.',
    ],
  },
  {
    number: '07',
    title: 'Subscription & Billing',
    body: [
      'Access to Lumen requires a paid subscription. Subscription fees are billed in advance and are non-refundable except as required by applicable law.',
      'You may cancel your subscription at any time. Cancellation takes effect at the end of your current billing period.',
      'We reserve the right to change pricing with at least 30 days\' written notice to existing subscribers.',
    ],
  },
  {
    number: '08',
    title: 'Disclaimer of Warranties',
    body: [
      'Lumen is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that the service will be uninterrupted, error-free, or that AI-generated content will meet your expectations.',
      'AI-generated content may occasionally contain inaccuracies. You are solely responsible for reviewing all content before it is published to your audience.',
    ],
  },
  {
    number: '09',
    title: 'Limitation of Liability',
    body: [
      'To the maximum extent permitted by law, Lumen and its operators shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.',
      'Our total liability to you for any claim shall not exceed the amount you paid to us in the 12 months preceding the claim.',
    ],
  },
  {
    number: '10',
    title: 'Termination',
    body: [
      'We may suspend or terminate your account if you breach these terms, engage in prohibited conduct, or for any other reason with reasonable notice.',
      'Upon termination, your access to the service will cease. Data deletion follows the schedule described in our Privacy Policy.',
    ],
  },
  {
    number: '11',
    title: 'Contact',
    body: [
      'For any questions about these Terms of Service, please contact us at:',
    ],
    contact: 'lumenhq.contact@gmail.com',
  },
]

export default function TermsPage() {
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
        }}>
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
        }}>Terms of Service</h1>

        <p style={{
          margin: 0, fontFamily: 'var(--font-ibm)', fontWeight: 300,
          fontSize: 15, color: 'var(--sand)', lineHeight: 1.6,
        }}>
          Last updated: <span style={{ color: 'var(--parchment)' }}>April 21, 2026</span>
        </p>

        <p style={{
          margin: '20px 0 0', fontFamily: 'var(--font-ibm)', fontWeight: 300,
          fontSize: 15, color: 'var(--sand)', lineHeight: 1.7, maxWidth: 600,
        }}>
          These Terms of Service govern your access to and use of the Lumen platform.
          Please read them carefully before using the service.
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
