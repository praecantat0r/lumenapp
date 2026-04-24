'use client'
import { useState } from 'react'
import { Textarea, Input } from '@/components/ui/Input'
import type { BrandBrainForm } from '@/types'
import { useLanguage } from '@/lib/i18n/context'

interface Props {
  data: BrandBrainForm
  onChange: (f: Partial<BrandBrainForm>) => void
  onNext: () => void
  onBack: () => void
}

export function Step4Content({ data, onChange, onNext, onBack }: Props) {
  const { t } = useLanguage()
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleNext() {
    const e: Record<string, string> = {}
    if (!data.post_topics.trim()) e.post_topics = t('common.required')
    if (!data.post_avoid.trim()) e.post_avoid = t('common.required')
    setErrors(e)
    if (Object.keys(e).length === 0) onNext()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <Textarea label={t('onboarding.postTopics')} rows={4}
        placeholder={t('onboarding.postTopicsPlaceholder')}
        value={data.post_topics}
        onChange={e => { onChange({ post_topics: e.target.value }); setErrors(p => ({ ...p, post_topics: '' })) }}
        error={errors.post_topics} />

      <Textarea label={t('onboarding.postAvoid')} rows={3}
        placeholder={t('onboarding.postAvoidPlaceholder')}
        value={data.post_avoid}
        onChange={e => { onChange({ post_avoid: e.target.value }); setErrors(p => ({ ...p, post_avoid: '' })) }}
        error={errors.post_avoid} />

      <Input label={t('onboarding.contentRatio')}
        placeholder={t('onboarding.contentRatioPlaceholder')}
        value={data.content_ratio}
        onChange={e => onChange({ content_ratio: e.target.value })} />

      <Input label={t('onboarding.materialsLink')} type="url"
        placeholder={t('onboarding.materialsLinkPlaceholder')}
        value={data.materials_link}
        onChange={e => onChange({ materials_link: e.target.value })} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
        <button className="ob-btn-ghost" onClick={onBack}>{t('common.back')}</button>
        <button className="ob-btn" onClick={handleNext}>{t('common.continue')}</button>
      </div>
    </div>
  )
}
