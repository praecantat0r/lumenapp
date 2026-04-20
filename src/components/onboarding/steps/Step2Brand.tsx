'use client'
import { useState } from 'react'
import { Textarea, Input } from '@/components/ui/Input'
import type { BrandBrainForm } from '@/types'

interface Props {
  data: BrandBrainForm
  onChange: (f: Partial<BrandBrainForm>) => void
  onNext: () => void
  onBack: () => void
}

export function Step2Brand({ data, onChange, onNext, onBack }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleNext() {
    const e: Record<string, string> = {}
    if (!data.brand_description.trim()) e.brand_description = 'Required'
    if (!data.products.trim()) e.products = 'Required'
    setErrors(e)
    if (Object.keys(e).length === 0) onNext()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <Textarea label="Brand description *" rows={4}
        placeholder="Describe your brand in your own words — what you do, what you stand for, what makes you different"
        value={data.brand_description}
        onChange={e => { onChange({ brand_description: e.target.value }); setErrors(p => ({ ...p, brand_description: '' })) }}
        error={errors.brand_description} />

      <Textarea label="Products & services *" rows={3}
        placeholder="List your main products or services"
        value={data.products}
        onChange={e => { onChange({ products: e.target.value }); setErrors(p => ({ ...p, products: '' })) }}
        error={errors.products} />

      <Input label="Slogans & key phrases (optional)"
        placeholder="e.g. Just Do It, Think Different"
        value={data.slogans}
        onChange={e => onChange({ slogans: e.target.value })} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
        <button className="ob-btn-ghost" onClick={onBack}>← Back</button>
        <button className="ob-btn" onClick={handleNext}>Continue →</button>
      </div>
    </div>
  )
}
