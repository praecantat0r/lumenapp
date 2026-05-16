'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { PostCard } from './PostCard'
import dynamic from 'next/dynamic'
import { GeneratingModal } from './GeneratingModal'
const GeneratePostModal = dynamic(
  () => import('./GeneratePostModal').then(m => ({ default: m.GeneratePostModal })),
  { ssr: false },
)
import type { Post, BrandAsset } from '@/types'
import toast from 'react-hot-toast'
import { useLanguage } from '@/lib/i18n/context'
import { useGeneratePost } from '@/hooks/useGeneratePost'
import { getStatusConfig } from '@/lib/post-status'

type Filter = 'all' | 'pending_review' | 'approved' | 'published' | 'failed'

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
  const { t } = useLanguage()
  const [query, setQuery]     = useState(initialQuery)
  const [selected, setSelected] = useState<Post | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const STATUS_LABELS: Record<string, string> = {
    pending_review: t('posts.statusPending'),
    approved:       t('posts.statusApproved'),
    published:      t('posts.statusPublished'),
    failed:         t('posts.statusFailed'),
    generating:     t('posts.statusGenerating'),
  }
  const [posts, setPosts]     = useState(initialPosts)
  useEffect(() => { setPosts(initialPosts) }, [initialPosts])
  const [deleting, setDeleting] = useState(false)
  const [showGenModal, setShowGenModal] = useState(false)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { generating, genStep, generatePost } = useGeneratePost(
    [t('posts.genStep1'), t('posts.genStep2'), t('posts.genStep3'), t('posts.genStep4'), t('posts.genStep5')],
    () => { toast.success(t('posts.toastReady')); router.refresh() },
    (msg) => toast.error(msg),
  )

  const filter = initialFilter as Filter

  function navigate(f: Filter, p = 1, q?: string) {
    const params = new URLSearchParams()
    if (f !== 'all') params.set('filter', f)
    if (p > 1) params.set('page', String(p))
    const searchQ = q !== undefined ? q : query
    if (searchQ) params.set('q', searchQ)
    const qs = params.toString()
    router.push(`/dashboard/posts${qs ? `?${qs}` : ''}`)
  }

  const filtered = posts

  function openDetail(post: Post) { setSelected(post); setPanelOpen(true) }
  function closeDetail() { setPanelOpen(false); setTimeout(() => setSelected(null), 300) }

  async function deletePost(id: string) {
    if (!confirm(t('posts.deleteConfirm'))) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' })
      if (!res.ok) { const e = await res.json(); toast.error(e.error || t('posts.toastFailed')); return }
      setPosts(prev => prev.filter(p => p.id !== id))
      closeDetail()
      toast.success(t('posts.toastDeleted'))
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  const an = useCallback((post: Post) => (post.analytics || {}) as Record<string, number>, [])

  return (
    <>
      {showGenModal && (
        <GeneratePostModal
          brandAssets={brandAssets}
          onGenerate={(config) => { setShowGenModal(false); generatePost(config) }}
          onClose={() => setShowGenModal(false)}
        />
      )}
      {generating && <GeneratingModal step={genStep} />}
      {/* ── Topbar ── */}
      <div className="pt-topbar" style={{
        borderBottom: '1px solid rgba(78,69,56,0.25)',
        padding: '24px 32px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        flexShrink: 0, background: 'var(--carbon)',
      }}>
        <div>
          <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--candle)', fontWeight: 600 }}>{t('posts.headerLabel')}</span>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: 32, fontWeight: 800, color: 'var(--parchment)', letterSpacing: '-0.03em', lineHeight: 1.1, marginTop: 4 }}>
            {t('posts.title')}
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
            {t('posts.generatePost')}
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
            { id: 'all',            label: t('posts.filterAll'),       count: counts.all,            countColor: 'var(--sand)' },
            { id: 'pending_review', label: t('posts.filterPending'),   count: counts.pending_review, countColor: '#b68d40' },
            { id: 'approved',       label: t('posts.filterApproved'),  count: counts.approved,       countColor: '#6EBF8B' },
            { id: 'published',      label: t('posts.filterPublished'), count: counts.published,      countColor: '#7AABFF' },
            { id: 'failed',         label: t('posts.filterFailed'),    count: counts.failed,         countColor: '#ffb4ab' },
          ] as const).map(chip => (
            <button key={chip.id} onClick={() => navigate(chip.id as Filter, 1)} className={`pt-chip${filter === chip.id ? ' pt-active' : ''}`}>
              {chip.label}
              {chip.count > 0 && (
                <span style={{
                  fontSize: 10, minWidth: 18, padding: '1px 6px', borderRadius: 9999,
                  background: filter === chip.id ? `${chip.countColor}25` : 'rgba(255,255,255,0.07)',
                  color: filter === chip.id ? chip.countColor : 'var(--muted)',
                  fontWeight: 700, lineHeight: '16px', display: 'inline-block', textAlign: 'center',
                }}>
                  {chip.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="pt-search-wrap" style={{ position: 'relative' }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--muted)', pointerEvents: 'none' }}>search</span>
          <input
            value={query}
            onChange={e => {
              const val = e.target.value
              setQuery(val)
              if (searchDebounce.current) clearTimeout(searchDebounce.current)
              searchDebounce.current = setTimeout(() => navigate(filter, 1, val), 400)
            }}
            placeholder={t('posts.searchPlaceholder')}
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
        {filtered.length > 0 ? (
          <div className="pt-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {filtered.map(post => <PostCard key={post.id} post={post} onClick={() => openDetail(post)} />)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 20px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(182,141,64,0.08)', border: '1px solid rgba(182,141,64,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--candle)', opacity: 0.5 }}>search_off</span>
            </div>
            <div style={{ fontFamily: 'var(--font-syne)', fontSize: 18, fontWeight: 700, color: 'var(--sand)', marginBottom: 8 }}>{t('posts.noPostsFound')}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 280 }}>{t('posts.noPostsHint')}</div>
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
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
                  const sc = getStatusConfig(selected.status)
                  return <div style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 400, padding: '3px 8px', borderRadius: 20, background: sc.bg, color: sc.colorAlt, border: sc.border }}>{STATUS_LABELS[selected.status]}</div>
                })()}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => router.push(`/dashboard/post/${selected.id}`)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid var(--border)', color: 'var(--sand)', padding: '6px 12px', borderRadius: 7, cursor: 'pointer', fontFamily: 'var(--font-ibm)', fontSize: 11 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sand)'; e.currentTarget.style.color = 'var(--parchment)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--sand)' }}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 9.5V12h2.5l7-7L9 2.5l-7 7z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                  {t('posts.edit')}
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
                        { val: an(selected).reach >= 1000 ? `${(an(selected).reach/1000).toFixed(1)}k` : an(selected).reach, label: t('posts.reach') },
                        { val: an(selected).likes,    label: t('posts.likes') },
                        { val: an(selected).comments, label: t('posts.comments') },
                        { val: an(selected).engagement_rate ? `${an(selected).engagement_rate}%` : '—', label: t('posts.engRate') },
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
                <div style={{ fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 400, marginBottom: 8, fontFamily: 'var(--font-ibm)' }}>{t('posts.caption')}</div>
                <div style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--sand)', fontWeight: 300, whiteSpace: 'pre-wrap', marginBottom: 16, fontFamily: 'var(--font-ibm)' }}>{selected.caption || '—'}</div>

                {/* Hashtags */}
                <div style={{ fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 400, marginBottom: 8, fontFamily: 'var(--font-ibm)' }}>{t('posts.hashtags')}</div>
                <div style={{ fontSize: 11, color: 'var(--ember)', fontWeight: 300, lineHeight: 1.7, marginBottom: 20, fontFamily: 'var(--font-ibm)' }}>{selected.hashtags || '—'}</div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 16px' }}/>

                {/* Meta */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: t('posts.date'),     val: format(new Date(selected.created_at), 'MMM d, yyyy') },
                    { label: t('posts.template'), val: (selected.generation_metadata as Record<string, string>)?.pool_template_name || '—' },
                    { label: t('posts.aiModel'),  val: 'Claude Sonnet + Haiku', small: true },
                    selected.instagram_permalink
                      ? { label: t('posts.instagram'), val: t('posts.viewPost'), link: selected.instagram_permalink }
                      : { label: t('posts.status'),    val: STATUS_LABELS[selected.status] },
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
                    {t('posts.editReview')}
                  </button>
                  <button onClick={async () => {
                    if (!confirm(t('posts.approveConfirm'))) return
                    const res = await fetch(`/api/posts/${selected.id}/publish`, { method: 'POST' })
                    if (res.ok) { toast.success(t('posts.toastPublished')); closeDetail(); router.refresh() }
                    else { const e = await res.json(); toast.error(e.error || t('posts.toastPublishFailed')) }
                  }}
                    style={{ width: '100%', background: 'transparent', border: '1px solid var(--border)', color: 'var(--sand)', padding: '10px 0', fontFamily: 'var(--font-ibm)', fontSize: 12, cursor: 'pointer', borderRadius: 7 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,168,75,.4)'; e.currentTarget.style.color = 'var(--parchment)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--sand)' }}>
                    {t('posts.approvePublish')}
                  </button>
                </>
              )}
              {selected.status === 'approved' && (
                <button onClick={async () => {
                  if (!confirm(t('posts.publishConfirm'))) return
                  const res = await fetch(`/api/posts/${selected.id}/publish`, { method: 'POST' })
                  if (res.ok) { toast.success(t('posts.toastPublished')); closeDetail(); router.refresh() }
                  else { const e = await res.json(); toast.error(e.error || t('posts.toastPublishFailed')) }
                }}
                  style={{ width: '100%', background: 'var(--candle)', color: '#ffffff', border: 'none', padding: '11px 0', fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 12, letterSpacing: '.05em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 7 }}>
                  {t('posts.publishNow')}
                </button>
              )}
              {selected.status === 'failed' && (
                <button style={{ width: '100%', background: 'transparent', border: '1px solid rgba(224,112,112,.25)', color: '#E07070', padding: '10px 0', fontFamily: 'var(--font-ibm)', fontSize: 12, cursor: 'pointer', borderRadius: 7 }}>
                  {t('posts.retryGeneration')}
                </button>
              )}
              {selected.instagram_permalink && (
                <a href={selected.instagram_permalink} target="_blank" rel="noreferrer"
                  style={{ width: '100%', display: 'block', textAlign: 'center', background: 'transparent', border: '1px solid var(--border)', color: 'var(--sand)', padding: '10px 0', fontFamily: 'var(--font-ibm)', fontSize: 12, cursor: 'pointer', borderRadius: 7, textDecoration: 'none' }}>
                  {t('posts.viewOnInstagram')}
                </a>
              )}
              <button
                onClick={() => deletePost(selected.id)}
                disabled={deleting}
                style={{ width: '100%', marginTop: 4, background: 'transparent', border: '1px solid rgba(192,57,43,.25)', color: 'rgba(192,57,43,.65)', padding: '9px 0', fontFamily: 'var(--font-ibm)', fontSize: 11, cursor: deleting ? 'not-allowed' : 'pointer', borderRadius: 7, opacity: deleting ? 0.5 : 1 }}
                onMouseEnter={e => { if (!deleting) { e.currentTarget.style.borderColor = 'rgba(192,57,43,.6)'; e.currentTarget.style.color = '#c0392b' }}}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(192,57,43,.25)'; e.currentTarget.style.color = 'rgba(192,57,43,.65)' }}>
                {deleting ? t('common.deleting') : t('posts.deletePost')}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
