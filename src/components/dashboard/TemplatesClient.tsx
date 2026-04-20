'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'

const CanvasEditor = dynamic(
  () => import('@/components/canvas/CanvasEditor').then(m => m.CanvasEditor),
  { ssr: false }
)

const SEED_CANVAS = {
  version: '5.3.0',
  background: '#111009',
  width: 1080,
  height: 1350,
  objects: [
    { type: 'rect', lumenId: 'background-image', left: 0, top: 0, width: 1080, height: 1350, fill: '#221F15', selectable: true },
    { type: 'rect', lumenId: 'overlay', left: 0, top: 0, width: 1080, height: 1350, fill: 'rgba(0,0,0,0.35)', selectable: true },
    { type: 'textbox', lumenId: 'brand-name', text: 'BRAND NAME', left: 60, top: 60, width: 400, fontSize: 28, fontFamily: 'IBM Plex Sans', fill: 'rgba(246,242,234,0.6)', fontWeight: '300', charSpacing: 8, selectable: true },
    { type: 'textbox', lumenId: 'title', text: 'Your Headline Here', left: 60, top: 900, width: 900, fontSize: 96, fontFamily: 'Syne', fontWeight: '700', fill: '#F6F2EA', lineHeight: 1.1, selectable: true },
    { type: 'textbox', lumenId: 'subtitle', text: 'Supporting line of text', left: 60, top: 1080, width: 900, fontSize: 44, fontFamily: 'IBM Plex Sans', fontWeight: '300', fill: 'rgba(246,242,234,0.75)', selectable: true },
    { type: 'textbox', lumenId: 'cta', text: 'Shop Now →', left: 60, top: 1200, width: 400, fontSize: 36, fontFamily: 'Syne', fontWeight: '600', fill: '#D4A84B', selectable: true },
  ],
}

interface Template {
  id: string
  name: string
  description?: string
  thumbnail_url?: string
  is_user_template: boolean
  use_for_generation: boolean
  canvas_json?: any
}

interface Props {
  initialTemplates: Template[]
}

export function TemplatesClient({ initialTemplates }: Props) {
  const [templates, setTemplates]             = useState<Template[]>(initialTemplates)
  const [editorOpen, setEditorOpen]           = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [templateName, setTemplateName]       = useState('')
  const [templateDesc, setTemplateDesc]       = useState('')
  const [saving, setSaving]                   = useState(false)
  const [deleting, setDeleting]               = useState<string | null>(null)
  const [toggling, setToggling]               = useState<string | null>(null)
  const [mounted, setMounted]                 = useState(false)

  useEffect(() => { setMounted(true) }, [])

  async function loadTemplates() {
    const res = await fetch('/api/templates?library=1', { cache: 'no-store' })
    const data = await res.json()
    setTemplates((Array.isArray(data) ? data : []).filter((t: Template) => t.is_user_template))
  }

  function openNew() {
    setEditingTemplate(null)
    setTemplateName('')
    setTemplateDesc('')
    setEditorOpen(true)
  }

  async function openEdit(t: Template) {
    const res  = await fetch(`/api/templates/${t.id}`)
    const full = await res.json()
    setEditingTemplate(full)
    setTemplateName(full.name)
    setTemplateDesc(full.description || '')
    setEditorOpen(true)
  }

  async function handleSave(canvasJson: any) {
    if (!templateName.trim()) { alert('Please enter a template name before saving.'); return }
    setSaving(true)
    try {
      let savedId: string | null = null
      if (editingTemplate) {
        const res = await fetch(`/api/templates/${editingTemplate.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: templateName, description: templateDesc, canvas_json: canvasJson }),
        })
        if (!res.ok) { alert('Save failed: ' + (await res.json()).error); return }
        savedId = editingTemplate.id
      } else {
        const res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: templateName,
            description: templateDesc,
            canvas_json: canvasJson,
            width: 1080,
            height: 1350,
            category: 'instagram',
            is_user_template: true,
            use_for_generation: true,
          }),
        })
        if (!res.ok) { alert('Save failed: ' + (await res.json()).error); return }
        const created = await res.json()
        savedId = created.id
      }

      // Await thumbnail generation for new templates so the preview is ready on refresh
      if (savedId && !editingTemplate) {
        await fetch('/api/admin/thumbnail', {
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

  async function toggleGeneration(t: Template, e: React.MouseEvent) {
    e.stopPropagation()
    setToggling(t.id)
    try {
      const res = await fetch(`/api/templates/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ use_for_generation: !t.use_for_generation }),
      })
      if (!res.ok) { alert('Update failed'); return }
      setTemplates(prev => prev.map(x => x.id === t.id ? { ...x, use_for_generation: !t.use_for_generation } : x))
    } finally {
      setToggling(null)
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

  const editorCanvasJson = editingTemplate?.canvas_json || SEED_CANVAS

  const editorPortal = mounted && editorOpen ? createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--carbon)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 24px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
        <button
          onClick={() => setEditorOpen(false)}
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
          value={templateName}
          onChange={e => setTemplateName(e.target.value)}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--parchment)', padding: '6px 12px', borderRadius: 6, fontFamily: 'var(--font-ibm)', fontSize: 13, width: 220, outline: 'none' }}
        />
        <input
          placeholder="Description (optional)"
          value={templateDesc}
          onChange={e => setTemplateDesc(e.target.value)}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--parchment)', padding: '6px 12px', borderRadius: 6, fontFamily: 'var(--font-ibm)', fontSize: 13, width: 280, outline: 'none' }}
        />
        {saving && <span style={{ color: 'var(--candle)', fontFamily: 'var(--font-ibm)', fontSize: 13 }}>Saving…</span>}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <CanvasEditor
          templateJson={editorCanvasJson}
          onSave={handleSave}
          onCancel={() => setEditorOpen(false)}
        />
      </div>
    </div>,
    document.body
  ) : null

  return (
    <>
      {editorPortal}
      <style>{`
        @keyframes tpl-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .tpl-card { border-radius: 12px; overflow: hidden; border: 1px solid var(--border); background: var(--surface); cursor: pointer; transition: border-color .2s; }
        .tpl-card:hover { border-color: rgba(212,168,75,.35); }
        .tpl-toggle { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 11px; font-family: var(--font-ibm); color: var(--muted); user-select: none; }
        .tpl-toggle:hover { color: var(--parchment); }
        .tpl-checkbox { width: 14px; height: 14px; border-radius: 4px; border: 1.5px solid; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: background .15s, border-color .15s; }
      `}</style>

      {/* Topbar */}
      <div style={{
        borderBottom: '1px solid rgba(78,69,56,0.25)',
        padding: '24px 32px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        flexShrink: 0, background: 'var(--carbon)',
      }}>
        <div>
          <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--candle)', fontWeight: 600 }}>Design Library</span>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: 32, fontWeight: 800, color: 'var(--parchment)', letterSpacing: '-0.03em', lineHeight: 1.1, marginTop: 4, marginBottom: 0 }}>
            Templates
          </h1>
        </div>
        <button
          onClick={openNew}
          style={{ background: '#D4A84B', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 9999, cursor: 'pointer', fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 13, flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.background = '#c4983d')}
          onMouseLeave={e => (e.currentTarget.style.background = '#D4A84B')}
        >
          + New Template
        </button>
      </div>

      <div style={{ padding: '32px 36px', flex: 1, overflowY: 'auto' }}>

        {templates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 12 }}>
            No templates yet. Click &quot;New Template&quot; to create your first one.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {templates.map(t => {
              const isToggling = toggling === t.id
              const isDeleting = deleting === t.id
              return (
                <div
                  key={t.id}
                  className="tpl-card"
                  onClick={() => openEdit(t)}
                >
                  {/* Thumbnail */}
                  {t.thumbnail_url ? (
                    <div style={{ width: '100%', aspectRatio: '4/5', overflow: 'hidden' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={t.thumbnail_url} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '4/5', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 12, fontFamily: 'var(--font-ibm)' }}>
                      No preview
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 12, color: 'var(--parchment)', fontFamily: 'var(--font-syne)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.name}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      {/* Use for generation toggle */}
                      <label
                        className="tpl-toggle"
                        onClick={e => !isToggling && toggleGeneration(t, e)}
                        title={t.use_for_generation ? 'Used for generation — click to deactivate' : 'Not used for generation — click to activate'}
                      >
                        <span
                          className="tpl-checkbox"
                          style={{
                            background: t.use_for_generation ? 'rgba(182,141,64,0.9)' : 'transparent',
                            borderColor: t.use_for_generation ? '#b68d40' : 'rgba(201,194,181,0.3)',
                            opacity: isToggling ? 0.5 : 1,
                          }}
                        >
                          {t.use_for_generation && (
                            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                              <path d="M1 3.5L3.5 6L8 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </span>
                        Use for generation
                      </label>

                      {/* Delete */}
                      <button
                        onClick={e => !isDeleting && deleteTemplate(t, e)}
                        disabled={isDeleting}
                        title="Delete template"
                        style={{
                          flexShrink: 0, background: 'transparent',
                          border: '1px solid rgba(192,57,43,.25)',
                          color: 'rgba(192,57,43,.65)', borderRadius: 5, padding: '3px 8px',
                          cursor: isDeleting ? 'not-allowed' : 'pointer',
                          fontSize: 11, fontFamily: 'var(--font-ibm)',
                          opacity: isDeleting ? 0.5 : 1,
                        }}
                        onMouseEnter={e => { if (!isDeleting) e.currentTarget.style.borderColor = 'rgba(192,57,43,.6)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(192,57,43,.25)' }}
                      >
                        {isDeleting ? '…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
