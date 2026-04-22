'use client'
import { useCallback, useRef, useState } from 'react'
import { CaptionGeneratingOverlay, CaptionResultModal } from './CaptionModal'

type Stage = 'upload' | 'generating' | 'result'

const GENERATING_STEPS = ['Analyzing image…', 'Writing caption…']

export function CaptionGeneratorClient() {
  const [stage, setStage] = useState<Stage>('upload')
  const [generatingStep, setGeneratingStep] = useState(GENERATING_STEPS[0])
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ caption: string; hashtags: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) { setError('Only image files are supported.'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setError(null)
    setUploadedUrl(null)
  }, [])

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  async function generate(existingUrl?: string) {
    setError(null)
    setStage('generating')
    setGeneratingStep(GENERATING_STEPS[0])

    let imageUrl = existingUrl || uploadedUrl

    // Upload if we don't have a URL yet
    if (!imageUrl && file) {
      try {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/brand-brain/assets/upload', { method: 'POST', body: fd })
        if (!res.ok) throw new Error('Upload failed')
        const data = await res.json()
        imageUrl = data.public_url
        setUploadedUrl(imageUrl!)
      } catch {
        setError('Failed to upload image. Please try again.')
        setStage('upload')
        return
      }
    }

    if (!imageUrl) { setError('No image selected.'); setStage('upload'); return }

    setGeneratingStep(GENERATING_STEPS[1])

    try {
      const res = await fetch('/api/generate/caption-only', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Generation failed')
      }
      const data = await res.json()
      setResult(data)
      setStage('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setStage('upload')
    }
  }

  function retry() {
    setResult(null)
    setStage('upload')
    // Keep file + preview + uploadedUrl so user can regenerate immediately
    generate(uploadedUrl || undefined)
  }

  function closeResult() {
    setResult(null)
    setStage('upload')
  }

  return (
    <div className="cg-outer" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`
        .cg-drop:hover { border-color: rgba(182,141,64,0.4) !important; }
        .cg-drop.drag-over { border-color: var(--candle) !important; background: rgba(182,141,64,0.04) !important; }
        @media (max-width: 767px) { .cg-outer { height: auto !important; } }
      `}</style>

      {/* Topbar */}
      <div style={{
        borderBottom: '1px solid rgba(78,69,56,0.25)',
        padding: '24px 32px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        flexShrink: 0, background: 'var(--carbon)',
      }}>
        <div>
          <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--candle)', fontWeight: 600 }}>AI Writing Tools</span>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: 32, fontWeight: 800, color: 'var(--parchment)', letterSpacing: '-0.03em', lineHeight: 1.1, marginTop: 4, marginBottom: 0 }}>
            Caption Generator
          </h1>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '40px 48px', maxWidth: 640, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

      {/* Upload area */}
      <div
        className={`cg-drop${dragOver ? ' drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !preview && inputRef.current?.click()}
        style={{
          border: '1.5px dashed var(--border)',
          borderRadius: 14,
          minHeight: preview ? 'auto' : 220,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          cursor: preview ? 'default' : 'pointer',
          transition: 'border-color 0.2s, background 0.2s',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />

        {preview ? (
          <div style={{ width: '100%', position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Preview"
              style={{ width: '100%', maxHeight: 360, objectFit: 'contain', display: 'block', borderRadius: 12 }}
            />
            <button
              onClick={e => { e.stopPropagation(); setPreview(null); setFile(null); setUploadedUrl(null); setError(null) }}
              style={{
                position: 'absolute', top: 10, right: 10,
                background: 'rgba(14,14,13,0.7)', border: '1px solid var(--border)',
                borderRadius: '50%', width: 28, height: 28, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--sand)', backdropFilter: 'blur(4px)',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--parchment)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--sand)')}
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '40px 24px' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'rgba(182,141,64,0.08)', border: '1px solid rgba(182,141,64,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--candle)' }}>upload</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--parchment)', marginBottom: 4 }}>
                Drop an image here
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                or click to browse — JPEG, PNG, WebP
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          marginTop: 14, padding: '10px 14px', borderRadius: 8,
          background: 'rgba(220,80,80,0.08)', border: '1px solid rgba(220,80,80,0.2)',
          fontSize: 12, color: '#e07070', fontFamily: 'var(--font-ibm)',
        }}>
          {error}
        </div>
      )}

      {/* Generate button */}
      {preview && (
        <button
          onClick={() => generate()}
          style={{
            marginTop: 20, width: '100%', padding: '13px 0', borderRadius: 9999,
            background: 'var(--candle)', border: 'none',
            color: '#fff', fontSize: 14, fontWeight: 700,
            fontFamily: 'var(--font-syne)', cursor: 'pointer',
            transition: 'background 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--ember)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--candle)')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_awesome</span>
          Generate Caption
        </button>
      )}

      </div>

      {stage === 'generating' && <CaptionGeneratingOverlay step={generatingStep} />}

      {stage === 'result' && result && (
        <CaptionResultModal
          caption={result.caption}
          hashtags={result.hashtags}
          onClose={closeResult}
          onRetry={retry}
        />
      )}
    </div>
  )
}
