'use client'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { PostCard } from './PostCard'
import { GeneratingModal } from './GeneratingModal'
import { GeneratePostModal } from './GeneratePostModal'
import type { Post, BrandAsset } from '@/types'
import toast from 'react-hot-toast'

type Filter = 'all' | 'pending_review' | 'approved' | 'published' | 'failed'

const STATUS_BADGE: Record<string, { bg: string; color: string; border: string }> = {
  pending_review: { bg: 'rgba(212,168,75,.18)',   color: '#D4A84B', border: '1px solid rgba(212,168,75,.3)' },
  approved:       { bg: 'rgba(110,191,139,.14)', color: '#6EBF8B', border: '1px solid rgba(110,191,139,.25)' },
  published:      { bg: 'rgba(100,160,255,.14)', color: '#7AABFF', border: '1px solid rgba(100,160,255,.25)' },
  failed:         { bg: 'rgba(224,112,112,.14)', color: '#E07070', border: '1px solid rgba(224,112,112,.25)' },
  generating:     { bg: 'rgba(120,112,88,.15)',  color: '#C4B99A', border: '1px solid rgba(120,112,88,.2)' },
}
const STATUS_LABELS: Record<string, string> = {
  pending_review: 'Pending review', approved: 'Approved', published: 'Published', failed: 'Failed', generating: 'Generating…'
}

interface Props {
  posts: Post[]
  counts: { all: number; pending_review: number; approved: number; published: number; failed: number }
  brandAssets: BrandAsset[]
  initialQuery?: string
  initialFilter?: string
  page: number
  totalPages: number
}

export function PostsClient({ posts: initialPosts, counts, brandAssets, initialQuery = '', initialFilter = 'all', page, totalPages }: Props) {
  const router                = useRouter()
  const [query, setQuery]     = useState(initialQuery)
  const [selected, setSelected] = useState<Post | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genStep, setGenStep] = useState('Analyzing brand identity…')
  const [posts, setPosts]     = useState(initialPosts)
  useEffect(() => { setPosts(initialPosts) }, [initialPosts])
  const [deleting, setDeleting] = useState(false)
  const [showGenModal, setShowGenModal] = useState(false)

  const filter = initialFilter as Filter

  const MOBILE_PAGE_SIZE = 5
  const [isMobile, setIsMobile] = useState(false)
  const [mobilePage, setMobilePage] = useState(1)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => { setMobilePage(1) }, [filter, query, page])

  function navigate(f: Filter, p = 1) {
    const params = new URLSearchParams()
    if (f !== 'all') params.set('filter', f)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    router.push(`/dashboard/posts${qs ? `?${qs}` : ''}`)
  }

  const filtered = posts.filter(p => {
    const q = query.toLowerCase()
    return !q || (p.caption || '').toLowerCase().includes(q) || (p.hashtags || '').toLowerCase().includes(q)
  })

  function openDetail(post: Post) { setSelected(post); setPanelOpen(true) }
  function closeDetail() { setPanelOpen(false); setTimeout(() => setSelected(null), 300) }

  async function deletePost(id: string) {
    if (!confirm('Delete this post? This cannot be undone.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' })
      if (!res.ok) { const e = await res.json(); toast.error(e.error || 'Delete failed'); return }
      setPosts(prev => prev.filter(p => p.id !== id))
      closeDetail()
      toast.success('Post deleted.')
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  const STEPS = ['Analyzing brand identity…', 'Crafting visual concept…', 'Generating image…', 'Writing caption…', 'Composing final design…']

  async function generatePost(config: { assetMode: 'original' | 'auto' | 'specific' | 'composite'; assetUrl?: string; assetName?: string; assetType?: string; assetDescription?: string; scenicAssetUrl?: string; scenicAssetName?: string; scenicAssetDescription?: string; productAssetUrl?: string; productAssetName?: string; productAssetDescription?: string }) {
    setShowGenModal(false)
    setGenerating(true)
    setGenStep(STEPS[0])
    let stepIdx = 0
    const stepInterval = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, STEPS.length - 1)
      setGenStep(STEPS[stepIdx])
    }, 18000)
    try {
      const res = await fetch('/api/generate/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error || 'Generation failed')
      }
      const data = await res.json()
      const { post_id } = data
      const pollInterval = setInterval(async () => {
        try {
          const s = await fetch(`/api/posts/${post_id}/status`)
          const d = await s.json()
          if (d.status === 'pending_review' || d.status === 'failed') {
            clearInterval(pollInterval)
            clearInterval(stepInterval)
            setGenerating(false)
            if (d.status === 'pending_review') {
              toast.success('Post ready for review!')
              router.refresh()
            } else {
              toast.error('Generation failed.')
            }
          }
        } catch { /* ignore */ }
      }, 3000)
    } catch (err: unknown) {
      clearInterval(stepInterval)
      toast.error(err instanceof Error ? err.message : 'Generation failed')
      setGenerating(false)
    }
  }

  const an = useCallback((post: Post) => (post.analytics || {}) as Record<string, number>, [])

  return (
    <>
      {showGenModal && (
        <GeneratePostModal
          brandAssets={brandAssets}
          onGenerate={generatePost}
          onClose={() => setShowGenModal(false)}
        />
      )}
      {generating && <GeneratingModal step={genStep} />}
      <style>{`
        .pt-chip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 14px; font-size: 12px; font-weight: 600;
          color: var(--muted); cursor: pointer; border: 1px solid transparent;
          background: transparent; border-radius: 9999px;
          transition: all .15s; font-family: var(--font-ibm); white-space: nowrap;
        }
        .pt-chip:hover { color: var(--parchment); background: rgba(255,255,255,0.05); }
        .pt-chip.pt-active { color: var(--parchment); background: rgba(255,255,255,0.07); border-color: rgba(78,69,56,0.35); }
        @keyframes pt-fadein { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .pt-grid { animation: pt-fadein .3s ease both; }
        @keyframes pt-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

        .pt-page-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 8px;
          background: transparent; border: 1px solid rgba(78,69,56,0.35);
          color: var(--sand); cursor: pointer; font-size: 13px;
          font-family: var(--font-ibm); transition: all .15s;
        }
        .pt-page-btn:hover:not(:disabled) { border-color: rgba(212,168,75,.35); color: var(--parchment); }
        .pt-page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .pt-page-btn.pt-page-active { background: rgba(212,168,75,.12); border-color: rgba(212,168,75,.35); color: var(--candle); font-weight: 700; }

        /* ── Responsive grid ── */
        @media (max-width: 1024px) { .pt-grid { grid-template-columns: repeat(3,1fr) !important; } }
        @media (max-width: 767px)  { .pt-grid { grid-template-columns: repeat(2,1fr) !important; } }
        @media (max-width: 480px)  { .pt-grid { grid-template-columns: 1fr !important; } }

        /* ── Topbar ── */
        @media (max-width: 767px) {
          .pt-topbar { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; padding: 16px !important; }
          .pt-topbar > div:last-child { width: 100%; display: flex; gap: 8px; }
          .pt-topbar > div:last-child > button { flex: 1; justify-content: center; }
        }

        /* ── Filter bar ── */
        @media (max-width: 767px) {
          .pt-content { overflow: visible !important; flex: none !important; height: auto !important; }
        }

        /* ── Filter bar ── */
        @media (max-width: 767px) {
          .pt-filterbar { flex-direction: column !important; gap: 10px !important; padding: 10px 16px !important; }
          .pt-chips-row { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 4px; flex-shrink: 0; scrollbar-width: none; }
          .pt-chips-row::-webkit-scrollbar { display: none; }
          .pt-chips-row > button { flex-shrink: 0; }
          .pt-search-wrap { width: 100%; }
          .pt-search-input { width: 100% !important; box-sizing: border-box; }
        }

        /* ── Detail panel ── */
        @media (max-width: 767px) {
          .pt-detail-panel { width: 100% !important; }
        }

        /* ── Light mode overrides ── */
        [data-theme="light"] .pt-chip { color: var(--muted); }
        [data-theme="light"] .pt-chip:hover { color: var(--parchment); background: rgba(0,0,0,0.04); }
        [data-theme="light"] .pt-chip.pt-active { color: var(--parchment); background: var(--surface-2); border-color: var(--border); }
        [data-theme="light"] .pt-gen-btn {
          background: rgba(182,141,64,0.12) !important;
          border-color: rgba(182,141,64,0.3) !important;
          color: var(--ember) !important;
        }
        [data-theme="light"] .pt-new-btn {
          background: var(--candle) !important;
          color: #ffffff !important;
        }
        [data-theme="light"] .pt-new-btn:hover {
          background: var(--ember) !important;
        }
        [data-theme="light"] .pt-search-input {
          background: var(--surface-2) !important;
          border-color: var(--border) !important;
          color: var(--parchment) !important;
        }
        [data-theme="light"] .pt-section-label { color: var(--muted); }
        [data-theme="light"] .pt-section-label::after { background: var(--border); }
        [data-theme="light"] .pc-card {
          border-color: rgba(210,197,179,0.5) !important;
          box-shadow: 0 1px 8px rgba(0,0,0,0.06) !important;
        }
        [data-theme="light"] .pc-card:hover {
          box-shadow: 0 8px 28px rgba(0,0,0,0.09) !important;
          border-color: rgba(182,141,64,0.2) !important;
        }
      `}</style>

      {/* ── Topbar ── */}
      <div className="pt-topbar" style={{
        borderBottom: '1px solid rgba(78,69,56,0.25)',
        padding: '24px 32px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        flexShrink: 0, background: 'var(--carbon)',
      }}>
        <div>
          <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--candle)', fontWeight: 600 }}>Content Library</span>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: 32, fontWeight: 800, color: 'var(--parchment)', letterSpacing: '-0.03em', lineHeight: 1.1, marginTop: 4 }}>
            Post Archive
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="pt-gen-btn"
            onClick={() => setShowGenModal(true)}
            disabled={generating}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', background: 'rgba(182,141,64,0.12)',
              color: 'var(--candle)', border: '1px solid rgba(182,141,64,0.25)',
              borderRadius: 9999, fontSize: 13, fontWeight: 700,
              cursor: generating ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
            }}
          >
            {generating ? (
              <span className="material-symbols-outlined" style={{ fontSize: 16, animation: 'pt-spin 1.4s linear infinite', display: 'inline-block' }}>autorenew</span>
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            )}
            Generate Post
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="pt-filterbar" style={{
        padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, borderBottom: '1px solid rgba(78,69,56,0.25)',
        background: 'var(--carbon)',
      }}>
        <div className="pt-chips-row" style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
          {([
            { id: 'all',            label: 'All',      count: counts.all,            countColor: 'var(--sand)' },
            { id: 'pending_review', label: 'Pending',  count: counts.pending_review, countColor: '#b68d40' },
            { id: 'approved',       label: 'Approved', count: counts.approved,       countColor: '#6EBF8B' },
            { id: 'published',      label: 'Published',count: counts.published,      countColor: '#7AABFF' },
            { id: 'failed',         label: 'Failed',   count: counts.failed,         countColor: '#ffb4ab' },
          ] as const).map(t => (
            <button key={t.id} onClick={() => navigate(t.id as Filter, 1)} className={`pt-chip${filter === t.id ? ' pt-active' : ''}`}>
              {t.label}
              {t.count > 0 && (
                <span style={{
                  fontSize: 10, minWidth: 18, padding: '1px 6px', borderRadius: 9999,
                  background: filter === t.id ? `${t.countColor}25` : 'rgba(255,255,255,0.07)',
                  color: filter === t.id ? t.countColor : 'var(--muted)',
                  fontWeight: 700, lineHeight: '16px', display: 'inline-block', textAlign: 'center',
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="pt-search-wrap" style={{ position: 'relative' }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--muted)', pointerEvents: 'none' }}>search</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search posts…"
            className="pt-search-input"
            style={{
              background: 'var(--surface-2)', border: '1px solid rgba(78,69,56,0.3)',
              borderRadius: 9999, padding: '7px 14px 7px 34px',
              fontSize: 13, color: 'var(--parchment)', fontFamily: 'var(--font-ibm)',
              outline: 'none', width: 220, transition: 'border-color 0.15s',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(182,141,64,0.4)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(78,69,56,0.3)')}
          />
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="pt-content" style={{ flex: 1, overflowY: 'auto', padding: '24px 32px 48px', background: 'var(--carbon)' }}>
        {(() => {
          const mobileTotalPages = Math.max(1, Math.ceil(filtered.length / MOBILE_PAGE_SIZE))
          const visiblePosts = isMobile
            ? filtered.slice((mobilePage - 1) * MOBILE_PAGE_SIZE, mobilePage * MOBILE_PAGE_SIZE)
            : filtered
          const mobileHasPrev = mobilePage > 1 || page > 1
          const mobileHasNext = mobilePage < mobileTotalPages || page < totalPages

          return (
            <>
              {visiblePosts.length > 0 ? (
                <div className="pt-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                  {visiblePosts.map(post => <PostCard key={post.id} post={post} onClick={() => openDetail(post)} />)}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 20px', textAlign: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(182,141,64,0.08)', border: '1px solid rgba(182,141,64,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--candle)', opacity: 0.5 }}>search_off</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-syne)', fontSize: 18, fontWeight: 700, color: 'var(--sand)', marginBottom: 8 }}>No posts found</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 280 }}>Try adjusting your filters or generate a new post.</div>
                </div>
              )}

              {/* ── Mobile pagination ── */}
              {isMobile && (mobileHasPrev || mobileHasNext) && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, padding: '0 4px' }}>
                  <button
                    className="pt-page-btn"
                    disabled={!mobileHasPrev}
                    onClick={() => {
                      if (mobilePage > 1) setMobilePage(p => p - 1)
                      else navigate(filter, page - 1)
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span>
                  </button>
                  <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-ibm)' }}>
                    {(mobilePage - 1) * MOBILE_PAGE_SIZE + 1}–{Math.min(mobilePage * MOBILE_PAGE_SIZE, filtered.length)} of {filtered.length}{page < totalPages ? '+' : ''}
                  </span>
                  <button
                    className="pt-page-btn"
                    disabled={!mobileHasNext}
                    onClick={() => {
                      if (mobilePage < mobileTotalPages) setMobilePage(p => p + 1)
                      else navigate(filter, page + 1)
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
                  </button>
                </div>
              )}

              {/* ── Desktop pagination ── */}
              {!isMobile && totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 40 }}>
                  <button className="pt-page-btn" disabled={page <= 1} onClick={() => navigate(filter, page - 1)}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span>
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                    .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis')
                      acc.push(p)
                      return acc
                    }, [])
                    .map((p, i) =>
                      p === 'ellipsis' ? (
                        <span key={`e${i}`} style={{ color: 'var(--muted)', fontSize: 13, padding: '0 4px' }}>…</span>
                      ) : (
                        <button key={p} className={`pt-page-btn${p === page ? ' pt-page-active' : ''}`} onClick={() => navigate(filter, p as number)}>
                          {p}
                        </button>
                      )
                    )}
                  <button className="pt-page-btn" disabled={page >= totalPages} onClick={() => navigate(filter, page + 1)}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
                  </button>
                </div>
              )}
            </>
          )
        })()}
      </div>

      {/* ── Detail backdrop ── */}
      <div
        onClick={closeDetail}
        style={{ position: 'fixed', inset: 0, background: 'rgba(12,11,6,.55)', opacity: panelOpen ? 1 : 0, pointerEvents: panelOpen ? 'all' : 'none', transition: 'opacity .3s', zIndex: 99 }}
      />

      {/* ── Detail panel ── */}
      <div className="pt-detail-panel" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 460, background: 'var(--surface-2)', borderLeft: '1px solid rgba(78,69,56,0.3)', display: 'flex', flexDirection: 'column', transform: panelOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform .3s cubic-bezier(.4,0,.2,1)', zIndex: 100, overflow: 'hidden' }}>
        {selected && (
          <>
            {/* Header */}
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={closeDetail} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--parchment)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><line x1="13" y1="3" x2="3" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                </button>
                {(() => {
                  const s = STATUS_BADGE[selected.status] || STATUS_BADGE.generating
                  return <div style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 400, padding: '3px 8px', borderRadius: 20, ...s }}>{STATUS_LABELS[selected.status]}</div>
                })()}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => router.push(`/dashboard/post/${selected.id}`)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid var(--border)', color: 'var(--sand)', padding: '6px 12px', borderRadius: 7, cursor: 'pointer', fontFamily: 'var(--font-ibm)', fontSize: 11 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sand)'; e.currentTarget.style.color = 'var(--parchment)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--sand)' }}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 9.5V12h2.5l7-7L9 2.5l-7 7z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                  Edit
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {/* Image */}
              <div style={{ aspectRatio: '4/5', overflow: 'hidden', flexShrink: 0, position: 'relative', background: 'var(--surface-2)' }}>
                {selected.render_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.render_url} alt="Post" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', padding: 16 }}>
                    {selected.caption && <span style={{ fontFamily: 'var(--font-syne)', fontSize: 16, fontWeight: 700, color: 'var(--parchment)', letterSpacing: '-.01em', opacity: 0.6 }}>{selected.caption.split(' ').slice(0, 4).join(' ')}</span>}
                  </div>
                )}
              </div>

              <div style={{ padding: '18px 22px' }}>
                {/* Published stats */}
                {selected.status === 'published' && an(selected).reach && (
                  <>
                    <div style={{ display: 'flex', gap: 16, background: 'var(--surface-2)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                      {[
                        { val: an(selected).reach >= 1000 ? `${(an(selected).reach/1000).toFixed(1)}k` : an(selected).reach, label: 'Reach' },
                        { val: an(selected).likes,    label: 'Likes' },
                        { val: an(selected).comments, label: 'Comments' },
                        { val: an(selected).engagement_rate ? `${an(selected).engagement_rate}%` : '—', label: 'Eng. rate' },
                      ].map(stat => (
                        <div key={stat.label} style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontFamily: 'var(--font-syne)', fontSize: 20, fontWeight: 700, color: 'var(--candle)' }}>{stat.val || '—'}</div>
                          <div style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 3 }}>{stat.label}</div>
                        </div>
                      ))}
                    </div>
                    <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 16px' }}/>
                  </>
                )}

                {/* Caption */}
                <div style={{ fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 400, marginBottom: 8, fontFamily: 'var(--font-ibm)' }}>Caption</div>
                <div style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--sand)', fontWeight: 300, whiteSpace: 'pre-wrap', marginBottom: 16, fontFamily: 'var(--font-ibm)' }}>{selected.caption || '—'}</div>

                {/* Hashtags */}
                <div style={{ fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 400, marginBottom: 8, fontFamily: 'var(--font-ibm)' }}>Hashtags</div>
                <div style={{ fontSize: 11, color: 'var(--ember)', fontWeight: 300, lineHeight: 1.7, marginBottom: 20, fontFamily: 'var(--font-ibm)' }}>{selected.hashtags || '—'}</div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 16px' }}/>

                {/* Meta */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: 'Date',     val: format(new Date(selected.created_at), 'MMM d, yyyy') },
                    { label: 'Template', val: (selected.generation_metadata as Record<string, string>)?.pool_template_name || '—' },
                    { label: 'AI model', val: 'Claude Sonnet + Haiku', small: true },
                    selected.instagram_permalink
                      ? { label: 'Instagram', val: 'View post ↗', link: selected.instagram_permalink }
                      : { label: 'Status',    val: STATUS_LABELS[selected.status] },
                  ].map(m => (
                    <div key={m.label}>
                      <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4, fontFamily: 'var(--font-ibm)' }}>{m.label}</div>
                      {'link' in m && m.link ? (
                        <a href={m.link} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--candle)', textDecoration: 'none', fontFamily: 'var(--font-ibm)', fontWeight: 300 }}>{m.val}</a>
                      ) : (
                        <div style={{ fontSize: ('small' in m && m.small) ? 10 : 12, color: 'var(--parchment)', fontFamily: 'var(--font-ibm)', fontWeight: 300 }}>{m.val}</div>
                      )}
                    </div>
                  ))}
                </div>

              </div>
            </div>

            {/* Actions */}
            <div style={{ padding: '0 22px 22px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selected.status === 'pending_review' && (
                <>
                  <button onClick={() => router.push(`/dashboard/post/${selected.id}`)}
                    style={{ width: '100%', background: 'var(--candle)', color: '#ffffff', border: 'none', padding: '11px 0', fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 12, letterSpacing: '.05em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 7 }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--ember)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--candle)')}>
                    Edit & Review
                  </button>
                  <button onClick={async () => {
                    if (!confirm('Approve and publish this post to Instagram?')) return
                    const res = await fetch(`/api/posts/${selected.id}/publish`, { method: 'POST' })
                    if (res.ok) { toast.success('Published!'); closeDetail(); router.refresh() }
                    else { const e = await res.json(); toast.error(e.error || 'Publish failed') }
                  }}
                    style={{ width: '100%', background: 'transparent', border: '1px solid var(--border)', color: 'var(--sand)', padding: '10px 0', fontFamily: 'var(--font-ibm)', fontSize: 12, cursor: 'pointer', borderRadius: 7 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,168,75,.4)'; e.currentTarget.style.color = 'var(--parchment)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--sand)' }}>
                    Approve & Publish
                  </button>
                </>
              )}
              {selected.status === 'approved' && (
                <button onClick={async () => {
                  if (!confirm('Publish this post to Instagram now?')) return
                  const res = await fetch(`/api/posts/${selected.id}/publish`, { method: 'POST' })
                  if (res.ok) { toast.success('Published!'); closeDetail(); router.refresh() }
                  else { const e = await res.json(); toast.error(e.error || 'Publish failed') }
                }}
                  style={{ width: '100%', background: 'var(--candle)', color: '#ffffff', border: 'none', padding: '11px 0', fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 12, letterSpacing: '.05em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 7 }}>
                  Publish Now
                </button>
              )}
              {selected.status === 'failed' && (
                <button style={{ width: '100%', background: 'transparent', border: '1px solid rgba(224,112,112,.25)', color: '#E07070', padding: '10px 0', fontFamily: 'var(--font-ibm)', fontSize: 12, cursor: 'pointer', borderRadius: 7 }}>
                  Retry Generation
                </button>
              )}
              {selected.instagram_permalink && (
                <a href={selected.instagram_permalink} target="_blank" rel="noreferrer"
                  style={{ width: '100%', display: 'block', textAlign: 'center', background: 'transparent', border: '1px solid var(--border)', color: 'var(--sand)', padding: '10px 0', fontFamily: 'var(--font-ibm)', fontSize: 12, cursor: 'pointer', borderRadius: 7, textDecoration: 'none' }}>
                  View on Instagram ↗
                </a>
              )}
              <button
                onClick={() => deletePost(selected.id)}
                disabled={deleting}
                style={{ width: '100%', marginTop: 4, background: 'transparent', border: '1px solid rgba(192,57,43,.25)', color: 'rgba(192,57,43,.65)', padding: '9px 0', fontFamily: 'var(--font-ibm)', fontSize: 11, cursor: deleting ? 'not-allowed' : 'pointer', borderRadius: 7, opacity: deleting ? 0.5 : 1 }}
                onMouseEnter={e => { if (!deleting) { e.currentTarget.style.borderColor = 'rgba(192,57,43,.6)'; e.currentTarget.style.color = '#c0392b' }}}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(192,57,43,.25)'; e.currentTarget.style.color = 'rgba(192,57,43,.65)' }}>
                {deleting ? 'Deleting…' : 'Delete post'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
