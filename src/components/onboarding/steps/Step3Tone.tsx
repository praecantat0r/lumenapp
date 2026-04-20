'use client'
import { useState } from 'react'
import { Textarea } from '@/components/ui/Input'
import type { BrandBrainForm } from '@/types'

const TONES = ['Professional','Friendly','Inspiring','Authoritative','Playful',
               'Luxurious','Minimal','Bold','Warm','Humorous','Informative','Passionate']

interface Props {
  data: BrandBrainForm
  onChange: (f: Partial<BrandBrainForm>) => void
  onNext: () => void
  onBack: () => void
}

export function Step3Tone({ data, onChange, onNext, onBack }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  function toggleTone(t: string) {
    const curr = data.tone_keywords
    if (curr.includes(t)) onChange({ tone_keywords: curr.filter(k => k !== t) })
    else if (curr.length < 3) onChange({ tone_keywords: [...curr, t] })
  }

  function handleNext() {
    const e: Record<string, string> = {}
    if (data.tone_keywords.length === 0) e.tone_keywords   = 'Select at least one tone'
    if (!data.tone_description.trim())   e.tone_description = 'Required'
    if (!data.target_audience.trim())    e.target_audience  = 'Required'
    if (!data.audience_problem.trim())   e.audience_problem = 'Required'
    setErrors(e)
    if (Object.keys(e).length === 0) onNext()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <label style={{ display: 'block', fontFamily: 'var(--font-ibm)', fontSize: 13, color: 'rgba(196,185,154,0.5)', fontWeight: 300, marginBottom: 12 }}>
          Brand tone — select 1–3
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {TONES.map(t => (
            <button
              key={t}
              onClick={() => toggleTone(t)}
              className={`ob-chip${data.tone_keywords.includes(t) ? ' ob-chip-on' : ''}`}
            >
              {t}
            </button>
          ))}
        </div>
        {errors.tone_keywords && <p style={{ fontSize: 11, color: 'var(--error)', marginTop: 8, fontFamily: 'var(--font-ibm)' }}>{errors.tone_keywords}</p>}
      </div>

      <Textarea label="Describe your brand voice in detail *" rows={3}
        placeholder="e.g. Sophisticated yet approachable, speaks to professionals who value quality..."
        value={data.tone_description}
        onChange={e => { onChange({ tone_description: e.target.value }); setErrors(p => ({ ...p, tone_description: '' })) }}
        error={errors.tone_description} />

      <Textarea label="Who is your target audience? *" rows={2}
        placeholder="e.g. Entrepreneurs aged 25–45 who value premium experiences"
        value={data.target_audience}
        onChange={e => { onChange({ target_audience: e.target.value }); setErrors(p => ({ ...p, target_audience: '' })) }}
        error={errors.target_audience} />

      <Textarea label="What problem do you solve for them? *" rows={2}
        placeholder="e.g. They want exceptional quality without leaving home"
        value={data.audience_problem}
        onChange={e => { onChange({ audience_problem: e.target.value }); setErrors(p => ({ ...p, audience_problem: '' })) }}
        error={errors.audience_problem} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
        <button className="ob-btn-ghost" onClick={onBack}>← Back</button>
        <button className="ob-btn" onClick={handleNext}>Continue →</button>
      </div>
    </div>
  )
}
