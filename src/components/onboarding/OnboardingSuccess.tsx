'use client'
import { LumenMark } from '@/components/ui/LumenLogo'
import { useLanguage } from '@/lib/i18n/context'

export function OnboardingSuccess() {
  const { t } = useLanguage()

  return (
    <>
      <style>{`
        @keyframes successFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes successRing {
          0%   { transform: scale(0.85); opacity: 0; }
          60%  { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes successText {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sc-ring {
          width: 100px; height: 100px; border-radius: 50%;
          border: 1px solid rgba(212,168,75,0.25);
          display: flex; align-items: center; justify-content: center;
          animation: successRing 0.7s cubic-bezier(0.22,1,0.36,1) 0.2s both;
          position: relative;
        }
        .sc-ring::before {
          content: '';
          position: absolute; inset: -8px;
          border-radius: 50%;
          border: 1px solid rgba(212,168,75,0.1);
        }
        .sc-h1 { animation: successText 0.6s cubic-bezier(0.22,1,0.36,1) 0.55s both; }
        .sc-p  { animation: successText 0.6s cubic-bezier(0.22,1,0.36,1) 0.75s both; }
        .sc-sub{ animation: successText 0.6s cubic-bezier(0.22,1,0.36,1) 0.9s both; }
      `}</style>

      <div
        style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#111009',
          backgroundImage: 'radial-gradient(ellipse at 50% 42%, rgba(212,168,75,0.07) 0%, transparent 60%)',
          animation: 'successFade 0.5s ease both',
          textAlign: 'center', padding: '40px 24px',
          gap: 0,
        }}
      >
        <div className="sc-ring">
          <LumenMark size={44} />
        </div>

        <div style={{ marginTop: 36 }}>
          <h1 className="sc-h1" style={{
            fontFamily: 'var(--font-syne)', fontWeight: 700,
            fontSize: 'clamp(32px, 6vw, 52px)',
            color: '#F6F2EA', letterSpacing: '-0.03em',
            lineHeight: 1.05, marginBottom: 6,
          }}>
            {t('onboarding.successTitle')}
          </h1>
          <p className="sc-p" style={{
            fontFamily: 'var(--font-ibm)', fontStyle: 'italic',
            fontWeight: 300, fontSize: 22,
            color: '#D4A84B', marginBottom: 24,
          }}>
            {t('onboarding.successSubtitle')}
          </p>
          <p className="sc-sub" style={{
            fontFamily: 'var(--font-ibm)', fontWeight: 300,
            fontSize: 14, lineHeight: 1.75,
            color: 'rgba(196,185,154,0.5)',
            maxWidth: 340,
          }}>
            {t('onboarding.successBody')}
          </p>
        </div>

        <div className="sc-sub" style={{ marginTop: 40 }}>
          <p style={{ fontFamily: 'var(--font-ibm)', fontSize: 11, color: 'rgba(196,185,154,0.28)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {t('onboarding.successRedirect')}
          </p>
        </div>
      </div>
    </>
  )
}
