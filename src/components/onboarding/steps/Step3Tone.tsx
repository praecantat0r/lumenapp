'use client'
import { useState } from 'react'
import { Textarea } from '@/components/ui/Input'
import type { BrandBrainForm } from '@/types'
import { useLanguage } from '@/lib/i18n/context'

const TONE_KEYS = ['Professional','Friendly','Inspiring','Authoritative','Playful',
                   'Luxurious','Minimal','Bold','Warm','Humorous','Informative','Passionate'] as const

interface Props {
  data: BrandBrainForm
  onChange: (f: Partial<BrandBrainForm>) => void
  onNext: () => void
  onBack: () => void
}

export function Step3Tone({ data, onChange, onNext, onBack }: Props) {
  const { t } = useLanguage()
  const [errors, setErrors] = useState<Record<string, string>>({})

  function toggleTone(key: string) {
    const curr = data.tone_keywords
    if (curr.includes(key)) onChange({ tone_keywords: curr.filter(k => k !== key) })
    else if (curr.length < 3) onChange({ tone_keywords: [...curr, key] })
  }

  function handleNext() {
    const e: Record<string, string> = {}
    if (data.tone_keywords.length === 0) e.tone_keywords   = t('onboarding.toneError')
    if (!data.tone_description.trim())   e.tone_description = t('common.required')
    if (!data.target_audience.trim())    e.target_audience  = t('common.required')
    if (!data.audience_problem.trim())   e.audience_problem = t('common.required')
    setErrors(e)
    if (Object.keys(e).length === 0) onNext()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <label style={{ display: 'block', fontFamily: 'var(--font-ibm)', fontSize: 13, color: 'rgba(196,185,154,0.5)', fontWeight: 300, marginBottom: 12 }}>
          {t('onboarding.toneSelect')}
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {TONE_KEYS.map(key => (
            <button
              key={key}
              onClick={() => toggleTone(key)}
              className={`ob-chip${data.tone_keywords.includes(key) ? ' ob-chip-on' : ''}`}
            >
              {t(`onboarding.tone.${key}`)}
            </button>
          ))}
        </div>
        {errors.tone_keywords && <p style={{ fontSize: 11, color: 'var(--error)', marginTop: 8, fontFamily: 'var(--font-ibm)' }}>{errors.tone_keywords}</p>}
      </div>

      <Textarea label={t('onboarding.toneVoice')} rows={3}
        placeholder={t('onboarding.toneVoicePlaceholder')}
        value={data.tone_description}
        onChange={e => { onChange({ tone_description: e.target.value }); setErrors(p => ({ ...p, tone_description: '' })) }}
        error={errors.tone_description} />

      <Textarea label={t('onboarding.targetAudience')} rows={2}
        placeholder={t('onboarding.targetAudiencePlaceholder')}
        value={data.target_audience}
        onChange={e => { onChange({ target_audience: e.target.value }); setErrors(p => ({ ...p, target_audience: '' })) }}
        error={errors.target_audience} />

      <Textarea label={t('onboarding.audienceProblem')} rows={2}
        placeholder={t('onboarding.audienceProblemPlaceholder')}
        value={data.audience_problem}
        onChange={e => { onChange({ audience_problem: e.target.value }); setErrors(p => ({ ...p, audience_problem: '' })) }}
        error={errors.audience_problem} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
        <button className="ob-btn-ghost" onClick={onBack}>{t('common.back')}</button>
        <button className="ob-btn" onClick={handleNext}>{t('common.continue')}</button>
      </div>
    </div>
  )
}
