'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import type { BrandBrainForm } from '@/types'
import { useLanguage } from '@/lib/i18n/context'
import { LANGUAGES, type LangCode } from '@/lib/i18n/translations'

interface Props {
  data: BrandBrainForm
  onChange: (f: Partial<BrandBrainForm>) => void
  onNext: () => void
  loading?: boolean
}

export function Step1Basics({ data, onChange, onNext, loading }: Props) {
  const { t, setLanguage } = useLanguage()
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleNext() {
    const e: Record<string, string> = {}
    if (!data.brand_name.trim()) e.brand_name = t('common.required')
    if (!data.industry.trim())   e.industry   = t('common.required')
    if (!data.location.trim())   e.location   = t('common.required')
    setErrors(e)
    if (Object.keys(e).length === 0) onNext()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <Input label={t('onboarding.brandName')} placeholder={t('onboarding.brandNamePlaceholder')}
        value={data.brand_name}
        onChange={e => { onChange({ brand_name: e.target.value }); setErrors(p => ({ ...p, brand_name: '' })) }}
        error={errors.brand_name} />

      <Input label={t('onboarding.website')} type="url" placeholder={t('onboarding.websitePlaceholder')}
        value={data.website_url}
        onChange={e => onChange({ website_url: e.target.value })} />

      <Input label={t('onboarding.industry')} placeholder={t('onboarding.industryPlaceholder')}
        value={data.industry}
        onChange={e => { onChange({ industry: e.target.value }); setErrors(p => ({ ...p, industry: '' })) }}
        error={errors.industry} />

      <Input label={t('onboarding.location')} placeholder={t('onboarding.locationPlaceholder')}
        value={data.location}
        onChange={e => { onChange({ location: e.target.value }); setErrors(p => ({ ...p, location: '' })) }}
        error={errors.location} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontFamily: 'var(--font-ibm)', fontSize: 13, color: 'rgba(196,185,154,0.5)', fontWeight: 300 }}>{t('onboarding.language')}</label>
        <select
          value={data.language}
          onChange={e => {
            const val = e.target.value as LangCode
            onChange({ language: val })
            setLanguage(val)
          }}
          style={{ width: '100%', fontFamily: 'var(--font-ibm)', fontSize: 14, color: '#F6F2EA', cursor: 'pointer' }}
        >
          {LANGUAGES.map(l => <option key={l.value} value={l.value} style={{ background: '#111009' }}>{l.label}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
        <button className="ob-btn" onClick={handleNext} disabled={loading}>
          {loading ? t('onboarding.analysing') : t('common.continue')}
        </button>
      </div>
    </div>
  )
}
