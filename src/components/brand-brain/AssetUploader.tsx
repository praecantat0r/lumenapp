'use client'
import { useState, useRef } from 'react'
import Image from 'next/image'
import { Trash2, Upload } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import type { BrandAsset } from '@/types'
import toast from 'react-hot-toast'

interface Props {
  assets: BrandAsset[]
  userId: string
  onAssetsChange: (assets: BrandAsset[]) => void
}

const ASSET_TYPES: { value: BrandAsset['type']; label: string; icon: string }[] = [
  { value: 'product_photo', label: 'Product photo',   icon: 'inventory_2'     },
  { value: 'label',         label: 'Label / sticker', icon: 'sell'            },
  { value: 'logo',          label: 'Logo',            icon: 'brand_awareness' },
  { value: 'photo',         label: 'Scene / photo',   icon: 'landscape'       },
  { value: 'screenshot',    label: 'App screenshot',  icon: 'computer'        },
  { value: 'other',         label: 'Other',           icon: 'category'        },
]

const GOLD = '#b68d40'

function TypeBadge({ asset, onChange }: { asset: BrandAsset; onChange: (type: BrandAsset['type']) => void }) {
  const [open, setOpen] = useState(false)
  const current = ASSET_TYPES.find(t => t.value === asset.type) ?? ASSET_TYPES[4]

  return (
    <div style={{ position: 'absolute', bottom: 8, left: 8, zIndex: 10 }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        style={{
          fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase',
          padding: '3px 8px 3px 5px', borderRadius: 5, border: 'none', cursor: 'pointer',
          background: 'rgba(11,10,5,.75)', backdropFilter: 'blur(6px)',
          color: GOLD, fontFamily: 'var(--font-ibm)', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>{current.icon}</span>
        {current.label}
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', bottom: '100%', left: 0, marginBottom: 4,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 8, overflow: 'hidden', zIndex: 30, minWidth: 150,
            boxShadow: '0 8px 24px rgba(0,0,0,.4)',
          }}>
            {ASSET_TYPES.map(t => (
              <button
                key={t.value}
                onClick={e => { e.stopPropagation(); onChange(t.value); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  width: '100%', padding: '8px 12px', border: 'none', cursor: 'pointer',
                  background: t.value === asset.type ? 'rgba(182,141,64,.12)' : 'transparent',
                  color: t.value === asset.type ? GOLD : 'var(--sand)',
                  fontFamily: 'var(--font-ibm)', fontSize: 12,
                }}
                onMouseEnter={e => { if (t.value !== asset.type) e.currentTarget.style.background = 'rgba(255,255,255,.04)' }}
                onMouseLeave={e => { if (t.value !== asset.type) e.currentTarget.style.background = 'transparent' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15, color: GOLD, fontVariationSettings: "'FILL' 1", flexShrink: 0 }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function DescriptionButton({ asset, onSave }: { asset: BrandAsset; onSave: (desc: string) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(asset.description ?? '')
  const [saving, setSaving] = useState(false)
  const hasDesc = !!(asset.description?.trim())

  async function save() {
    setSaving(true)
    await onSave(value)
    setSaving(false)
    setOpen(false)
  }

  return (
    <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 10 }}>
      <button
        onClick={e => { e.stopPropagation(); setValue(asset.description ?? ''); setOpen(o => !o) }}
        title="Describe for AI"
        style={{
          width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: hasDesc ? 'rgba(182,141,64,.85)' : 'rgba(11,10,5,.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: hasDesc ? '#1c1c19' : GOLD,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>psychology</span>
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => setOpen(false)} />
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: '100%', right: 0, marginBottom: 6,
              width: 240, background: 'var(--surface)',
              border: '1px solid rgba(182,141,64,.25)',
              borderRadius: 10, padding: 12, zIndex: 30,
              boxShadow: '0 8px 32px rgba(0,0,0,.45)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: GOLD, fontVariationSettings: "'FILL' 1" }}>psychology</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: GOLD, fontFamily: 'var(--font-ibm)', letterSpacing: '.05em', textTransform: 'uppercase' }}>AI description</span>
            </div>
            <textarea
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="Describe this asset for AI — e.g. &ldquo;our limited edition coffee, emphasize exclusivity&rdquo;"
              autoFocus
              rows={4}
              style={{
                width: '100%', resize: 'none', boxSizing: 'border-box',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 7, padding: '8px 10px',
                fontSize: 12, lineHeight: 1.6, color: 'var(--parchment)',
                fontFamily: 'var(--font-ibm)', fontWeight: 300,
                outline: 'none',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(182,141,64,.4)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button
                onClick={() => setOpen(false)}
                style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontSize: 11, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                style={{ flex: 2, padding: '6px 0', borderRadius: 6, border: 'none', background: GOLD, color: '#1c1c19', fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 11, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function AssetUploader({ assets, userId, onAssetsChange }: Props) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File) {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const uploadRes = await fetch('/api/brand-brain/assets/upload', { method: 'POST', body: formData })
      if (!uploadRes.ok) throw new Error((await uploadRes.json()).error || 'Upload failed')
      const { storage_path, public_url, asset_category } = await uploadRes.json()
      const res = await fetch('/api/brand-brain/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storage_path, public_url, type: asset_category || 'photo', name: file.name }),
      })
      if (!res.ok) throw new Error('Failed to save asset')
      onAssetsChange([await res.json(), ...assets])
      toast.success('Asset uploaded')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function deleteAsset(asset: BrandAsset) {
    const res = await fetch(`/api/brand-brain/assets/${asset.id}`, { method: 'DELETE' })
    if (res.ok) { onAssetsChange(assets.filter(a => a.id !== asset.id)); toast.success('Asset deleted') }
    else toast.error('Delete failed')
  }

  async function updateAssetType(asset: BrandAsset, type: BrandAsset['type']) {
    const res = await fetch(`/api/brand-brain/assets/${asset.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })
    if (res.ok) onAssetsChange(assets.map(a => a.id === asset.id ? { ...a, type } : a))
    else toast.error((await res.json().catch(() => ({}))).error || 'Failed to update type')
  }

  async function updateDescription(asset: BrandAsset, description: string) {
    const res = await fetch(`/api/brand-brain/assets/${asset.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    })
    if (res.ok) {
      onAssetsChange(assets.map(a => a.id === asset.id ? { ...a, description } : a))
      toast.success('Description saved')
    } else {
      toast.error('Failed to save description')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')).forEach(uploadFile)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--candle)' : 'var(--border)'}`,
          borderRadius: 12, padding: 40, textAlign: 'center',
          cursor: 'pointer', transition: 'all 150ms',
          background: dragOver ? 'rgba(212,168,75,0.04)' : 'transparent',
        }}
      >
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display: 'none' }}
          onChange={e => Array.from(e.target.files || []).forEach(uploadFile)} />
        {uploading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <Spinner />
            <span style={{ color: 'var(--sand)', fontSize: 14 }}>Uploading...</span>
          </div>
        ) : (
          <>
            <Upload size={28} style={{ color: 'var(--sand)', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--sand)', fontSize: 14, fontWeight: 300 }}>
              Drop images here or <span style={{ color: 'var(--candle)' }}>browse</span>
            </p>
            <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>JPEG, PNG, WebP</p>
          </>
        )}
      </div>

      {/* Asset grid */}
      {assets.length > 0 && (
        <>
        <style>{`.au-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}@media(max-width:767px){.au-grid{grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}}`}</style>
        <div className="au-grid">
          {assets.map(asset => (
            <div key={asset.id} style={{ position: 'relative', borderRadius: 10, overflow: 'visible', aspectRatio: '1', background: 'var(--surface-2)' }}>
              <div style={{ borderRadius: 10, overflow: 'hidden', width: '100%', height: '100%', position: 'relative' }}>
                <Image src={asset.public_url} alt={asset.name || 'Asset'} fill sizes="(max-width: 767px) 120px, 200px" style={{ objectFit: 'cover' }} />
                {/* Delete */}
                <button
                  onClick={() => deleteAsset(asset)}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'rgba(0,0,0,0.65)', border: 'none', borderRadius: 6,
                    padding: 5, cursor: 'pointer', color: '#FF6B6B', display: 'flex',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {/* TypeBadge + DescriptionButton outside overflow:hidden */}
              <TypeBadge asset={asset} onChange={type => updateAssetType(asset, type)} />
              <DescriptionButton asset={asset} onSave={desc => updateDescription(asset, desc)} />
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  )
}
