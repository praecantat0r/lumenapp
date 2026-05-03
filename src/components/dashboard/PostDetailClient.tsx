'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import dynamic from 'next/dynamic'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import type { Post } from '@/types'
import { VALIDATION_THRESHOLD, VALIDATION_THRESHOLD_ASSET } from '@/lib/constants'
import toast from 'react-hot-toast'

const CanvasEditor = dynamic(
  () => import('@/components/canvas/CanvasEditor').then(m => m.CanvasEditor),
  { ssr: false }
)

export function PostDetailClient({ post: initialPost }: { post: Post }) {
  const [post, setPost] = useState(initialPost)
  const [caption, setCaption] = useState(initialPost.caption || '')
  const [hashtags, setHashtags] = useState(initialPost.hashtags || '')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [editorOpen, setEditorOpen] = useState(false)
  const [templateJson, setTemplateJson] = useState<any>(null)
  const [rerendering, setRerendering] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [approving, setApproving] = useState(false)
  const router = useRouter()

  const saveCaption = useCallback(async (newCaption: string, newHashtags: string) => {
    setSaveState('saving')
    await fetch(`/api/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption: newCaption, hashtags: newHashtags }),
    })
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 2000)
  }, [post.id])

  async function handleOpenEditor() {
    if (!(post as any).template_id) {
      toast.error('This post has no template. Regenerate it to use the editor.')
      return
    }
    const res = await fetch(`/api/templates/${(post as any).template_id}`)
    if (!res.ok) {
      toast.error('Could not load template.')
      return
    }
    const tmpl = await res.json()
    // Use the template's canvas_json directly — it is the single source of truth.
    // The render also uses the template directly (canvas_overrides: {}), so this
    // guarantees the editor and the rendered PNG always start from identical data.
    setTemplateJson(tmpl.canvas_json)
    setEditorOpen(true)
  }

  async function handleEditorSave(canvasJson: any) {
    setRerendering(true)
    setEditorOpen(false)
    try {
      if (!post.template_id) throw new Error('Post has no template')

      // Patch the template — this is the single source of truth.
      // The template PATCH handler re-renders all linked pending_review posts
      // and updates their render_url + canvas_overrides automatically.
      const res = await fetch(`/api/templates/${post.template_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvas_json: canvasJson }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')

      // Update local state with new render_url returned by the PATCH handler
      const newRenderUrl = data.thumbnail_url ?? post.render_url
      setPost(p => ({ ...p, render_url: newRenderUrl } as any))

      toast.success('Design saved and re-rendered.')
    } catch {
      toast.error('Failed to save design. Please try again.')
    } finally {
      setRerendering(false)
    }
  }

  async function approve() {
    setApproving(true)
    const res = await fetch(`/api/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    })
    if (res.ok) {
      setPost(p => ({ ...p, status: 'approved' }))
      toast.success('Post approved')
    }
    setApproving(false)
  }

  async function publish() {
    if (!confirm('Publish this post to Instagram? This cannot be undone.')) return
    setPublishing(true)
    const res = await fetch(`/api/posts/${post.id}/publish`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setPost(p => ({ ...p, status: 'published', instagram_permalink: data.permalink }))
      toast.success('Published to Instagram!')
    } else {
      const err = await res.json()
      toast.error(err.error || 'Publish failed')
    }
    setPublishing(false)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
      <style>{`
        @media (max-width: 767px) {
          .pdc-topbar { padding: 12px 16px !important; }
          .pdc-content { padding: 16px 16px 48px !important; }
          .pdc-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
        }
      `}</style>
      {/* Canvas editor overlay */}
      {editorOpen && templateJson && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'var(--carbon)' }}>
          <CanvasEditor
            templateJson={templateJson}
            onSave={handleEditorSave}
            onCancel={() => setEditorOpen(false)}
          />
        </div>
      )}

      {/* Topbar */}
      <div className="pdc-topbar" style={{ borderBottom:'1px solid #2D2A1F', padding:'16px 32px', display:'flex', alignItems:'center', gap:14, flexShrink:0, background:'var(--carbon)' }}>
        <button
          onClick={() => router.back()}
          style={{ display:'flex', alignItems:'center', gap:6, color:'var(--muted)', background:'none', border:'none', cursor:'pointer', fontSize:12, fontFamily:'var(--font-ibm)', fontWeight:300, padding:0, transition:'color .15s' }}
          onMouseEnter={e => e.currentTarget.style.color='var(--sand)'}
          onMouseLeave={e => e.currentTarget.style.color='var(--muted)'}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back
        </button>
        <div style={{ width:1, height:16, background:'var(--border)' }} />
        <span style={{ fontFamily:'var(--font-syne)', fontWeight:700, fontSize:16, color:'var(--parchment)', letterSpacing:'-.02em' }}>Post Review</span>
        <Badge status={post.status} />
      </div>

      {/* Scrollable content */}
      <div className="pdc-content" style={{ flex:1, overflowY:'auto', padding:'28px 32px 48px', scrollbarWidth:'thin', scrollbarColor:'#2D2A1F transparent' }}>
      <div className="pdc-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        {/* Left: image */}
        <div>
          <div style={{ position: 'relative', maxWidth: 'min(100%, calc(70vh * 4/5))', margin: '0 auto' }}>
            {post.render_url ? (
              <img
                src={post.render_url}
                alt="Post render"
                style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover', borderRadius: '16px', boxShadow: '0 0 40px rgba(212,168,75,0.1)' }}
              />
            ) : (
              <div style={{ width: '100%', aspectRatio: '4/5', background: 'var(--surface)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                <Spinner size={32} />
              </div>
            )}
            {rerendering && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(17,16,9,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 16, zIndex: 5,
              }}>
                <div style={{ color: 'var(--candle)', fontFamily: 'var(--font-ibm)', fontSize: 14 }}>
                  Rendering new design...
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleOpenEditor}
            style={{ width:'100%', marginTop:30, background:'transparent', border:'1px solid #2D2A1F', color:'var(--sand)', padding:'9px 0', fontFamily:'var(--font-syne)', fontWeight:700, fontSize:11, letterSpacing:'.06em', textTransform:'uppercase', cursor:'pointer', borderRadius:8, transition:'border-color .15s, color .15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(212,168,75,.4)'; e.currentTarget.style.color='var(--parchment)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--sand)' }}
          >
            Edit in Designer
          </button>
          {post.render_url && (
            <a
              href={post.render_url}
              download={`post-${post.id}.jpg`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display:'block', width:'100%', marginTop:10, background:'transparent', border:'1px solid #2D2A1F', color:'var(--muted)', padding:'9px 0', fontFamily:'var(--font-syne)', fontWeight:700, fontSize:11, letterSpacing:'.06em', textTransform:'uppercase', cursor:'pointer', borderRadius:8, transition:'border-color .15s, color .15s', textAlign:'center', textDecoration:'none' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(212,168,75,.4)'; e.currentTarget.style.color='var(--parchment)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--muted)' }}
            >
              Download Image
            </a>
          )}
        </div>

        {/* Right: details */}
        <div style={{ background:'var(--surface)', border:'1px solid #2D2A1F', borderRadius:14, overflow:'hidden', display:'flex', flexDirection:'column' }}>

          {/* Caption */}
          <div style={{ padding:'20px 22px', borderBottom:'1px solid #2D2A1F' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <span style={{ fontSize:10, letterSpacing:'.14em', textTransform:'uppercase', color:'var(--muted)', fontFamily:'var(--font-ibm)', fontWeight:400 }}>Caption</span>
              <span style={{ fontSize:10, fontFamily:'var(--font-ibm)', fontWeight:300, transition:'color .25s', color: saveState === 'saved' ? '#6EBF8B' : saveState === 'saving' ? 'var(--sand)' : 'transparent' }}>
                {saveState === 'saving' ? 'Saving…' : '✓  Saved'}
              </span>
            </div>
            <textarea
              rows={12}
              value={caption}
              onChange={e => { setCaption(e.target.value); setSaveState('idle') }}
              onBlur={() => saveCaption(caption, hashtags)}
              style={{ width:'100%', background:'transparent', border:'none', outline:'none', color:'var(--parchment)', fontFamily:'var(--font-ibm)', fontSize:13, lineHeight:1.8, fontWeight:300, resize:'none', padding:0, display:'block' }}
            />
          </div>

          {/* Hashtags */}
          <div style={{ padding:'16px 22px', borderBottom:'1px solid #2D2A1F' }}>
            <span style={{ fontSize:10, letterSpacing:'.14em', textTransform:'uppercase', color:'var(--muted)', fontFamily:'var(--font-ibm)', fontWeight:400, display:'block', marginBottom:12 }}>Hashtags</span>
            <textarea
              rows={5}
              value={hashtags}
              onChange={e => { setHashtags(e.target.value); setSaveState('idle') }}
              onBlur={() => saveCaption(caption, hashtags)}
              style={{ width:'100%', background:'transparent', border:'none', outline:'none', color:'var(--ember)', fontFamily:'var(--font-ibm)', fontSize:12, lineHeight:1.65, fontWeight:300, resize:'none', padding:0, display:'block' }}
            />
          </div>

          {/* Actions */}
          <div style={{ padding:'16px 22px', borderBottom:'1px solid #2D2A1F', display:'flex', gap:8 }}>
            <button
              onClick={() => saveCaption(caption, hashtags)}
              disabled={saveState === 'saving'}
              style={{ flex:1, background: saveState === 'saved' ? 'rgba(110,191,139,0.08)' : 'transparent', border: saveState === 'saved' ? '1px solid rgba(110,191,139,0.35)' : '1px solid #2D2A1F', color: saveState === 'saved' ? '#6EBF8B' : 'var(--sand)', padding:'10px 12px', fontFamily:'var(--font-syne)', fontWeight:700, fontSize:11, letterSpacing:'.02em', textTransform:'uppercase', cursor: saveState === 'saving' ? 'default' : 'pointer', borderRadius:8, transition:'border-color .15s, color .15s, background .15s' }}
              onMouseEnter={e => { if (saveState !== 'saving' && saveState !== 'saved') { e.currentTarget.style.borderColor='rgba(212,168,75,.4)'; e.currentTarget.style.color='var(--parchment)' } }}
              onMouseLeave={e => { if (saveState !== 'saving' && saveState !== 'saved') { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--sand)' } }}
            >
              {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? '✓ Saved' : 'Save'}
            </button>
            {post.status === 'pending_review' && (
              <button
                onClick={approve}
                disabled={approving}
                style={{ flex:1, background:'transparent', border:'1px solid #2D2A1F', color:'var(--sand)', padding:'10px 12px', fontFamily:'var(--font-syne)', fontWeight:700, fontSize:11, letterSpacing:'.02em', textTransform:'uppercase', cursor:'pointer', borderRadius:8, transition:'border-color .15s, color .15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(212,168,75,.4)'; e.currentTarget.style.color='var(--parchment)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--sand)' }}
              >
                {approving ? 'Approving…' : 'Approve'}
              </button>
            )}
            <button
              onClick={publish}
              disabled={publishing || (post.status !== 'approved' && post.status !== 'pending_review')}
              style={{ flex:1, background:'var(--candle)', color:'#ffffff', border:'none', padding:'10px 12px', fontFamily:'var(--font-syne)', fontWeight:700, fontSize:11, letterSpacing:'.02em', textTransform:'uppercase', cursor: (post.status !== 'approved' && post.status !== 'pending_review') ? 'not-allowed' : 'pointer', borderRadius:8, transition:'background .15s', opacity:(post.status !== 'approved' && post.status !== 'pending_review') ? .35 : 1 }}
              onMouseEnter={e => { if (!publishing && (post.status === 'approved' || post.status === 'pending_review')) e.currentTarget.style.background='var(--ember)' }}
              onMouseLeave={e => { e.currentTarget.style.background='var(--candle)' }}
            >
              {publishing ? 'Publishing…' : 'Publish to Instagram'}
            </button>
          </div>

          {/* Metadata */}
          <div style={{ padding:'16px 22px', flex:1, display:'flex', flexDirection:'column', gap:8 }}>
            {([
              { label: 'Generated', value: format(new Date(post.created_at), 'MMM d, yyyy · h:mm a') },
              { label: 'Status',    value: post.status.replace(/_/g, ' ') },
            ] as { label: string; value: string }[]).map(m => (
              <div key={m.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 0' }}>
                <span style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--font-ibm)', fontWeight:300 }}>{m.label}</span>
                <span style={{ fontSize:11, color:'var(--sand)', fontFamily:'var(--font-ibm)', fontWeight:300, textTransform: m.label === 'Status' ? 'capitalize' : 'none' }}>{m.value}</span>
              </div>
            ))}
            {post.instagram_permalink && (
              <a href={post.instagram_permalink} target="_blank" rel="noopener noreferrer"
                style={{ fontSize:12, color:'var(--candle)', textDecoration:'none', fontFamily:'var(--font-ibm)', marginTop:4 }}>
                View on Instagram →
              </a>
            )}
          </div>

          {/* Validation debug */}
          {(() => {
            const meta = (post as any).generation_metadata
            if (!meta || meta.validation_score == null) return null
            const score: number = meta.validation_score
            const attempts: number = meta.validation_attempts ?? 1
            const feedback: string = meta.validation_feedback ?? ''
            const assetMode: string = meta.asset_mode ?? 'original'
            const postMode: string = meta.post_mode ?? ''
            const shotStyle: string = meta.shot_style ?? ''
            const failed: boolean = !!meta.validation_failed
            const isAsset = assetMode !== 'original'
            const threshold = isAsset ? VALIDATION_THRESHOLD_ASSET : VALIDATION_THRESHOLD
            const passed = score >= threshold

            const scoreColor = score >= 0.65 ? '#6EBF8B' : score >= 0.4 ? '#c9a840' : '#e05c5c'
            const barPct = Math.round(score * 100)
            const threshPct = Math.round(threshold * 100)

            const criteria = isAsset
              ? [
                  { key: 'visual_match', label: 'Visual Match',  weight: '45%' },
                  { key: 'language',     label: 'Language',       weight: '35%' },
                  { key: 'rules',        label: 'Rules',          weight: '20%' },
                ]
              : [
                  { key: 'specificity',  label: 'Brand Specificity', weight: '30%' },
                  { key: 'depth',        label: 'Content Depth',     weight: '25%' },
                  { key: 'visual_match', label: 'Visual Match',      weight: '20%' },
                  { key: 'language',     label: 'Language',          weight: '15%' },
                  { key: 'rules',        label: 'Rules',             weight: '10%' },
                ]

            return (
              <div style={{ borderTop:'1px solid #2D2A1F', marginTop:4, paddingTop:16 }}>
                {/* Header row */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                  <span style={{ fontSize:10, letterSpacing:'.14em', textTransform:'uppercase', color:'var(--muted)', fontFamily:'var(--font-ibm)', fontWeight:400 }}>Brand Validation</span>
                  <span style={{
                    fontSize:9, letterSpacing:'.1em', textTransform:'uppercase', fontFamily:'var(--font-ibm)', fontWeight:600,
                    color: passed ? '#6EBF8B' : '#e05c5c',
                    padding:'2px 7px', borderRadius:4,
                    background: passed ? 'rgba(110,191,139,0.1)' : 'rgba(224,92,92,0.1)',
                    border: `1px solid ${passed ? 'rgba(110,191,139,0.3)' : 'rgba(224,92,92,0.3)'}`,
                  }}>
                    {failed ? 'Hard Failed' : passed ? 'Passed' : 'Failed'}
                  </span>
                </div>

                {/* Score bar */}
                <div style={{ position:'relative', height:4, background:'rgba(255,255,255,0.06)', borderRadius:2, marginBottom:8 }}>
                  <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${barPct}%`, background:scoreColor, borderRadius:2, transition:'width .4s' }} />
                  {/* threshold marker */}
                  <div style={{ position:'absolute', top:-3, left:`${threshPct}%`, width:1, height:10, background:'rgba(255,255,255,0.25)', transform:'translateX(-50%)' }} />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
                  <span style={{ fontSize:11, fontFamily:'var(--font-ibm)', fontWeight:600, color:scoreColor }}>{score.toFixed(2)}</span>
                  <span style={{ fontSize:10, fontFamily:'var(--font-ibm)', color:'rgba(255,255,255,0.25)' }}>threshold {threshold.toFixed(2)} · {attempts}/3 attempt{attempts !== 1 ? 's' : ''}</span>
                </div>

                {/* Criteria table */}
                <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:14 }}>
                  {criteria.map(c => (
                    <div key={c.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span style={{ fontSize:10, fontFamily:'var(--font-ibm)', color:'var(--muted)' }}>{c.label}</span>
                      <span style={{ fontSize:10, fontFamily:'var(--font-ibm)', color:'rgba(255,255,255,0.2)' }}>{c.weight}</span>
                    </div>
                  ))}
                </div>

                {/* Context row */}
                {(postMode || shotStyle || assetMode !== 'original') && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:12 }}>
                    {postMode && <span style={{ fontSize:9, padding:'2px 6px', borderRadius:3, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'var(--muted)', fontFamily:'var(--font-ibm)', textTransform:'capitalize' }}>{postMode}</span>}
                    {assetMode !== 'original' && <span style={{ fontSize:9, padding:'2px 6px', borderRadius:3, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'var(--muted)', fontFamily:'var(--font-ibm)', textTransform:'capitalize' }}>{assetMode}</span>}
                    {shotStyle && <span style={{ fontSize:9, padding:'2px 6px', borderRadius:3, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'var(--muted)', fontFamily:'var(--font-ibm)' }}>{shotStyle}</span>}
                  </div>
                )}

                {/* Feedback */}
                {feedback && (
                  <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, padding:'10px 12px' }}>
                    <span style={{ fontSize:9, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--muted)', fontFamily:'var(--font-ibm)', display:'block', marginBottom:6 }}>Validator Feedback</span>
                    <p style={{ margin:0, fontSize:11, lineHeight:1.65, color:'var(--sand)', fontFamily:'var(--font-ibm)', fontWeight:300 }}>{feedback}</p>
                  </div>
                )}
              </div>
            )
          })()}

        </div>
      </div>
      </div>
    </div>
  )
}
