'use client'
import { useLanguage } from '@/lib/i18n/context'

interface Props {
  hasInstagram: boolean
  onComplete: () => void
}

export function Step6Instagram({ hasInstagram, onComplete }: Props) {
  const { t } = useLanguage()

  function connectInstagram() {
    window.location.href = '/api/instagram/auth?from=onboarding'
  }

  if (!hasInstagram) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <p style={{ fontFamily: 'var(--font-ibm)', fontWeight: 300, fontSize: 14, lineHeight: 1.75, color: 'rgba(196,185,154,0.5)' }}>
          {t('onboarding.igNotSelected')}
        </p>
        <button className="ob-btn" onClick={onComplete}>{t('common.goToDashboard')}</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 64, height: 64, borderRadius: '50%',
        border: '1px solid rgba(212,168,75,0.2)',
        background: 'rgba(212,168,75,0.05)',
      }}>
        <span style={{ fontSize: 26, fontFamily: 'monospace' }}>◎</span>
      </div>

      <div>
        <p style={{ fontFamily: 'var(--font-ibm)', fontWeight: 300, fontSize: 14, lineHeight: 1.75, color: 'rgba(196,185,154,0.55)', marginBottom: 8 }}>
          {t('onboarding.igConnect')}
        </p>
        <p style={{ fontFamily: 'var(--font-ibm)', fontWeight: 300, fontSize: 12, lineHeight: 1.65, color: 'rgba(196,185,154,0.3)' }}>
          {t('onboarding.igRequires')}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button className="ob-btn" onClick={connectInstagram} style={{ width: '100%', textAlign: 'center' }}>
          {t('onboarding.igConnectBtn')}
        </button>
        <button className="ob-btn-ghost" onClick={onComplete} style={{ textAlign: 'center' }}>
          {t('onboarding.igSkip')}
        </button>
      </div>
    </div>
  )
}
