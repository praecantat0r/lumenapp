'use client'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import type { Post } from '@/types'
import { getStatusConfig } from '@/lib/post-status'
import { useLanguage } from '@/lib/i18n/context'

const ASSET_TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  product_photo: { icon: 'inventory_2',     color: '#b68d40' },
  label:         { icon: 'sell',            color: '#7AABFF' },
  logo:          { icon: 'brand_awareness', color: '#6EBF8B' },
  photo:         { icon: 'landscape',       color: '#c9c2b5' },
  place_photo:   { icon: 'storefront',      color: '#ffb77d' },
  icon:          { icon: 'emoji_objects',   color: '#f4c430' },
  other:         { icon: 'category',        color: '#989084' },
}

const STATUS_LABELS: Record<string, string> = {
  pending_review: 'PENDING REVIEW',
  approved:       'APPROVED',
  published:      'PUBLISHED',
  failed:         'FAILED',
  generating:     'GENERATING',
}

export function PostCard({ post, onClick }: { post: Post; onClick?: () => void }) {
  const router = useRouter()
  const { t }  = useLanguage()
  const sc     = getStatusConfig(post.status)
  const s      = { color: sc.color, bg: sc.cardBg, border: sc.cardBorder, icon: sc.icon, label: STATUS_LABELS[post.status] ?? post.status.toUpperCase() }
  const an     = (post.analytics || {}) as Record<string, number>
  const isGen  = post.status === 'generating'
  const meta   = (post.generation_metadata || {}) as Record<string, string>
  const assetTypeIcon =
    !meta.asset_mode || meta.asset_mode === 'original'
      ? { icon: 'auto_awesome', color: 'var(--candle)' }
      : meta.asset_type && ASSET_TYPE_CONFIG[meta.asset_type]
        ? ASSET_TYPE_CONFIG[meta.asset_type]
        : { icon: 'photo_library', color: 'var(--sand)' }

  function handleClick() {
    if (onClick) { onClick(); return }
    router.push(`/dashboard/post/${post.id}`)
  }

  return (
    <>
      <style>{`
        @keyframes post-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes post-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .pc-card { transition: box-shadow 0.5s, border-color 0.3s; }
        .pc-card:hover { box-shadow: 0 20px 60px rgba(0,0,0,0.5) !important; border-color: rgba(78,69,56,0.15) !important; }
        .pc-card:hover .pc-img { transform: scale(1.05); }
        .pc-img { transition: transform 0.7s ease; }
        .pc-action { transition: background 0.15s; }
        .pc-action:hover { background: rgba(78,69,56,0.4) !important; }
        .pc-action-gold:hover { background: rgba(182,141,64,0.2) !important; }
        [data-theme="light"] .pc-type-icon { background: rgba(255,255,255,0.82) !important; border-color: rgba(210,197,179,0.5) !important; }
        [data-theme="light"] .pc-type-icon span { color: #7b580d !important; }
      `}</style>

      <div
        className="pc-card"
        onClick={handleClick}
        style={{
          background: 'var(--surface-2)',
          borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
          border: '1px solid rgba(78,69,56,0.08)',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}
      >
        {/* Image area */}
        <div style={{ aspectRatio: '1/1', position: 'relative', overflow: 'hidden', background: 'var(--surface-3)', flexShrink: 0 }}>
          {post.render_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.render_url}
              alt="Post"
              className="pc-img"
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', opacity: 0.9 }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              ...(isGen ? { backgroundImage: 'linear-gradient(110deg,var(--surface) 30%,var(--surface-2) 50%,var(--surface) 70%)', backgroundSize: '200% 100%', animation: 'post-shimmer 1.8s ease-in-out infinite' } : {}),
            }}>
              {isGen ? (
                <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--candle)', animation: 'post-spin 1.4s linear infinite', display: 'inline-block' }}>autorenew</span>
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--muted)', opacity: 0.3 }}>image</span>
              )}
            </div>
          )}

          {/* Status badge — top left */}
          <div style={{
            position: 'absolute', top: 14, left: 14,
            display: 'flex', alignItems: 'center', gap: 5,
            background: s.bg, backdropFilter: 'blur(12px)',
            borderRadius: 9999, padding: '4px 10px 4px 8px',
            border: `1px solid ${s.border}`,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13, color: s.color, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
            <span style={{ fontSize: 9, letterSpacing: '0.1em', color: s.color, fontWeight: 700 }}>{s.label}</span>
          </div>

          {/* Asset type icon — top right */}
          <div className="pc-type-icon" style={{
            position: 'absolute', top: 14, right: 14,
            background: 'rgba(14,14,13,0.8)', backdropFilter: 'blur(12px)',
            borderRadius: '50%', padding: 7,
            border: '1px solid rgba(78,69,56,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: assetTypeIcon.color, fontVariationSettings: "'FILL' 1" }}>{assetTypeIcon.icon}</span>
          </div>

        </div>

        {/* Body */}
        <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Caption */}
          {post.caption ? (
            <p style={{
              fontSize: 13, lineHeight: 1.65, color: 'var(--parchment)',
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
              overflow: 'hidden', fontStyle: 'italic', flex: 1, marginBottom: 20,
              opacity: 0.9, fontWeight: 500,
            }}>
              &ldquo;{post.caption.trim()}&rdquo;
            </p>
          ) : post.status === 'generating' ? (
            <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', flex: 1, marginBottom: 20 }}>{t('posts.cardGenerating')}</p>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', flex: 1, marginBottom: 20 }}>{t('posts.cardNoCaption')}</p>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(78,69,56,0.1)', paddingTop: 14, marginTop: 'auto' }}>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500 }}>
              {post.status === 'failed' ? (
                <span style={{ color: '#ffb4ab' }}>{t('posts.cardApiError')}</span>
              ) : (
                format(new Date(post.created_at), 'MMM d, yyyy')
              )}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {post.status === 'pending_review' && (
                <>
                  <button
                    className="pc-action"
                    onClick={e => { e.stopPropagation(); router.push(`/dashboard/post/${post.id}`) }}
                    style={{ padding: 6, borderRadius: 9999, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', color: 'var(--sand)' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                  </button>
                  <button
                    className="pc-action-gold"
                    onClick={e => { e.stopPropagation() }}
                    style={{ padding: 6, borderRadius: 9999, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', color: 'var(--candle)' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </button>
                </>
              )}
              {post.status === 'approved' && (
                <button
                  className="pc-action-gold"
                  onClick={e => { e.stopPropagation() }}
                  style={{ padding: 6, borderRadius: 9999, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', color: 'var(--candle)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </button>
              )}
              {post.status === 'published' && (
                <>
                  {an.likes ? <span style={{ fontSize: 10, color: 'var(--sand)', display: 'flex', alignItems: 'center', gap: 3 }}>❤ {an.likes}</span> : null}
                  {an.engagement_rate ? <span style={{ fontSize: 10, color: 'var(--candle)' }}>{an.engagement_rate}%</span> : null}
                  <button
                    className="pc-action"
                    onClick={e => { e.stopPropagation() }}
                    style={{ padding: 6, borderRadius: 9999, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', color: 'var(--sand)' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>visibility</span>
                  </button>
                  <button
                    className="pc-action"
                    onClick={e => { e.stopPropagation() }}
                    style={{ padding: 6, borderRadius: 9999, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', color: 'var(--sand)' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>bar_chart</span>
                  </button>
                </>
              )}
              {post.status === 'failed' && (
                <button
                  className="pc-action"
                  onClick={e => { e.stopPropagation() }}
                  style={{ padding: 6, borderRadius: 9999, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', color: '#ffb4ab' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
