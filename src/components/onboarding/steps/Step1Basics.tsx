'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import type { BrandBrainForm } from '@/types'

interface Props {
  data: BrandBrainForm
  onChange: (f: Partial<BrandBrainForm>) => void
  onNext: () => void
  loading?: boolean
}

const languages = [
  { value: 'en', label: 'English' }, { value: 'sk', label: 'Slovak' },
  { value: 'cs', label: 'Czech' },   { value: 'de', label: 'German' },
  { value: 'hu', label: 'Hungarian'},{ value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
]

export function Step1Basics({ data, onChange, onNext, loading }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleNext() {
    const e: Record<string, string> = {}
    if (!data.brand_name.trim()) e.brand_name = 'Required'
    if (!data.industry.trim())   e.industry   = 'Required'
    if (!data.location.trim())   e.location   = 'Required'
    setErrors(e)
    if (Object.keys(e).length === 0) onNext()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <Input label="Brand name *" placeholder="e.g. Acme Coffee Co."
        value={data.brand_name}
        onChange={e => { onChange({ brand_name: e.target.value }); setErrors(p => ({ ...p, brand_name: '' })) }}
        error={errors.brand_name} />

      <Input label="Website (optional)" type="url" placeholder="https://yourbrand.com"
        value={data.website_url}
        onChange={e => onChange({ website_url: e.target.value })} />

      <Input label="Industry / Niche *" placeholder="e.g. Specialty Coffee"
        value={data.industry}
        onChange={e => { onChange({ industry: e.target.value }); setErrors(p => ({ ...p, industry: '' })) }}
        error={errors.industry} />

      <Input label="Location *" placeholder="e.g. New York, USA"
        value={data.location}
        onChange={e => { onChange({ location: e.target.value }); setErrors(p => ({ ...p, location: '' })) }}
        error={errors.location} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontFamily: 'var(--font-ibm)', fontSize: 13, color: 'rgba(196,185,154,0.5)', fontWeight: 300 }}>Language</label>
        <select
          value={data.language}
          onChange={e => onChange({ language: e.target.value })}
          style={{ width: '100%', fontFamily: 'var(--font-ibm)', fontSize: 14, color: '#F6F2EA', cursor: 'pointer' }}
        >
          {languages.map(l => <option key={l.value} value={l.value} style={{ background: '#111009' }}>{l.label}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
        <button className="ob-btn" onClick={handleNext} disabled={loading}>
          {loading ? 'Analysing…' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}
