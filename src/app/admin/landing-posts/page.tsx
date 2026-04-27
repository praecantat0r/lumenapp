'use client'
import { useEffect, useState, useCallback } from 'react'

interface AdminPost {
  id: string
  caption: string | null
  render_url: string
  created_at: string
  featured_on_landing: boolean
  user_id: string
}

const PAGE_SIZE = 24

export default function LandingPostsAdmin() {
  const [posts, setPosts] = useState<AdminPost[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback((p: number) => {
    setLoading(true)
    setError(null)
    fetch(`/api/admin/landing-posts?page=${p}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else {
          setPosts(d.posts ?? [])
          setTotal(d.total ?? 0)
          setPage(p)
        }
      })
      .catch(() => setError('Failed to load posts'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(0) }, [load])

  async function toggle(post: AdminPost) {
    setToggling(post.id)
    try {
      const res = await fetch('/api/admin/landing-posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post.id, featured: !post.featured_on_landing }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setPosts(prev => prev.map(p =>
        p.id === post.id ? { ...p, featured_on_landing: !p.featured_on_landing } : p
      ))
    } catch (e: any) {
      alert(e.message || 'Failed to update')
    } finally {
      setToggling(null)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const featuredCount = posts.filter(p => p.featured_on_landing).length

  return (
    <div style={{ padding: '32px 24px', flex: 1, overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: 24, fontWeight: 700, color: 'var(--parchment)', margin: 0 }}>
            Landing Page Posts
          </h1>
          <p style={{ color: 'var(--sand)', fontSize: 14, marginTop: 6, marginBottom: 0 }}>
            Select which posts appear in the feed preview on the landing page.
            {featuredCount > 0 && <span style={{ color: 'var(--candle)', marginLeft: 8 }}>{featuredCount} featured on this page</span>}
          </p>
        </div>
        {total > 0 && (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {total} post{total !== 1 ? 's' : ''} total
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ color: '#f87171', fontSize: 14, padding: '12px 16px', background: 'rgba(248,113,113,0.08)', borderRadius: 8, border: '1px solid rgba(248,113,113,0.2)', marginBottom: 24 }}>
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', opacity: 0.5 }}>
              <div style={{ aspectRatio: '1/1', background: 'var(--surface-2)' }} />
              <div style={{ padding: '10px 12px 12px' }}>
                <div style={{ height: 10, background: 'var(--border)', borderRadius: 4, width: '40%', marginBottom: 8 }} />
                <div style={{ height: 10, background: 'var(--border)', borderRadius: 4, width: '80%', marginBottom: 4 }} />
                <div style={{ height: 10, background: 'var(--border)', borderRadius: 4, width: '60%', marginBottom: 10 }} />
                <div style={{ height: 32, background: 'var(--border)', borderRadius: 8 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && posts.length === 0 && (
        <div style={{ color: 'var(--sand)', fontSize: 14 }}>No posts with rendered images found.</div>
      )}

      {/* Grid */}
      {!loading && posts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              toggling={toggling === post.id}
              onToggle={() => toggle(post)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 40, paddingBottom: 8 }}>
          <PageButton onClick={() => load(0)} disabled={page === 0 || loading} label="«" />
          <PageButton onClick={() => load(page - 1)} disabled={page === 0 || loading} label="‹" />

          {Array.from({ length: totalPages }, (_, i) => i)
            .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 2)
            .reduce<(number | 'gap')[]>((acc, i, idx, arr) => {
              if (idx > 0 && i - (arr[idx - 1] as number) > 1) acc.push('gap')
              acc.push(i)
              return acc
            }, [])
            .map((item, i) =>
              item === 'gap'
                ? <span key={`gap-${i}`} style={{ color: 'var(--muted)', fontSize: 13, padding: '0 4px' }}>…</span>
                : <PageButton
                    key={item}
                    onClick={() => load(item as number)}
                    disabled={loading}
                    label={String((item as number) + 1)}
                    active={item === page}
                  />
            )
          }

          <PageButton onClick={() => load(page + 1)} disabled={page >= totalPages - 1 || loading} label="›" />
          <PageButton onClick={() => load(totalPages - 1)} disabled={page >= totalPages - 1 || loading} label="»" />
        </div>
      )}
    </div>
  )
}

function PageButton({ onClick, disabled, label, active }: { onClick: () => void; disabled: boolean; label: string; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 36, height: 36, padding: '0 10px', borderRadius: 8, border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'var(--font-syne)', fontWeight: 600, fontSize: 13,
        transition: 'background 0.15s, color 0.15s',
        ...(active
          ? { background: 'var(--candle)', color: '#111009' }
          : disabled
            ? { background: 'transparent', color: 'var(--border)' }
            : { background: 'rgba(255,255,255,0.05)', color: 'var(--sand)' }
        ),
      }}
    >
      {label}
    </button>
  )
}

function PostCard({ post, toggling, onToggle }: { post: AdminPost; toggling: boolean; onToggle: () => void }) {
  const date = new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const caption = post.caption?.split('\n\n')[0]?.slice(0, 80)

  return (
    <div style={{
      background: 'var(--surface)',
      border: post.featured_on_landing ? '1.5px solid var(--candle)' : '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
      transition: 'border-color 0.2s',
      position: 'relative',
    }}>
      {post.featured_on_landing && (
        <div style={{
          position: 'absolute', top: 8, left: 8, zIndex: 2,
          background: 'var(--candle)', color: '#111009',
          fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
          padding: '3px 8px', borderRadius: 9999,
        }}>
          FEATURED
        </div>
      )}

      <div style={{ aspectRatio: '1/1', background: 'var(--surface-2)' }}>
        <img
          src={post.render_url}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>

      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>{date}</div>
        {caption && (
          <p style={{
            fontSize: 12, color: 'var(--sand)', margin: '0 0 10px', lineHeight: 1.4,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'],
          }}>
            {caption}
          </p>
        )}

        <button
          onClick={onToggle}
          disabled={toggling}
          style={{
            width: '100%', padding: '8px 0', borderRadius: 8, border: 'none',
            cursor: toggling ? 'wait' : 'pointer',
            fontFamily: 'var(--font-syne)', fontWeight: 600, fontSize: 12,
            transition: 'background 0.2s, color 0.2s',
            ...(post.featured_on_landing
              ? { background: 'rgba(182,141,64,0.12)', color: 'var(--candle)' }
              : { background: 'rgba(255,255,255,0.05)', color: 'var(--sand)' }
            ),
          }}
        >
          {toggling ? '…' : post.featured_on_landing ? 'Remove from page' : 'Add to landing page'}
        </button>
      </div>
    </div>
  )
}
