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

export function Step4Content({ data, onChange, onNext, onBack }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleNext() {
    const e: Record<string, string> = {}
    if (!data.post_topics.trim()) e.post_topics = 'Required'
    if (!data.post_avoid.trim()) e.post_avoid = 'Required'
    setErrors(e)
    if (Object.keys(e).length === 0) onNext()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <Textarea label="Post topics & formats *" rows={4}
        placeholder="What do you want to post about? What series, formats, moments?"
        value={data.post_topics}
        onChange={e => { onChange({ post_topics: e.target.value }); setErrors(p => ({ ...p, post_topics: '' })) }}
        error={errors.post_topics} />

      <Textarea label="What to never publish *" rows={3}
        placeholder="Taboo topics, things you'd never publish"
        value={data.post_avoid}
        onChange={e => { onChange({ post_avoid: e.target.value }); setErrors(p => ({ ...p, post_avoid: '' })) }}
        error={errors.post_avoid} />

      <Input label="Content ratio (optional)"
        placeholder="e.g. 60% products | 30% behind-the-scenes | 10% promotions"
        value={data.content_ratio}
        onChange={e => onChange({ content_ratio: e.target.value })} />

      <Input label="Link to brand materials (optional)" type="url"
        placeholder="Google Drive, Dropbox link..."
        value={data.materials_link}
        onChange={e => onChange({ materials_link: e.target.value })} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
        <button className="ob-btn-ghost" onClick={onBack}>← Back</button>
        <button className="ob-btn" onClick={handleNext}>Continue →</button>
      </div>
    </div>
  )
}
