'use client'
import { useEffect, useState } from 'react'

interface Template {
  id: string
  name: string
  description?: string
  thumbnail_url?: string
  category: string
}

interface TemplatePickerProps {
  selectedId?: string
  onSelect: (templateId: string) => void
}

export function TemplatePicker({ selectedId, onSelect }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/templates')
      .then(r => r.json())
      .then(data => { setTemplates(data); setLoading(false) })
  }, [])

  if (loading) return (
    <div style={{ color: 'rgba(246,242,234,0.32)', fontFamily: 'var(--font-ibm)', fontSize: 13, padding: 16 }}>
      Loading templates...
    </div>
  )

  if (templates.length === 0) return (
    <div style={{ color: 'rgba(246,242,234,0.32)', fontFamily: 'var(--font-ibm)', fontSize: 13, padding: 16 }}>
      No templates available. Create one in the admin panel.
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
      {templates.map(t => (
        <div
          key={t.id}
          onClick={() => onSelect(t.id)}
          style={{
            cursor: 'pointer', borderRadius: 10, overflow: 'hidden',
            border: selectedId === t.id ? '2px solid #D4A84B' : '2px solid #2D2A1F',
            background: '#1A1810', transition: 'border-color 0.15s',
          }}
        >
          {t.thumbnail_url ? (
            <div style={{ width: '100%', aspectRatio: '4/5', overflow: 'hidden', position: 'relative' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={t.thumbnail_url}
                alt={t.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          ) : (
            <div style={{
              width: '100%', aspectRatio: '4/5', background: '#221F15',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(246,242,234,0.2)', fontSize: 12, fontFamily: 'var(--font-ibm)',
            }}>
              No preview
            </div>
          )}
          <div style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: 12, color: '#F6F2EA', fontFamily: 'var(--font-syne)', fontWeight: 600 }}>
              {t.name}
            </div>
            {t.description && (
              <div style={{ fontSize: 11, color: 'rgba(246,242,234,0.45)', fontFamily: 'var(--font-ibm)', marginTop: 3 }}>
                {t.description}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
