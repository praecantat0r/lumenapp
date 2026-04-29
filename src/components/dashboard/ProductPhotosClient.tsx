'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { ProductPhoto, BrandAsset, SceneSettings, SceneElement } from '@/types'
import { GenerateProductPhotoModal } from './GenerateProductPhotoModal'
import type { ProductPhotoConfig } from './GenerateProductPhotoModal'
import { CaptionGeneratingOverlay, CaptionResultModal } from './CaptionModal'

const CanvasEditor = dynamic(
  () => import('@/components/canvas/CanvasEditor').then(m => m.CanvasEditor),
  { ssr: false }
)

// ── Types ────────────────────────────────────────────────────────────────────

interface Props {
  photos: ProductPhoto[]
  brandAssets: BrandAsset[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_SCENE: SceneSettings = {
  lightingIntensity: 70,
  lightingDirection: 45,
  lightingType: 'soft',
  colorTemperature: 0,
  saturation: 0,
  contrast: 0,
  exposure: 0,
  sceneType: 'studio',
  sceneCustom: '',
  backgroundType: 'color',
  backgroundColor: '#1a1410',
  backgroundGradientFrom: '#2a1f0e',
  backgroundGradientTo: '#0d0b07',
  backgroundAiPrompt: '',
  backgroundPhotoUrl: '',
  backgroundPhotoName: '',
  productPosition: 'center',
  zoom: 100,
  viewAngle: 'front',
  elements: [],
  customPrompt: '',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatusBadge({ status }: { status: ProductPhoto['status'] }) {
  const cfg = {
    generating: { label: 'Generating', color: '#b68d40', bg: 'rgba(182,141,64,.12)' },
    done:       { label: 'Done',       color: '#6EBF8B', bg: 'rgba(110,191,139,.12)' },
    failed:     { label: 'Failed',     color: '#E07070', bg: 'rgba(224,112,112,.12)' },
  }[status]
  return (
    <span style={{ fontSize: 10, fontFamily: 'var(--font-ibm)', fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 9999, color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  )
}

function Slider({ label, min, max, step = 1, value, onChange, unit = '', zero }: {
  label: string; min: number; max: number; step?: number
  value: number; onChange: (v: number) => void; unit?: string; zero?: string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontWeight: 500, letterSpacing: '.05em', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--parchment)', fontFamily: 'var(--font-ibm)', fontWeight: 500, minWidth: 40, textAlign: 'right' }}>
          {zero && value === 0 ? zero : `${value > 0 && min < 0 ? '+' : ''}${value}${unit}`}
        </span>
      </div>
      <div style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: 2, background: 'var(--border)', borderRadius: 1 }} />
        {min < 0 && (
          <div style={{ position: 'absolute', left: '50%', width: 1, height: 6, background: 'rgba(212,168,75,.3)', transform: 'translateX(-50%)' }} />
        )}
        <div style={{ position: 'absolute', left: 0, width: `${pct}%`, height: 2, background: 'linear-gradient(to right, #7b580d, var(--candle))', borderRadius: 1 }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', height: 20, margin: 0 }}
        />
        <div style={{ position: 'absolute', left: `${pct}%`, width: 14, height: 14, borderRadius: '50%', background: 'white', border: '2px solid var(--candle)', transform: 'translateX(-50%)', pointerEvents: 'none', boxShadow: '0 0 6px rgba(212,168,75,.4)' }} />
      </div>
    </div>
  )
}

function PillGroup<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: '5px 13px', borderRadius: 9999, fontFamily: 'var(--font-ibm)', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 120ms', whiteSpace: 'nowrap',
            border: value === o.value ? '1px solid rgba(212,168,75,.45)' : '1px solid var(--border)',
            background: value === o.value ? 'rgba(212,168,75,.14)' : 'var(--surface)',
            color: value === o.value ? 'var(--candle)' : 'var(--muted)',
          }}
        >{o.label}</button>
      ))}
    </div>
  )
}

function SidebarSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, color: '#6b6050', fontFamily: 'var(--font-ibm)', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 14 }}>
      {children}
    </div>
  )
}

function SettingRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 11, color: 'var(--parchment)', fontFamily: 'var(--font-ibm)', textAlign: 'right', minWidth: 0, wordBreak: 'break-word' }}>{value}</span>
    </div>
  )
}

function directionLabel(deg: number): string {
  const dirs = ['Top', 'Top-right', 'Right', 'Bottom-right', 'Bottom', 'Bottom-left', 'Left', 'Top-left']
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8]
}

function tempLabel(v: number): string {
  if (v > 30) return `Warm (+${v})`
  if (v < -30) return `Cool (${v})`
  return `Neutral (${v > 0 ? '+' : ''}${v})`
}

function zoomLabel(v: number): string {
  if (v <= 70) return `Wide (${v}%)`
  if (v >= 130) return `Close-up (${v}%)`
  return `${v}%`
}

// ── Radial Direction Picker ───────────────────────────────────────────────────

function RadialDirectionPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)

  function pickAngle(clientX: number, clientY: number) {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const angle = Math.round((Math.atan2(clientX - cx, -(clientY - cy)) * 180) / Math.PI)
    onChange(((angle % 360) + 360) % 360)
  }

  const rad = (value * Math.PI) / 180
  // dot position on the ring: 50% ± 38% of container size
  const dotX = 50 + 38 * Math.sin(rad)
  const dotY = 50 - 38 * Math.cos(rad)

  return (
    <div
      ref={containerRef}
      onClick={e => pickAngle(e.clientX, e.clientY)}
      style={{ position: 'relative', height: 128, background: 'var(--carbon)', borderRadius: 12, border: '1px solid var(--border)', cursor: 'crosshair', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {/* Subtle radial bg */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, rgba(255,255,255,0.025), transparent)', pointerEvents: 'none' }} />

      {/* Orbit ring */}
      <div style={{ width: 80, height: 80, borderRadius: '50%', border: '1px solid var(--border)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        {/* Center dot */}
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(212,168,75,.25)' }} />

        {/* Line from center to dot */}
        <div style={{
          position: 'absolute',
          left: '50%', top: '50%',
          width: '50%', height: 1,
          background: 'rgba(212,168,75,.15)',
          transformOrigin: '0% 50%',
          transform: `rotate(${value - 90}deg)`,
        }} />
      </div>

      {/* Light dot on the ring */}
      <div style={{
        position: 'absolute',
        left: `${dotX}%`, top: `${dotY}%`,
        transform: 'translate(-50%, -50%)',
        width: 22, height: 22,
        borderRadius: '50%',
        background: 'var(--candle)',
        boxShadow: '0 0 14px rgba(212,168,75,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 11, color: '#1a1410', fontVariationSettings: "'FILL' 1" }}>light_mode</span>
      </div>

      {/* Label */}
      <div style={{ position: 'absolute', bottom: 7, right: 10, fontSize: 9, color: 'rgba(196,185,154,.35)', fontFamily: 'var(--font-ibm)', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>
        {value}° {directionLabel(value)}
      </div>
    </div>
  )
}

// ── Metric Bento Card ─────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, icon, trend }: { label: string; value: string; sub?: string; icon: string; trend?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.04)', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 9, fontFamily: 'var(--font-ibm)', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#6b6050' }}>{label}</span>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#7b580d' }}>{icon}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
        <span style={{ fontSize: 22, fontFamily: 'var(--font-syne)', fontWeight: 700, color: 'var(--parchment)', lineHeight: 1 }}>{value}</span>
        {trend && <span style={{ fontSize: 10, color: '#6EBF8B', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 2, fontFamily: 'var(--font-ibm)' }}><span className="material-symbols-outlined" style={{ fontSize: 12 }}>trending_up</span>{trend}</span>}
        {sub && !trend && <span style={{ fontSize: 10, color: '#6b6050', marginBottom: 2, fontFamily: 'var(--font-ibm)' }}>{sub}</span>}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ProductPhotosClient({ photos: initialPhotos, brandAssets }: Props) {
  const router = useRouter()

  // ─ Tabs
  const [mainTab, setMainTab] = useState<'photos' | 'scene'>('photos')
  const [sceneTab, setSceneTab] = useState<'settings' | 'advanced'>('settings')

  // ─ Scene tab: scene settings
  const [scene, setScene] = useState<SceneSettings>(DEFAULT_SCENE)

  // ─ Gallery
  const [photos, setPhotos] = useState<ProductPhoto[]>(initialPhotos)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'generating' | 'done'>('all')

  // ─ Selection / delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  // ─ Modal
  const [showModal, setShowModal] = useState(false)

  // ─ Caption
  const [captionGenerating, setCaptionGenerating] = useState(false)
  const [captionStep, setCaptionStep] = useState('Analyzing image…')
  const [captionResult, setCaptionResult] = useState<{ caption: string; hashtags: string } | null>(null)
  const [captionError, setCaptionError] = useState<string | null>(null)
  const captionPhotoRef = useRef<ProductPhoto | null>(null)

  // ─ Canvas editor
  const [editingPhoto, setEditingPhoto] = useState<ProductPhoto | null>(null)
  const [editorSaving, setEditorSaving] = useState(false)

  const pollingRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const selectedPhoto = photos.find(p => p.id === selectedId) ?? null

  function setS<K extends keyof SceneSettings>(key: K, val: SceneSettings[K]) {
    setScene(s => ({ ...s, [key]: val }))
  }

  // ─ Polling
  const startPolling = useCallback((photoId: string) => {
    if (pollingRef.current.has(photoId)) return
    let failures = 0
    let delay = 3000
    const MAX_DELAY = 15000

    function poll() {
      const t = setTimeout(async () => {
        try {
          const res = await fetch(`/api/product-photos/${photoId}/status`)
          if (!res.ok) {
            if (++failures >= 5) { pollingRef.current.delete(photoId); return }
            poll()
            return
          }
          failures = 0
          const { status, image_url } = await res.json()
          if (status === 'done' || status === 'failed') {
            pollingRef.current.delete(photoId)
            setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, status, image_url } : p))
            if (status === 'done') router.refresh()
            return
          }
          delay = Math.min(delay * 1.5, MAX_DELAY)
          poll()
        } catch { poll() }
      }, delay)
      pollingRef.current.set(photoId, t)
    }
    poll()
  }, [router])

  useEffect(() => {
    photos.filter(p => p.status === 'generating').forEach(p => startPolling(p.id))
    return () => { pollingRef.current.forEach(t => clearTimeout(t)); pollingRef.current.clear() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─ Generate
  async function handleModalGenerate(config: ProductPhotoConfig) {
    setShowModal(false)
    try {
      const res = await fetch('/api/generate/product-photo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) return
      const { photo_id } = await res.json()
      const optimistic: ProductPhoto = {
        id: photo_id, user_id: '', status: 'generating', settings: scene,
        asset_mode: config.assetMode,
        asset_url: config.assetUrl, asset_name: config.assetName,
        created_at: new Date().toISOString(),
      }
      setPhotos(prev => [optimistic, ...prev])
      startPolling(photo_id)
      setMainTab('photos')
    } catch { /* ignore */ }
  }

  function handleDownload(photo: ProductPhoto) {
    if (!photo.image_url) return
    const a = document.createElement('a')
    a.href = photo.image_url
    a.download = `product-photo-${photo.id.slice(0, 8)}.jpg`
    a.target = '_blank'
    a.click()
  }

  async function handleGenerateCaption(photo: ProductPhoto) {
    if (!photo.image_url) return
    captionPhotoRef.current = photo
    setCaptionResult(null)
    setCaptionGenerating(true)
    setCaptionStep('Analyzing image…')
    await new Promise(r => setTimeout(r, 800))
    setCaptionStep('Writing caption…')
    try {
      const res = await fetch('/api/generate/caption-only', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: photo.image_url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setCaptionResult(data)
    } catch (err) {
      setCaptionError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally { setCaptionGenerating(false) }
  }

  function buildEditorJson(photo: ProductPhoto) {
    return {
      background: '#000000',
      width: 1080,
      height: 1350,
      objects: [{
        type: 'image',
        lumenId: 'background-image',
        left: 0,
        top: 0,
        width: 1080,
        height: 1350,
        src: photo.image_url!,
        opacity: 1,
        angle: 0,
        fill: 'transparent',
        selectable: true,
      }],
    }
  }

  async function handlePhotoEditorSave(canvasJson: any, dataUrl?: string) {
    if (!editingPhoto || !dataUrl) { setEditingPhoto(null); return }
    setEditorSaving(true)
    try {
      const blob = await fetch(dataUrl).then(r => r.blob())
      const fd = new FormData()
      fd.append('file', blob, `product-edit-${Date.now()}.png`)
      const uploadRes = await fetch('/api/brand-brain/assets/upload', { method: 'POST', body: fd })
      if (!uploadRes.ok) throw new Error('Upload failed')
      const { public_url } = await uploadRes.json()
      await fetch(`/api/product-photos/${editingPhoto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: public_url, canvas_json: canvasJson }),
      })
      setPhotos(ps => ps.map(p => p.id === editingPhoto.id ? { ...p, image_url: public_url, canvas_json: canvasJson } : p))
    } catch { /* silent fail */ }
    setEditorSaving(false)
    setEditingPhoto(null)
  }

  function handleRegenerate(photo: ProductPhoto) {
    if (photo.settings && Object.keys(photo.settings).length > 0) {
      setScene(s => ({ ...s, ...photo.settings }))
    }
    setShowModal(true)
  }

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function handleDeleteSelected() {
    if (selectedIds.size === 0 || deleting) return
    setDeleting(true)
    const ids = [...selectedIds]
    await Promise.all(ids.map(id =>
      fetch(`/api/product-photos/${id}`, { method: 'DELETE' }).catch(() => {})
    ))
    setPhotos(prev => prev.filter(p => !selectedIds.has(p.id)))
    if (selectedId && selectedIds.has(selectedId)) setSelectedId(null)
    setSelectedIds(new Set())
    setDeleting(false)
  }

  // ─ Scene elements
  const [elementInput, setElementInput] = useState('')
  function addElement(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const el: SceneElement = { id: Date.now().toString(), name: trimmed }
    setS('elements', [...scene.elements, el])
    setElementInput('')
  }
  function removeElement(id: string) {
    setS('elements', scene.elements.filter(e => e.id !== id))
  }

  // ─ Computed preview values (shared by both the preview card and the old strip)
  function computePreview() {
    const brightness = Math.max(0.05, 1 + scene.exposure / 100)
    const contrast   = Math.max(0,    1 + (scene.contrast / 100) * 1.5)
    const saturate   = Math.max(0,    1 + (scene.saturation / 100) * 2)
    const cssFilter  = `brightness(${brightness.toFixed(3)}) contrast(${contrast.toFixed(3)}) saturate(${saturate.toFixed(3)})`

    const rad = (scene.lightingDirection * Math.PI) / 180
    const lx  = (50 + 50 * Math.sin(rad)).toFixed(1)
    const ly  = (50 - 50 * Math.cos(rad)).toFixed(1)
    const radius  = scene.lightingType === 'hard' ? '45%' : scene.lightingType === 'diffused' ? '100%' : '75%'
    const intensity = scene.lightingIntensity / 100

    // Diffuse light bloom from the light direction
    const diffuseOpacity = scene.lightingType === 'diffused'
      ? intensity * 0.18
      : scene.lightingType === 'hard'
      ? intensity * 0.55
      : intensity * 0.38
    const lightGradient = `radial-gradient(${radius} at ${lx}% ${ly}%, rgba(255,248,200,${diffuseOpacity.toFixed(3)}), transparent)`

    // Specular highlight — tight, bright spot, only meaningful for hard/soft
    const specSize = scene.lightingType === 'hard' ? '18%' : '32%'
    const specOpacity = scene.lightingType === 'diffused' ? 0 : intensity * (scene.lightingType === 'hard' ? 0.45 : 0.18)
    const specularGradient = `radial-gradient(${specSize} at ${lx}% ${ly}%, rgba(255,255,245,${specOpacity.toFixed(3)}), transparent)`

    // Shadow — dark fill from the opposite side of the light
    const shadowX = (50 - 42 * Math.sin(rad)).toFixed(1)
    const shadowY = (50 + 42 * Math.cos(rad)).toFixed(1)
    const shadowOpacity = scene.lightingType === 'diffused'
      ? intensity * 0.1
      : scene.lightingType === 'hard'
      ? intensity * 0.55
      : intensity * 0.35
    const shadowGradient = `radial-gradient(70% at ${shadowX}% ${shadowY}%, rgba(0,0,0,${shadowOpacity.toFixed(3)}), transparent)`

    const temp = scene.colorTemperature
    const tintColor = temp > 0
      ? `rgba(210,130,40,${(temp / 280).toFixed(3)})`
      : temp < 0
      ? `rgba(80,130,220,${(Math.abs(temp) / 280).toFixed(3)})`
      : 'transparent'

    const bgStyle =
      scene.backgroundType === 'color'    ? scene.backgroundColor :
      scene.backgroundType === 'gradient' ? `linear-gradient(135deg, ${scene.backgroundGradientFrom}, ${scene.backgroundGradientTo})` :
      'var(--surface-2)'

    return { cssFilter, lightGradient, specularGradient, shadowGradient, tintColor, bgStyle }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <style>{`
        @keyframes pp-spin { to{transform:rotate(360deg)} }
        .pp-card { position:relative; border-radius:12px; overflow:hidden; aspect-ratio:4/5; background:var(--surface-2); border:1px solid var(--border); cursor:pointer; transition:border-color 200ms,transform 200ms; }
        .pp-card:hover { border-color:rgba(212,168,75,.3); transform:translateY(-2px); }
        .pp-card.selected { border-color:rgba(212,168,75,.5); box-shadow:0 0 0 1px rgba(212,168,75,.15); }
        .pp-card-overlay { position:absolute; inset:0; background:linear-gradient(to top,rgba(11,10,5,.85) 0%,transparent 55%); opacity:0; transition:opacity 200ms; }
        .pp-card:hover .pp-card-overlay { opacity:1; }
        .pp-card-actions { position:absolute; bottom:10px; left:10px; right:10px; display:flex; gap:6px; opacity:0; transition:opacity 200ms; }
        .pp-card:hover .pp-card-actions { opacity:1; }
        .pp-action-btn { flex:1; padding:6px 0; border-radius:6px; border:1px solid rgba(212,168,75,.3); background:rgba(11,10,5,.6); backdrop-filter:blur(6px); color:var(--sand); font-family:var(--font-ibm); font-size:10px; font-weight:500; letter-spacing:.06em; cursor:pointer; transition:all 120ms; }
        .pp-action-btn:hover { background:rgba(212,168,75,.15); color:var(--parchment); border-color:rgba(212,168,75,.5); }
        .pp-check { position:absolute; top:7px; right:7px; z-index:3; width:20px; height:20px; border-radius:6px; border:1.5px solid rgba(255,255,255,0.35); background:rgba(11,10,5,0.55); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 150ms; cursor:pointer; }
        .pp-card:hover .pp-check { opacity:1; }
        .pp-check.checked { opacity:1; background:var(--candle); border-color:var(--candle); }
        .scene-ctrl-btn { padding:8px; border-radius:9999px; background:transparent; border:none; cursor:pointer; color:var(--muted); display:flex; align-items:center; justify-content:center; transition:all 120ms; }
        .scene-ctrl-btn:hover { background:rgba(255,255,255,0.06); color:var(--parchment); }
        .scene-sidebar-tab { flex:1; padding:14px 8px; font-family:var(--font-ibm); font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; cursor:pointer; border:none; background:transparent; transition:all 150ms; }
        input[type=range]:focus { outline:none; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
        /* ── Light mode ── */
        [data-theme="light"] .pp-gallery-bg { background: var(--carbon) !important; }
        [data-theme="light"] .pp-gallery-filter { background: var(--surface-2) !important; }
        /* ── Responsive ── */
        @media (max-width: 767px) {
          .pp-header { flex-wrap: wrap !important; gap: 10px !important; padding: 12px 16px !important; }
          .pp-header-tabs { order: 3; width: 100%; }
          .pp-header-genbtn { margin-left: auto; }
          .pp-scene-body { flex-direction: column !important; overflow-y: auto !important; overflow-x: hidden !important; }
          .pp-scene-sidebar { width: 100% !important; flex-shrink: 0 !important; border-left: none !important; border-top: 1px solid var(--border) !important; max-height: 420px; overflow-y: auto; }
          .pp-scene-left { flex-shrink: 0; }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="pp-header" style={{ padding: '24px 32px', borderBottom: '1px solid rgba(78,69,56,0.25)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexShrink: 0, background: 'var(--carbon)' }}>
        <div>
          <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--candle)', fontWeight: 600 }}>Visual Assets</span>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: 32, fontWeight: 800, letterSpacing: '-.03em', color: 'var(--parchment)', lineHeight: 1.1, marginTop: 4 }}>Product Photos</h1>
        </div>

        {/* Generate button */}
        <button
          className="pp-header-genbtn"
          onClick={() => setMainTab('scene')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 9999, background: 'rgba(182,141,64,0.12)', border: '1px solid rgba(182,141,64,0.25)', color: 'var(--candle)', fontFamily: 'var(--font-syne)', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15, fontVariationSettings: "'FILL' 1" }}>camera_enhance</span>
          Generate Photo
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ═══════════════════════ PHOTOS TAB ════════════════════════════════ */}
        {mainTab === 'photos' && (
          <>
            {/* Gallery */}
            <div className="pp-gallery-bg" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--carbon)' }}>
              {/* Filter / selection bar */}
              {photos.length > 0 && (
                <div className="pp-gallery-filter" style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, flexShrink: 0, background: 'var(--carbon)', alignItems: 'center', minHeight: 48 }}>
                  {selectedIds.size > 0 ? (
                    <>
                      <span style={{ fontSize: 11, color: 'var(--parchment)', fontFamily: 'var(--font-ibm)', fontWeight: 500 }}>
                        {selectedIds.size} selected
                      </span>
                      <button
                        onClick={() => setSelectedIds(new Set())}
                        style={{ padding: '4px 10px', borderRadius: 9999, fontFamily: 'var(--font-ibm)', fontSize: 11, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', transition: 'all 120ms' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--parchment)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.2)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                      >
                        Clear
                      </button>
                      <div style={{ flex: 1 }} />
                      <button
                        onClick={handleDeleteSelected}
                        disabled={deleting}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 9999, fontFamily: 'var(--font-ibm)', fontSize: 11, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', border: '1px solid rgba(224,112,112,.35)', background: 'rgba(224,112,112,.1)', color: '#E07070', transition: 'all 120ms', opacity: deleting ? 0.6 : 1 }}
                        onMouseEnter={e => { if (!deleting) { e.currentTarget.style.background = 'rgba(224,112,112,.2)'; e.currentTarget.style.borderColor = 'rgba(224,112,112,.55)' } }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(224,112,112,.1)'; e.currentTarget.style.borderColor = 'rgba(224,112,112,.35)' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                        {deleting ? 'Deleting…' : `Delete ${selectedIds.size}`}
                      </button>
                    </>
                  ) : (
                    ([
                      { v: 'all',        label: 'All',        count: photos.length },
                      { v: 'generating', label: 'Generating', count: photos.filter(p => p.status === 'generating').length },
                      { v: 'done',       label: 'Done',       count: photos.filter(p => p.status === 'done').length },
                    ] as const).map(({ v, label, count }) => count > 0 || v === 'all' ? (
                      <button
                        key={v}
                        onClick={() => setGalleryFilter(v)}
                        style={{
                          padding: '4px 12px', borderRadius: 9999, fontFamily: 'var(--font-ibm)', fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all 120ms', display: 'flex', alignItems: 'center', gap: 5,
                          border: galleryFilter === v ? '1px solid rgba(212,168,75,.4)' : '1px solid var(--border)',
                          background: galleryFilter === v ? 'rgba(212,168,75,.1)' : 'transparent',
                          color: 'var(--parchment)',
                        }}
                      >
                        {label}
                        <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 9999, background: galleryFilter === v ? 'rgba(212,168,75,.2)' : 'rgba(201,194,181,.08)', color: galleryFilter === v ? 'var(--candle)' : 'var(--parchment)' }}>{count}</span>
                      </button>
                    ) : null)
                  )}
                </div>
              )}

              {/* Grid */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                {(() => {
                  const visible = photos
                  const filtered = galleryFilter === 'all' ? visible : visible.filter(p => p.status === galleryFilter)
                  if (visible.length === 0) return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 14, paddingBottom: 60 }}>
                      <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(212,168,75,.08)', border: '1px solid rgba(212,168,75,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'rgba(212,168,75,.5)', fontVariationSettings: "'FILL' 1" }}>camera_enhance</span>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-syne)', fontSize: 14, fontWeight: 600, color: 'var(--sand)', marginBottom: 5 }}>No product photos yet</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontWeight: 300 }}>Click Generate Photo to get started</div>
                      </div>
                    </div>
                  )
                  if (filtered.length === 0) return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, paddingBottom: 60 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-ibm)' }}>No {galleryFilter} photos</span>
                    </div>
                  )
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                      {filtered.map(photo => (
                        <div key={photo.id} className={`pp-card${selectedId === photo.id ? ' selected' : ''}`} onClick={() => setSelectedId(selectedId === photo.id ? null : photo.id)}>
                          {/* Selection checkbox */}
                          <div
                            className={`pp-check${selectedIds.has(photo.id) ? ' checked' : ''}`}
                            onClick={e => toggleSelect(photo.id, e)}
                            title="Select"
                          >
                            {selectedIds.has(photo.id) && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <polyline points="2,5 4.2,7.5 8,2.5" stroke="#1a1410" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>

                          {photo.status === 'generating' ? (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                              <div style={{ width: 26, height: 26, border: '2px solid rgba(212,168,75,.2)', borderTopColor: 'var(--candle)', borderRadius: '50%', animation: 'pp-spin 0.8s linear infinite' }} />
                              <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-ibm)' }}>Generating…</span>
                            </div>
                          ) : photo.status === 'failed' ? (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#E07070' }}>error</span>
                              <span style={{ fontSize: 11, color: '#E07070', fontFamily: 'var(--font-ibm)' }}>Generation failed</span>
                              <button
                                onClick={e => { e.stopPropagation(); handleRegenerate(photo) }}
                                style={{ marginTop: 4, padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(224,112,112,.35)', background: 'rgba(224,112,112,.1)', color: '#E07070', fontFamily: 'var(--font-ibm)', fontSize: 10, fontWeight: 500, cursor: 'pointer', letterSpacing: '.05em' }}
                              >Try again</button>
                            </div>
                          ) : photo.image_url ? (
                            <Image src={photo.image_url} alt="Product photo" fill sizes="200px" style={{ objectFit: 'cover' }} />
                          ) : null}

                          <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 2 }}>
                            <StatusBadge status={photo.status} />
                          </div>

                          {photo.status === 'done' && (
                            <>
                              <div className="pp-card-overlay" />
                              <div className="pp-card-actions">
                                <button className="pp-action-btn" onClick={e => { e.stopPropagation(); handleDownload(photo) }}>Download</button>
                                <button className="pp-action-btn" onClick={e => { e.stopPropagation(); handleGenerateCaption(photo) }}>Captions</button>
                                <button className="pp-action-btn" onClick={e => { e.stopPropagation(); setEditingPhoto(photo) }}>Edit</button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Detail panel */}
            {selectedPhoto && (
              <aside style={{ width: 288, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 13, color: 'var(--parchment)' }}>Photo Detail</div>
                  <button onClick={() => setSelectedId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--parchment)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><line x1="13" y1="3" x2="3" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                  </button>
                </div>
                <div style={{ flex: 1, padding: 18, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
                  {/* Preview */}
                  {selectedPhoto.image_url && (
                    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', aspectRatio: '4/5', position: 'relative' }}>
                      <Image src={selectedPhoto.image_url} alt="Product photo" fill sizes="(max-width: 1024px) 40vw, 320px" style={{ objectFit: 'cover' }} />
                    </div>
                  )}

                  {/* Status + date */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <StatusBadge status={selectedPhoto.status} />
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-ibm)' }}>{formatDate(selectedPhoto.created_at)}</span>
                  </div>

                  {/* Actions */}
                  {selectedPhoto.status === 'done' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      <button onClick={() => handleDownload(selectedPhoto)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px', borderRadius: 7, background: 'var(--candle)', border: 'none', color: '#1a1410', fontFamily: 'var(--font-ibm)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.background = '#c8983c')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--candle)')}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>download</span>Download
                      </button>
                      <button onClick={() => handleRegenerate(selectedPhoto)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px', borderRadius: 7, background: 'transparent', border: '1px solid var(--border)', color: 'var(--sand)', fontFamily: 'var(--font-ibm)', fontSize: 12, cursor: 'pointer' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,168,75,.3)'; e.currentTarget.style.color = 'var(--parchment)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--sand)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>refresh</span>Regenerate
                      </button>
                      <button onClick={() => handleGenerateCaption(selectedPhoto)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px', borderRadius: 7, background: 'transparent', border: '1px solid var(--border)', color: 'var(--sand)', fontFamily: 'var(--font-ibm)', fontSize: 12, cursor: 'pointer' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(182,141,64,.3)'; e.currentTarget.style.color = 'var(--candle)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--sand)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>auto_awesome</span>Captions
                      </button>
                      <button onClick={() => setEditingPhoto(selectedPhoto)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px', borderRadius: 7, background: 'transparent', border: '1px solid var(--border)', color: 'var(--sand)', fontFamily: 'var(--font-ibm)', fontSize: 12, cursor: 'pointer' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(182,141,64,.3)'; e.currentTarget.style.color = 'var(--parchment)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--sand)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>Edit in Canvas
                      </button>
                    </div>
                  )}

                  {/* Scene settings */}
                  {selectedPhoto.settings && Object.keys(selectedPhoto.settings).length > 0 && (() => {
                    const s = selectedPhoto.settings as SceneSettings
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 2 }}>Scene Settings</div>
                        {selectedPhoto.asset_mode && <SettingRow label="Mode" value={selectedPhoto.asset_mode === 'composite' ? 'Composite' : 'Use Asset'} />}
                        {selectedPhoto.asset_name && <SettingRow label="Asset" value={selectedPhoto.asset_name} />}
                        {selectedPhoto.scenic_asset_name && <SettingRow label="Scene" value={selectedPhoto.scenic_asset_name} />}
                        {selectedPhoto.product_asset_name && <SettingRow label="Product" value={selectedPhoto.product_asset_name} />}
                        {s.lightingIntensity !== undefined && <SettingRow label="Light Intensity" value={`${s.lightingIntensity}%`} />}
                        {s.lightingDirection !== undefined && <SettingRow label="Light Direction" value={directionLabel(s.lightingDirection)} />}
                        {s.lightingType && <SettingRow label="Light Type" value={s.lightingType.charAt(0).toUpperCase() + s.lightingType.slice(1)} />}
                        {s.colorTemperature !== undefined && s.colorTemperature !== 0 && <SettingRow label="Temperature" value={tempLabel(s.colorTemperature)} />}
                        {s.saturation !== undefined && s.saturation !== 0 && <SettingRow label="Saturation" value={`${s.saturation > 0 ? '+' : ''}${s.saturation}`} />}
                        {s.contrast !== undefined && s.contrast !== 0 && <SettingRow label="Contrast" value={`${s.contrast > 0 ? '+' : ''}${s.contrast}`} />}
                        {s.exposure !== undefined && s.exposure !== 0 && <SettingRow label="Exposure" value={`${s.exposure > 0 ? '+' : ''}${s.exposure}`} />}
                        {s.sceneType && <SettingRow label="Scene Type" value={s.sceneType.charAt(0).toUpperCase() + s.sceneType.slice(1)} />}
                        {s.backgroundType && <SettingRow label="Background" value={{ color: 'Solid Color', gradient: 'Gradient', ai: 'AI Prompt', photo: 'Photo' }[s.backgroundType] ?? s.backgroundType} />}
                        {s.backgroundType === 'photo' && s.backgroundPhotoName && <SettingRow label="BG Photo" value={s.backgroundPhotoName} />}
                        {s.viewAngle && <SettingRow label="View Angle" value={s.viewAngle.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} />}
                        {s.productPosition && <SettingRow label="Position" value={s.productPosition.charAt(0).toUpperCase() + s.productPosition.slice(1)} />}
                        {s.zoom !== undefined && <SettingRow label="Zoom" value={zoomLabel(s.zoom)} />}
                        {s.customPrompt && (
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>Custom Prompt</div>
                            <div style={{ fontSize: 11, color: 'var(--sand)', fontFamily: 'var(--font-ibm)', lineHeight: 1.6, padding: '7px 10px', borderRadius: 6, background: 'rgba(212,168,75,.04)', border: '1px solid rgba(212,168,75,.1)' }}>{s.customPrompt}</div>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </aside>
            )}
          </>
        )}

        {/* ═══════════════════════ SCENE TAB ═════════════════════════════════ */}
        {mainTab === 'scene' && (() => {
          const { cssFilter, lightGradient, specularGradient, shadowGradient, tintColor, bgStyle } = computePreview()

          // Pick the best available base image for the live preview
          const donePhotos = photos.filter(p => p.status === 'done' && p.image_url)
          const previewPhoto = donePhotos[0] ?? null
          const fallbackAsset = brandAssets.find(a => a.public_url && (a.type === 'photo' || a.type === 'product_photo' || a.type === 'place_photo'))
          const previewImageUrl: string | null = previewPhoto?.image_url ?? fallbackAsset?.public_url ?? null
          const previewSourceLabel = previewPhoto
            ? `Generated · ${formatDate(previewPhoto.created_at)}`
            : fallbackAsset
            ? `Asset · ${fallbackAsset.name ?? 'Photo'}`
            : null

          // Derived metrics
          const luminance = Math.min(99, Math.round(scene.lightingIntensity * 0.84 + 16))
          const textureDetail = scene.lightingType === 'hard' ? 'High' : scene.lightingType === 'diffused' ? 'Soft' : 'Medium'
          const textureSub = scene.lightingType === 'hard' ? 'Crisp highlights' : scene.lightingType === 'diffused' ? 'Even fill active' : 'Subsurface active'
          const renderEst = `${Math.round(10 + scene.elements.length * 3 + (scene.backgroundType === 'ai' ? 4 : 0))}s`

          return (
            <div className="pp-scene-body" style={{ flex: 1, display: 'flex', overflow: 'hidden', background: 'var(--carbon)' }}>

              {/* ── Left: Editor Canvas ── */}
              <section className="pp-scene-left" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20, gap: 16, overflow: 'hidden' }}>

                {/* Preview Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18, color: 'var(--parchment)', letterSpacing: '-.02em', margin: 0 }}>Active Canvas</h2>
                    <p style={{ fontFamily: 'var(--font-ibm)', fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {scene.sceneType.charAt(0).toUpperCase() + scene.sceneType.slice(1)} · {scene.lightingType.charAt(0).toUpperCase() + scene.lightingType.slice(1)} lighting
                    </p>
                  </div>
                </div>

                {/* Main Preview Card — centered, constrained to a comfortable canvas size */}
                <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: 'var(--surface-2)', width: '100%', maxWidth: 340, aspectRatio: '4/5' }}>

                  {/* Base layer: real photo with CSS filters, or colored background fallback */}
                  {previewImageUrl ? (
                    <div style={{
                      position: 'absolute', inset: 0, filter: cssFilter, transition: 'filter 60ms, transform 120ms',
                      transform: `scale(${(scene.zoom ?? 100) / 100})`,
                      transformOrigin: 'center center',
                    }}>
                      <Image
                        src={previewImageUrl}
                        alt="Live preview"
                        fill
                        sizes="340px"
                        style={{ objectFit: 'cover' }}
                        priority
                      />
                    </div>
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, background: bgStyle, filter: cssFilter, transition: 'filter 60ms' }} />
                  )}

                  {/* Shadow layer — dark fill from opposite side of light, multiply blend */}
                  <div style={{ position: 'absolute', inset: 0, background: shadowGradient, mixBlendMode: 'multiply', transition: 'background 60ms', pointerEvents: 'none' }} />

                  {/* Diffuse light bloom from light direction, screen blend */}
                  <div style={{ position: 'absolute', inset: 0, background: lightGradient, mixBlendMode: 'screen', transition: 'background 60ms', pointerEvents: 'none' }} />

                  {/* Specular highlight — tight bright spot */}
                  <div style={{ position: 'absolute', inset: 0, background: specularGradient, mixBlendMode: 'screen', transition: 'background 60ms', pointerEvents: 'none' }} />

                  {/* Temperature tint */}
                  {tintColor !== 'transparent' && (
                    <div style={{ position: 'absolute', inset: 0, background: tintColor, mixBlendMode: 'color', opacity: 0.5, transition: 'background 60ms', pointerEvents: 'none' }} />
                  )}

                  {/* Subtle inner border */}
                  <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(255,255,255,0.04)', borderRadius: 16, pointerEvents: 'none' }} />

                  {/* Preview source pill — top left */}
                  {previewSourceLabel && (
                    <div style={{ position: 'absolute', top: 12, left: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', padding: '4px 9px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 10, color: 'var(--muted)' }}>photo_camera</span>
                        <span style={{ fontSize: 9, fontFamily: 'var(--font-ibm)', fontWeight: 600, letterSpacing: '.08em', color: 'var(--muted)', textTransform: 'uppercase' }}>{previewSourceLabel}</span>
                      </div>
                    </div>
                  )}

                  {/* No-image placeholder */}
                  {!previewImageUrl && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <div style={{ textAlign: 'center', opacity: 0.3 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>camera_enhance</span>
                        <span style={{ fontSize: 10, fontFamily: 'var(--font-ibm)', color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Generate a photo to preview here</span>
                      </div>
                    </div>
                  )}

                  {/* Bottom caption */}
                  <div style={{ position: 'absolute', bottom: 48, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: 'rgba(255,255,255,0.15)', fontFamily: 'var(--font-ibm)', letterSpacing: '.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                    {previewImageUrl ? 'live filter preview · geometry re-rendered on generate' : 'approximate preview · real render may vary'}
                  </div>

                  {/* Viewport Controls */}
                  <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(17,16,9,0.65)', backdropFilter: 'blur(16px)', padding: '4px 8px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.07)' }}>
                    <button className="scene-ctrl-btn" title="Zoom in"><span className="material-symbols-outlined" style={{ fontSize: 16 }}>zoom_in</span></button>
                    <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.07)', margin: '0 2px' }} />
                    <button className="scene-ctrl-btn" title="Grid"><span className="material-symbols-outlined" style={{ fontSize: 16 }}>grid_4x4</span></button>
                    <button className="scene-ctrl-btn" title="Flip"><span className="material-symbols-outlined" style={{ fontSize: 16 }}>flip</span></button>
                    <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.07)', margin: '0 2px' }} />
                    <button className="scene-ctrl-btn" title="Reset view"><span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span></button>
                  </div>
                </div>
                </div>

                {/* Quick Insights Bento */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, flexShrink: 0 }}>
                  <MetricCard label="Luminance Balance" value={`${luminance}%`} trend="Optimized" icon="flare" />
                  <MetricCard label="Texture Detail" value={textureDetail} sub={textureSub} icon="texture" />
                  <MetricCard label="Render Est." value={renderEst} sub="Cloud Compute v2" icon="timer" />
                </div>
              </section>

              {/* ── Right: Control Sidebar ── */}
              <aside className="pp-scene-sidebar" style={{ width: 370, flexShrink: 0, background: 'var(--surface)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Sidebar Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--surface)' }}>
                  <button
                    className="scene-sidebar-tab"
                    onClick={() => setSceneTab('settings')}
                    style={{ color: sceneTab === 'settings' ? 'var(--candle)' : 'var(--muted)', borderBottom: sceneTab === 'settings' ? '2px solid var(--candle)' : '2px solid transparent' }}
                  >
                    Global Settings
                  </button>
                  <button
                    className="scene-sidebar-tab"
                    onClick={() => setSceneTab('advanced')}
                    style={{ color: sceneTab === 'advanced' ? 'var(--candle)' : 'var(--muted)', borderBottom: sceneTab === 'advanced' ? '2px solid var(--candle)' : '2px solid transparent' }}
                  >
                    Advanced Nodes
                  </button>
                </div>

                {/* Scrollable Settings */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 28, paddingBottom: 100 }} className="custom-scrollbar">

                  {sceneTab === 'settings' && (
                    <>
                      {/* ── Lighting ── */}
                      <div>
                        <SidebarSectionLabel>Lighting</SidebarSectionLabel>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                          {/* Intensity */}
                          <Slider label="Intensity" min={0} max={100} value={scene.lightingIntensity} onChange={v => setS('lightingIntensity', v)} unit="%" />

                          {/* Light Type */}
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 9 }}>Light Type</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
                              {([
                                { value: 'soft',     label: 'Softbox' },
                                { value: 'hard',     label: 'Spotlight' },
                                { value: 'diffused', label: 'Ambient' },
                              ] as const).map(o => (
                                <button
                                  key={o.value}
                                  onClick={() => setS('lightingType', o.value)}
                                  style={{
                                    padding: '8px 4px', borderRadius: 8, fontFamily: 'var(--font-ibm)', fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all 120ms',
                                    border: scene.lightingType === o.value ? '1px solid rgba(212,168,75,.4)' : '1px solid var(--border)',
                                    background: scene.lightingType === o.value ? 'rgba(212,168,75,.12)' : 'var(--surface-2)',
                                    color: scene.lightingType === o.value ? 'var(--candle)' : 'var(--muted)',
                                  }}
                                >{o.label}</button>
                              ))}
                            </div>
                          </div>

                          {/* Direction radial picker */}
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 9 }}>Direction</div>
                            <RadialDirectionPicker value={scene.lightingDirection} onChange={v => setS('lightingDirection', v)} />
                          </div>
                        </div>
                      </div>

                      {/* Separator */}
                      <div style={{ height: 1, background: 'var(--border)' }} />

                      {/* ── Color & Tone ── */}
                      <div>
                        <SidebarSectionLabel>Color &amp; Tone</SidebarSectionLabel>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                          {/* Temperature gradient bar */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                              <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase' }}>Temperature</span>
                              <span style={{ fontSize: 10, color: 'var(--parchment)', fontFamily: 'var(--font-ibm)' }}>{tempLabel(scene.colorTemperature)}</span>
                            </div>
                            <div style={{ position: 'relative', height: 6, borderRadius: 3, background: 'linear-gradient(to right, #4d8cd9, #e8e0d0, #d47c2a)', marginBottom: 6 }}>
                              <input type="range" min={-100} max={100} value={scene.colorTemperature} onChange={e => setS('colorTemperature', Number(e.target.value))}
                                style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', height: 6, margin: 0 }} />
                              <div style={{
                                position: 'absolute', top: '50%', left: `${((scene.colorTemperature + 100) / 200) * 100}%`,
                                width: 14, height: 14, borderRadius: '50%', background: 'white', border: '2px solid var(--candle)',
                                transform: 'translate(-50%, -50%)', pointerEvents: 'none', boxShadow: '0 0 6px rgba(212,168,75,.4)',
                              }} />
                            </div>
                          </div>

                          {/* Exposure */}
                          <Slider label="Exposure" min={-100} max={100} value={scene.exposure} onChange={v => setS('exposure', v)} zero="Correct" />

                          {/* Color Palette */}
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 9 }}>Scene Colors</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ display: 'flex', gap: 7 }}>
                                {scene.backgroundType === 'gradient' ? (
                                  <>
                                    <input type="color" value={scene.backgroundGradientFrom} onChange={e => setS('backgroundGradientFrom', e.target.value)}
                                      style={{ width: 26, height: 26, borderRadius: '50%', border: '2px solid var(--border)', cursor: 'pointer', padding: 0, background: 'none' }} title="Gradient from" />
                                    <input type="color" value={scene.backgroundGradientTo} onChange={e => setS('backgroundGradientTo', e.target.value)}
                                      style={{ width: 26, height: 26, borderRadius: '50%', border: '2px solid var(--border)', cursor: 'pointer', padding: 0, background: 'none' }} title="Gradient to" />
                                  </>
                                ) : (
                                  <input type="color" value={scene.backgroundColor} onChange={e => setS('backgroundColor', e.target.value)}
                                    style={{ width: 26, height: 26, borderRadius: '50%', border: '2px solid var(--border)', cursor: 'pointer', padding: 0, background: 'none' }} title="Background color" />
                                )}
                                <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#1c1c19', border: '2px solid var(--border)' }} />
                                <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#7b580d', border: '2px solid var(--border)' }} />
                              </div>
                              <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', letterSpacing: '.05em' }}>{scene.backgroundColor}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Separator */}
                      <div style={{ height: 1, background: 'var(--border)' }} />

                      {/* ── Composition ── */}
                      <div>
                        <SidebarSectionLabel>Composition</SidebarSectionLabel>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                          {/* Portrait mode card */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--muted)' }}>aspect_ratio</span>
                              <div>
                                <div style={{ fontSize: 11, fontFamily: 'var(--font-ibm)', fontWeight: 600, color: 'var(--parchment)' }}>Portrait Mode</div>
                                <div style={{ fontSize: 9, fontFamily: 'var(--font-ibm)', color: 'var(--muted)', letterSpacing: '.05em', textTransform: 'uppercase', marginTop: 2 }}>4:5 ratio (Socials)</div>
                              </div>
                            </div>
                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--candle)', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          </div>

                          {/* Focal length = zoom slider */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                              <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase' }}>Focal Length</span>
                              <span style={{ fontSize: 10, color: 'var(--parchment)', fontFamily: 'var(--font-ibm)' }}>
                                {scene.zoom <= 65 ? '14mm' : scene.zoom <= 80 ? '35mm' : scene.zoom <= 100 ? '50mm' : scene.zoom <= 125 ? '85mm' : '200mm'} (Prime)
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, padding: '0 2px' }}>
                              {['14mm','35mm','50mm','85mm','200mm'].map(f => {
                                const active = (f === '14mm' && scene.zoom <= 65) || (f === '35mm' && scene.zoom > 65 && scene.zoom <= 80) || (f === '50mm' && scene.zoom > 80 && scene.zoom <= 100) || (f === '85mm' && scene.zoom > 100 && scene.zoom <= 125) || (f === '200mm' && scene.zoom > 125)
                                return <span key={f} style={{ fontSize: 8, fontFamily: 'var(--font-ibm)', fontWeight: 700, color: active ? 'var(--candle)' : '#6b6050', letterSpacing: '.03em' }}>{f}</span>
                              })}
                            </div>
                            <Slider label="" min={50} max={150} value={scene.zoom} onChange={v => setS('zoom', v)} unit="%" />
                          </div>

                          {/* View Angle */}
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 9 }}>View Angle</div>
                            <PillGroup
                              options={[{ value: 'front', label: 'Front' }, { value: 'three-quarter', label: '¾ Turn' }, { value: 'side', label: 'Side' }, { value: 'top', label: 'Top' }, { value: 'low', label: 'Low' }]}
                              value={scene.viewAngle}
                              onChange={v => setS('viewAngle', v)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Separator */}
                      <div style={{ height: 1, background: 'var(--border)' }} />

                      {/* ── Scene Elements ── */}
                      <div>
                        <SidebarSectionLabel>Scene Elements</SidebarSectionLabel>
                        <div style={{ display: 'flex', gap: 7, marginBottom: 10 }}>
                          <input
                            type="text"
                            value={elementInput}
                            onChange={e => setElementInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addElement(elementInput) } }}
                            placeholder="e.g. coffee beans falling down…"
                            style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 11px', color: 'var(--parchment)', fontFamily: 'var(--font-ibm)', fontSize: 12, outline: 'none', transition: 'border-color 120ms' }}
                            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(212,168,75,.4)')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                          />
                          <button
                            onClick={() => addElement(elementInput)}
                            style={{ padding: '8px 12px', borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--parchment)', fontFamily: 'var(--font-ibm)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 120ms', flexShrink: 0 }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,168,75,.4)'; e.currentTarget.style.color = 'var(--candle)' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--parchment)' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                          {scene.elements.length === 0 && (
                            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontStyle: 'italic' }}>No elements added yet</span>
                          )}
                          {scene.elements.map(el => (
                            <span key={el.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 9999, background: 'rgba(47,21,0,0.6)', border: '1px solid rgba(110,57,0,.4)', color: '#ffb77d', fontFamily: 'var(--font-ibm)', fontSize: 10, fontWeight: 700 }}>
                              {el.name}
                              <button onClick={() => removeElement(el.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,183,125,.5)', padding: 0, display: 'flex', lineHeight: 1 }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#E07070')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,183,125,.5)')}>
                                <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {sceneTab === 'advanced' && (
                    <>
                      {/* ── Scene / Environment ── */}
                      <div>
                        <SidebarSectionLabel>Scene / Environment</SidebarSectionLabel>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>Scene Type</div>
                            <PillGroup
                              options={[{ value: 'studio', label: 'Studio' }, { value: 'outdoor', label: 'Outdoor' }, { value: 'interior', label: 'Interior' }, { value: 'custom', label: 'Custom' }]}
                              value={scene.sceneType}
                              onChange={v => setS('sceneType', v)}
                            />
                            {scene.sceneType === 'custom' && (
                              <input
                                type="text" placeholder="Describe your scene environment…" value={scene.sceneCustom}
                                onChange={e => setS('sceneCustom', e.target.value)}
                                style={{ marginTop: 9, width: '100%', boxSizing: 'border-box', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 11px', color: 'var(--parchment)', fontFamily: 'var(--font-ibm)', fontSize: 12, outline: 'none' }}
                                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(212,168,75,.4)')}
                                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                              />
                            )}
                          </div>

                          <div>
                            <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>Background</div>
                            <PillGroup
                              options={[{ value: 'color', label: 'Solid' }, { value: 'gradient', label: 'Gradient' }, { value: 'photo', label: 'Photo' }, { value: 'ai', label: 'AI Prompt' }]}
                              value={scene.backgroundType}
                              onChange={v => setS('backgroundType', v)}
                            />
                            {scene.backgroundType === 'photo' && (
                              <div style={{ marginTop: 12 }}>
                                {brandAssets.filter(a => a.type === 'place_photo' || a.type === 'photo').length === 0 ? (
                                  <div style={{ padding: '10px 12px', borderRadius: 7, background: 'rgba(212,168,75,.04)', border: '1px solid rgba(212,168,75,.1)', fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-ibm)' }}>
                                    No scene photos in Brand Brain. Upload some to use as backgrounds.
                                  </div>
                                ) : (
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
                                    {brandAssets.filter(a => a.type === 'place_photo' || a.type === 'photo').map(a => (
                                      <div key={a.id} onClick={() => { setS('backgroundPhotoUrl', a.public_url); setS('backgroundPhotoName', a.name ?? '') }}
                                        style={{ position: 'relative', aspectRatio: '1', borderRadius: 7, overflow: 'hidden', cursor: 'pointer', border: scene.backgroundPhotoUrl === a.public_url ? '2px solid var(--candle)' : '2px solid transparent', transition: 'border-color 120ms' }}>
                                        <Image src={a.public_url} alt={a.name || ''} fill sizes="80px" style={{ objectFit: 'cover' }} />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            {scene.backgroundType === 'ai' && (
                              <textarea rows={2} placeholder="Describe the background… e.g. misty forest floor with golden light rays"
                                value={scene.backgroundAiPrompt} onChange={e => setS('backgroundAiPrompt', e.target.value)}
                                style={{ marginTop: 9, width: '100%', boxSizing: 'border-box', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 11px', color: 'var(--parchment)', fontFamily: 'var(--font-ibm)', fontSize: 12, outline: 'none', resize: 'vertical' }}
                                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(212,168,75,.4)')}
                                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ height: 1, background: 'var(--border)' }} />

                      {/* ── Color detail ── */}
                      <div>
                        <SidebarSectionLabel>Color Detail</SidebarSectionLabel>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                          <Slider label="Saturation" min={-100} max={100} value={scene.saturation} onChange={v => setS('saturation', v)} zero="Natural" />
                          <Slider label="Contrast"   min={-100} max={100} value={scene.contrast}   onChange={v => setS('contrast', v)}   zero="Balanced" />
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => { setS('colorTemperature', 0); setS('saturation', 0); setS('contrast', 0); setS('exposure', 0) }}
                              style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 0', letterSpacing: '.05em' }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'var(--parchment)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
                              Reset to neutral
                            </button>
                          </div>
                        </div>
                      </div>

                      <div style={{ height: 1, background: 'var(--border)' }} />

                      {/* ── Product Position ── */}
                      <div>
                        <SidebarSectionLabel>Product Position</SidebarSectionLabel>
                        <PillGroup
                          options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]}
                          value={scene.productPosition}
                          onChange={v => setS('productPosition', v)}
                        />
                      </div>

                      <div style={{ height: 1, background: 'var(--border)' }} />

                      {/* ── Custom Prompt ── */}
                      <div>
                        <SidebarSectionLabel>Custom Prompt</SidebarSectionLabel>
                        <textarea
                          rows={5}
                          placeholder="Add specific instructions for the AI… e.g. 'soft morning light, dewy surface, Scandinavian minimalism'"
                          value={scene.customPrompt}
                          onChange={e => setS('customPrompt', e.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--parchment)', fontFamily: 'var(--font-ibm)', fontSize: 12, outline: 'none', resize: 'vertical', lineHeight: 1.6 }}
                          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(212,168,75,.4)')}
                          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                        />
                        <div style={{ marginTop: 6, fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', lineHeight: 1.5 }}>
                          Combined with all scene settings. Use for details sliders can&apos;t capture.
                        </div>
                      </div>

                    </>
                  )}
                </div>

                {/* Footer CTA */}
                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0, display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setScene(DEFAULT_SCENE)}
                    style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--parchment)', fontFamily: 'var(--font-ibm)', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 120ms' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,168,75,.25)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface-2)' }}
                  >
                    Reset All
                  </button>
                  <button
                    onClick={() => setShowModal(true)}
                    style={{ flex: 2, padding: '11px', borderRadius: 9999, background: 'var(--candle)', border: 'none', color: '#ffffff', fontFamily: 'var(--font-syne)', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--ember)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--candle)' }}
                  >
                    Apply &amp; Generate
                  </button>
                </div>
              </aside>
            </div>
          )
        })()}
      </div>

      {captionGenerating && <CaptionGeneratingOverlay step={captionStep} />}
      {captionResult && (
        <CaptionResultModal
          caption={captionResult.caption}
          hashtags={captionResult.hashtags}
          onClose={() => setCaptionResult(null)}
          onRetry={() => { setCaptionResult(null); if (captionPhotoRef.current) handleGenerateCaption(captionPhotoRef.current) }}
        />
      )}
      {captionError && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 400,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(12,11,6,0.75)', backdropFilter: 'blur(8px)',
        }} onClick={() => setCaptionError(null)}>
          <div style={{
            background: 'var(--surface)', border: '1px solid rgba(224,112,112,0.3)',
            borderRadius: 14, padding: '28px 32px', maxWidth: 400, textAlign: 'center',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#E07070' }}>error</span>
            <div style={{ fontSize: 13, color: 'var(--parchment)', fontFamily: 'var(--font-ibm)', lineHeight: 1.6 }}>{captionError}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setCaptionError(null); if (captionPhotoRef.current) handleGenerateCaption(captionPhotoRef.current) }}
                style={{ flex: 1, padding: '9px', borderRadius: 9999, background: 'var(--candle)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-syne)', cursor: 'pointer' }}
              >Try again</button>
              <button
                onClick={() => setCaptionError(null)}
                style={{ flex: 1, padding: '9px', borderRadius: 9999, background: 'none', border: '1px solid var(--border)', color: 'var(--sand)', fontSize: 12, fontFamily: 'var(--font-ibm)', cursor: 'pointer' }}
              >Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Canvas Editor ── */}
      {editingPhoto?.image_url && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'var(--carbon)' }}>
          <CanvasEditor
            templateJson={editingPhoto.canvas_json ?? buildEditorJson(editingPhoto)}
            withExport
            onSave={handlePhotoEditorSave}
            onCancel={() => setEditingPhoto(null)}
          />
          {editorSaving && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(17,16,9,0.7)', pointerEvents: 'all' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 20px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--candle)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <span style={{ color: 'var(--parchment)', fontSize: 13, fontFamily: 'var(--font-ibm)' }}>Saving…</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Generate Modal ── */}
      {showModal && (
        <GenerateProductPhotoModal
          brandAssets={brandAssets}
          sceneSettings={scene}
          onGenerate={handleModalGenerate}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
