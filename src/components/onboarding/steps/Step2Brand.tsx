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

export function Step2Brand({ data, onChange, onNext, onBack }: Props) {
  const { t } = useLanguage()
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleNext() {
    const e: Record<string, string> = {}
    if (!data.brand_description.trim()) e.brand_description = t('common.required')
    if (!data.products.trim()) e.products = t('common.required')
    setErrors(e)
    if (Object.keys(e).length === 0) onNext()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <Textarea label={t('onboarding.brandDesc')} rows={4}
        placeholder={t('onboarding.brandDescPlaceholder')}
        value={data.brand_description}
        onChange={e => { onChange({ brand_description: e.target.value }); setErrors(p => ({ ...p, brand_description: '' })) }}
        error={errors.brand_description} />

      <Textarea label={t('onboarding.products')} rows={3}
        placeholder={t('onboarding.productsPlaceholder')}
        value={data.products}
        onChange={e => { onChange({ products: e.target.value }); setErrors(p => ({ ...p, products: '' })) }}
        error={errors.products} />

      <Input label={t('onboarding.slogans')}
        placeholder={t('onboarding.slogansPlaceholder')}
        value={data.slogans}
        onChange={e => onChange({ slogans: e.target.value })} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
        <button className="ob-btn-ghost" onClick={onBack}>{t('common.back')}</button>
        <button className="ob-btn" onClick={handleNext}>{t('common.continue')}</button>
      </div>
    </div>
  )
}
