'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import type { BrandBrainForm } from '@/types'
import { useLanguage } from '@/lib/i18n/context'

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', symbol: '◎' },
  { id: 'facebook',  label: 'Facebook',  symbol: '◈' },
  { id: 'tiktok',    label: 'TikTok',    symbol: '◉' },
]

const FREQUENCIES = ['Daily', '5x/week', '3x/week', '2x/week', '1x/week']

interface Props {
  data: BrandBrainForm
  onChange: (f: Partial<BrandBrainForm>) => void
  onSubmit: () => void
  onBack: () => void
  loading: boolean
}

export function Step5Settings({ data, onChange, onSubmit, onBack, loading }: Props) {
  const { t } = useLanguage()
  const [errors, setErrors] = useState<Record<string, string>>({})

  function togglePlatform(id: string) {
    const curr = data.platforms
    if (curr.includes(id)) onChange({ platforms: curr.filter(p => p !== id) })
    else onChange({ platforms: [...curr, id] })
  }

  function handleSubmit() {
    const e: Record<string, string> = {}
    if (data.platforms.length === 0) e.platforms = t('onboarding.platformsError')
    if (!data.posting_frequency)     e.posting_frequency = t('common.required')
    setErrors(e)
    if (Object.keys(e).length === 0) onSubmit()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <label style={{ display: 'block', fontFamily: 'var(--font-ibm)', fontSize: 13, color: 'rgba(196,185,154,0.5)', fontWeight: 300, marginBottom: 12 }}>
          {t('onboarding.platforms')}
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              onClick={() => togglePlatform(p.id)}
              className={`ob-platform${data.platforms.includes(p.id) ? ' ob-platform-on' : ''}`}
            >
              <div style={{ fontSize: 20, marginBottom: 6, fontFamily: 'monospace' }}>{p.symbol}</div>
              <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{p.label}</div>
            </button>
          ))}
        </div>
        {errors.platforms && <p style={{ fontSize: 11, color: 'var(--error)', marginTop: 8, fontFamily: 'var(--font-ibm)' }}>{errors.platforms}</p>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontFamily: 'var(--font-ibm)', fontSize: 13, color: 'rgba(196,185,154,0.5)', fontWeight: 300 }}>
          {t('onboarding.postingFrequency')}
        </label>
        <select
          value={data.posting_frequency}
          onChange={e => { onChange({ posting_frequency: e.target.value }); setErrors(p => ({ ...p, posting_frequency: '' })) }}
          style={{ width: '100%', fontFamily: 'var(--font-ibm)', fontSize: 14, color: '#F6F2EA', cursor: 'pointer' }}
        >
          {FREQUENCIES.map(f => <option key={f} value={f} style={{ background: '#111009' }}>{f}</option>)}
        </select>
        {errors.posting_frequency && <p style={{ fontSize: 11, color: 'var(--error)', fontFamily: 'var(--font-ibm)' }}>{errors.posting_frequency}</p>}
      </div>

      <Input label={t('onboarding.postingTime')}
        placeholder={t('onboarding.postingTimePlaceholder')}
        value={data.posting_time}
        onChange={e => onChange({ posting_time: e.target.value })} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
        <button className="ob-btn-ghost" onClick={onBack}>{t('common.back')}</button>
        <button className="ob-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? t('onboarding.settingUp') : t('onboarding.completeSetup')}
        </button>
      </div>
    </div>
  )
}
