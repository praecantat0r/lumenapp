'use client'
import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'

const CanvasEditor = dynamic(
  () => import('@/components/canvas/CanvasEditor').then(m => m.CanvasEditor),
  { ssr: false }
)

type Phase = 'upload' | 'uploading' | 'editing' | 'saving'

function buildCanvasJson(imageUrl: string, imgW: number, imgH: number) {
  const canvasW = 1080
  const canvasH = 1350
  const scale = Math.min(canvasW / imgW, canvasH / imgH)
  const left = (canvasW - imgW * scale) / 2
  const top = (canvasH - imgH * scale) / 2
  return {
    version: '5.3.0',
    objects: [
      {
        type: 'image',
        version: '5.3.0',
        originX: 'left',
        originY: 'top',
        left,
        top,
        width: imgW,
        height: imgH,
        scaleX: scale,
        scaleY: scale,
        angle: 0,
        opacity: 1,
        src: imageUrl,
        crossOrigin: 'anonymous',
        selectable: true,
        evented: true,
        lockMovementX: false,
        lockMovementY: false,
      },
    ],
    background: '#111009',
  }
}

export function EditorClient() {
  const [phase, setPhase] = useState<Phase>('upload')
  const [canvasJson, setCanvasJson] = useState<any>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const loadImageDimensions = (url: string): Promise<{ w: number; h: number }> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
      img.onerror = reject
      img.src = url
    })

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file.')
      return
    }
    setPhase('uploading')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      if (!res.ok) throw new Error('Upload failed')
      const { publicUrl } = await res.json()
      const { w, h } = await loadImageDimensions(publicUrl)
      setCanvasJson(buildCanvasJson(publicUrl, w, h))
      setPhase('editing')
    } catch {
      toast.error('Failed to upload image. Please try again.')
      setPhase('upload')
    }
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ''
  }, [uploadFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }, [uploadFile])

  const handleSave = useCallback(async (savedJson: any, exportedDataUrl?: string) => {
    if (!exportedDataUrl) {
      toast.error('No exported image data.')
      return
    }
    setPhase('saving')
    try {
      // Compress the PNG export to JPEG — PNG at 1080×1350 can be 10+ MB;
      // drawing onto a canvas and re-exporting as JPEG at 85% quality cuts it
      // to ~0.5–2 MB, well within upload limits.
      const compressed = await new Promise<Blob>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const cvs = document.createElement('canvas')
          cvs.width = img.naturalWidth
          cvs.height = img.naturalHeight
          const ctx = cvs.getContext('2d')
          if (!ctx) { reject(new Error('Canvas context unavailable')); return }
          ctx.drawImage(img, 0, 0)
          cvs.toBlob(b => b ? resolve(b) : reject(new Error('Compression failed')), 'image/jpeg', 0.88)
        }
        img.onerror = () => reject(new Error('Image load failed'))
        img.src = exportedDataUrl
      })

      const imageFile = new File([compressed], `editor-${Date.now()}.jpg`, { type: 'image/jpeg' })
      const form = new FormData()
      form.append('file', imageFile)
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: form })
      if (!uploadRes.ok) {
        const body = await uploadRes.json().catch(() => ({}))
        throw new Error(body.error || `Upload failed (${uploadRes.status})`)
      }
      const { publicUrl } = await uploadRes.json()

      const postRes = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ render_url: publicUrl, canvas_json: savedJson, status: 'pending_review' }),
      })
      if (!postRes.ok) {
        const body = await postRes.json().catch(() => ({}))
        throw new Error(body.error || `Post creation failed (${postRes.status})`)
      }
      const { id } = await postRes.json()

      toast.success('Post saved!')
      router.push(`/dashboard/post/${id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Save failed: ${msg}`)
      setPhase('editing')
    }
  }, [router])

  if (phase === 'editing' || phase === 'saving') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'var(--carbon)' }}>
        {phase === 'saving' && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            background: 'rgba(17,16,9,0.85)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
          }}>
            <div style={{
              width: 36, height: 36, border: '3px solid rgba(182,141,64,0.2)',
              borderTopColor: 'var(--candle)', borderRadius: '50%',
              animation: 'ec-spin 0.8s linear infinite',
            }} />
            <span style={{ color: 'var(--sand)', fontFamily: 'var(--font-ibm)', fontSize: 14, fontWeight: 300 }}>
              Saving post…
            </span>
            <style>{`@keyframes ec-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        {canvasJson && (
          <CanvasEditor
            templateJson={canvasJson}
            withExport
            onSave={handleSave}
            onCancel={() => { setPhase('upload'); setCanvasJson(null) }}
          />
        )}
      </div>
    )
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32, minHeight: 0,
    }}>
      <style>{`
        @keyframes ec-spin { to { transform: rotate(360deg); } }
        .ec-dropzone {
          border: 1.5px dashed rgba(182,141,64,0.3);
          border-radius: 20px;
          transition: border-color 0.2s, background 0.2s;
          cursor: pointer;
        }
        .ec-dropzone:hover, .ec-dropzone.dragging {
          border-color: rgba(182,141,64,0.7);
          background: rgba(182,141,64,0.04);
        }
        .ec-upload-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 28px; border-radius: 9999px;
          background: var(--candle); color: #fff;
          font-family: var(--font-syne); font-weight: 700; font-size: 13px;
          letter-spacing: 0.04em; border: none; cursor: pointer;
          transition: background 0.2s, transform 0.1s;
        }
        .ec-upload-btn:hover { background: var(--ember); }
        .ec-upload-btn:active { transform: scale(0.97); }
      `}</style>

      <div
        className={`ec-dropzone${dragging ? ' dragging' : ''}`}
        style={{
          width: '100%', maxWidth: 520,
          padding: '64px 40px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
          textAlign: 'center',
        }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {phase === 'uploading' ? (
          <div style={{
            width: 44, height: 44, border: '3px solid rgba(182,141,64,0.2)',
            borderTopColor: 'var(--candle)', borderRadius: '50%',
            animation: 'ec-spin 0.8s linear infinite',
          }} />
        ) : (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(182,141,64,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{
                fontSize: 32, color: 'var(--candle)',
                fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 32",
              }}>add_photo_alternate</span>
            </div>

            <div>
              <div style={{
                fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 20,
                color: 'var(--parchment)', letterSpacing: '-0.02em', marginBottom: 8,
              }}>
                Upload a Photo
              </div>
              <div style={{
                fontFamily: 'var(--font-ibm)', fontWeight: 300, fontSize: 13,
                color: 'var(--muted)', lineHeight: 1.6,
              }}>
                Drag & drop or click to browse.<br />
                Add text, stickers, and images on top.
              </div>
            </div>

            <button className="ec-upload-btn" onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>upload</span>
              Choose Photo
            </button>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  )
}
