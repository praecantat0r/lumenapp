'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'

const CanvasEditor = dynamic(
  () => import('@/components/canvas/CanvasEditor').then(m => m.CanvasEditor),
  { ssr: false }
)

const DEFAULT_CANVAS_JSON = {
  version: '5.3.0',
  background: '#111009',
  width: 1080,
  height: 1350,
  objects: [
    {
      type: 'rect',
      lumenId: 'background-image',
      left: 0, top: 0, width: 1080, height: 1350,
      fill: '#221F15', selectable: true,
    },
    {
      type: 'rect',
      lumenId: 'overlay',
      left: 0, top: 0, width: 1080, height: 1350,
      fill: 'rgba(0,0,0,0.35)', selectable: true,
    },
    {
      type: 'textbox', lumenId: 'brand-name',
      text: 'BRAND NAME', left: 60, top: 60, width: 400,
      fontSize: 28, fontFamily: 'IBM Plex Sans', fill: 'rgba(246,242,234,0.6)',
      fontWeight: '300', letterSpacing: 8, selectable: true,
    },
    {
      type: 'textbox', lumenId: 'title',
      text: 'Your Headline Here', left: 60, top: 900, width: 900,
      fontSize: 96, fontFamily: 'Syne', fontWeight: '700',
      fill: '#F6F2EA', lineHeight: 1.1, selectable: true,
    },
    {
      type: 'textbox', lumenId: 'subtitle',
      text: 'Supporting line of text', left: 60, top: 1080, width: 900,
      fontSize: 44, fontFamily: 'IBM Plex Sans', fontWeight: '300',
      fill: 'rgba(246,242,234,0.75)', selectable: true,
    },
    {
      type: 'textbox', lumenId: 'cta',
      text: 'Shop Now →', left: 60, top: 1200, width: 400,
      fontSize: 36, fontFamily: 'Syne', fontWeight: '600',
      fill: '#D4A84B', selectable: true,
    },
  ],
}

interface Template {
  id: string
  name: string
  description?: string
  thumbnail_url?: string
  canvas_json: any
  is_active: boolean
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates]       = useState<Template[]>([])
  const [loading, setLoading]           = useState(true)
  const [editorOpen, setEditorOpen]     = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [newName, setNewName]           = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [saving, setSaving]             = useState(false)
  const [fixing, setFixing]             = useState(false)
  const [deleting, setDeleting]         = useState<string | null>(null)
  const [mounted, setMounted]           = useState(false)

  useEffect(() => { setMounted(true); loadTemplates() }, [])

  async function fixRenders() {
    setFixing(true)
    try {
      const res  = await fetch('/api/admin/fix-renders', { method: 'POST' })
      const data = await res.json()
      alert(`Fixed ${data.fixed} / ${data.total} posts.${data.errors?.length ? '\nErrors:\n' + data.errors.join('\n') : ''}`)
      await loadTemplates()
    } catch (err) {
      alert('Fix failed: ' + String(err))
    } finally {
      setFixing(false)
    }
  }

  async function deleteTemplate(t: Template, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Delete "${t.name}"? This cannot be undone.`)) return
    setDeleting(t.id)
    try {
      const res = await fetch(`/api/templates/${t.id}`, { method: 'DELETE' })
      if (!res.ok) { alert('Delete failed: ' + (await res.json()).error); return }
      await loadTemplates()
    } finally {
      setDeleting(null)
    }
  }

  async function loadTemplates() {
    setLoading(true)
    const res = await fetch('/api/templates', { cache: 'no-store' })
    const data = await res.json()
    setTemplates(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  function openNew() {
    setEditingTemplate(null)
    setNewName('')
    setNewDescription('')
    setEditorOpen(true)
  }

  async function openEdit(t: Template) {
    const res  = await fetch(`/api/templates/${t.id}`)
    const full = await res.json()
    setEditingTemplate(full)
    setNewName(full.name)
    setNewDescription(full.description || '')
    setEditorOpen(true)
  }

  async function handleEditorSave(canvasJson: any) {
    if (!newName.trim()) { alert('Please enter a template name before saving.'); return }
    setSaving(true)
    try {
      let savedId: string | null = null
      if (editingTemplate) {
        const res = await fetch(`/api/templates/${editingTemplate.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName, description: newDescription, canvas_json: canvasJson }),
        })
        if (!res.ok) { alert('Save failed: ' + (await res.json()).error); return }
        savedId = editingTemplate.id
      } else {
        const res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName, description: newDescription, canvas_json: canvasJson, width: 1080, height: 1350, category: 'instagram' }),
        })
        if (!res.ok) { alert('Save failed: ' + (await res.json()).error); return }
        const created = await res.json()
        savedId = created.id
      }
      if (savedId && !editingTemplate) {
        fetch('/api/admin/thumbnail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template_id: savedId }),
        }).catch(e => console.warn('[thumbnail] failed:', e))
      }
      setEditorOpen(false)
      await loadTemplates()
    } finally {
      setSaving(false)
    }
  }

  const templateJson = editingTemplate?.canvas_json || DEFAULT_CANVAS_JSON

  /* ── Canvas editor — portaled to document.body so position:fixed is
     relative to the viewport, not the transformed DashboardShell main ── */
  const editorPortal = mounted && editorOpen ? createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'var(--carbon)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 24px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
        <button
          onClick={() => setEditorOpen(false)}
          title="Back to templates"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--sand)', padding: '6px 12px', borderRadius: 6,
            cursor: 'pointer', fontFamily: 'var(--font-ibm)', fontSize: 12,
            flexShrink: 0, transition: 'border-color .15s, color .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sand)'; e.currentTarget.style.color = 'var(--parchment)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--sand)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />
        <input
          placeholder="Template name *"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--parchment)', padding: '6px 12px', borderRadius: 6, fontFamily: 'var(--font-ibm)', fontSize: 13, width: 220, outline: 'none' }}
        />
        <input
          placeholder="Description (optional)"
          value={newDescription}
          onChange={e => setNewDescription(e.target.value)}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--parchment)', padding: '6px 12px', borderRadius: 6, fontFamily: 'var(--font-ibm)', fontSize: 13, width: 300, outline: 'none' }}
        />
        {saving && (
          <span style={{ color: 'var(--candle)', fontFamily: 'var(--font-ibm)', fontSize: 13 }}>Saving...</span>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <CanvasEditor
          templateJson={templateJson}
          onSave={handleEditorSave}
          onCancel={() => setEditorOpen(false)}
        />
      </div>
    </div>,
    document.body
  ) : null

  /* ── Template list ── */
  return (
    <>
      {editorPortal}
    <div style={{ padding: '32px 36px', flex: 1, overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 24, color: 'var(--parchment)', letterSpacing: '-.02em' }}>
            Templates
          </h1>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', marginTop: 3 }}>
            {templates.length} template{templates.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={openNew} style={{
            background: '#D4A84B', color: '#ffffff', border: 'none',
            padding: '8px 20px', borderRadius: 7, cursor: 'pointer',
            fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 13,
          }}
            onMouseEnter={e => (e.currentTarget.style.background = '#c4983d')}
            onMouseLeave={e => (e.currentTarget.style.background = '#D4A84B')}
          >
            + New Template
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--sand)', fontFamily: 'var(--font-ibm)', fontSize: 13, padding: '40px 0' }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="12 38" style={{ animation: 'adm-spin 1.4s linear infinite', transformOrigin: '10px 10px' }}/>
          </svg>
          Loading templates…
          <style>{`@keyframes adm-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : templates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 12 }}>
          No templates yet. Click &quot;New Template&quot; to create your first one.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
          {templates.map(t => (
            <div
              key={t.id}
              onClick={() => openEdit(t)}
              style={{
                cursor: 'pointer', borderRadius: 12, overflow: 'hidden',
                border: '1px solid var(--border)', background: 'var(--surface)',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(212,168,75,.3)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              {t.thumbnail_url ? (
                <div style={{ width: '100%', aspectRatio: '4/5', overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.thumbnail_url} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              ) : (
                <div style={{
                  width: '100%', aspectRatio: '4/5', background: 'var(--surface-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--muted)', fontSize: 12, fontFamily: 'var(--font-ibm)',
                }}>
                  No preview
                </div>
              )}
              <div style={{ padding: '11px 13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--parchment)', fontFamily: 'var(--font-syne)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', marginTop: 3 }}>
                    Click to edit
                  </div>
                </div>
                <button
                  onClick={e => deleteTemplate(t, e)}
                  disabled={deleting === t.id}
                  title="Delete template"
                  style={{
                    flexShrink: 0, background: 'transparent',
                    border: '1px solid rgba(192,57,43,.25)',
                    color: 'rgba(192,57,43,.65)', borderRadius: 6, padding: '4px 8px',
                    cursor: deleting === t.id ? 'not-allowed' : 'pointer',
                    fontSize: 11, fontFamily: 'var(--font-ibm)', opacity: deleting === t.id ? 0.5 : 1,
                  }}
                  onMouseEnter={e => { if (deleting !== t.id) e.currentTarget.style.borderColor = 'rgba(192,57,43,.6)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(192,57,43,.25)' }}
                >
                  {deleting === t.id ? '…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  )
}
