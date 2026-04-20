'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GeneratingModal } from './GeneratingModal'
import { GeneratePostModal } from './GeneratePostModal'
import type { Post, BrandAsset } from '@/types'
import toast from 'react-hot-toast'

const STEPS = [
  'Analyzing brand identity…',
  'Crafting visual concept…',
  'Generating image…',
  'Writing caption…',
  'Composing final design…',
]

export function OverviewPendingPost({ posts }: { posts: Post[] }) {
  const [generating, setGenerating] = useState(false)
  const [step, setStep]             = useState(STEPS[0])
  const [showAll, setShowAll]       = useState(false)
  const [visibleCount, setVisibleCount] = useState(4)
  const [showModal, setShowModal]   = useState(false)
  const [brandAssets, setBrandAssets] = useState<BrandAsset[]>([])
  const scrollWrapperRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!showModal) return
    fetch('/api/brand-brain/assets').then(r => r.ok ? r.json() : []).then(d => setBrandAssets(Array.isArray(d) ? d : [])).catch(() => {})
  }, [showModal])

  // Dynamically calculate how many full cards fit in the scroll wrapper
  useEffect(() => {
    const el = scrollWrapperRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect()
      if (height < 10 || width < 10) return
      const gap = 10
      const cardWidth = height * (4 / 5)
      const count = Math.max(1, Math.floor((width + gap) / (cardWidth + gap)))
      setVisibleCount(count)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  async function generatePost(config: { assetMode: 'original' | 'auto' | 'specific' | 'composite'; assetUrl?: string; assetName?: string; assetType?: string; assetDescription?: string; scenicAssetUrl?: string; scenicAssetName?: string; scenicAssetDescription?: string; productAssetUrl?: string; productAssetName?: string; productAssetDescription?: string }) {
    setShowModal(false)
    setGenerating(true)
    setStep(STEPS[0])
    let stepIdx = 0
    const stepInterval = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, STEPS.length - 1)
      setStep(STEPS[stepIdx])
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
      const { post_id } = await res.json()

      const pollInterval = setInterval(async () => {
        try {
          const s = await fetch(`/api/posts/${post_id}/status`)
          const d = await s.json()
          if (d.status === 'pending_review' || d.status === 'failed') {
            clearInterval(pollInterval)
            clearInterval(stepInterval)
            setGenerating(false)
            if (d.status === 'pending_review') { toast.success('Post ready for review.'); router.refresh() }
            else toast.error('Generation failed.')
          }
        } catch { /* ignore */ }
      }, 3000)
    } catch (err: unknown) {
      clearInterval(stepInterval)
      toast.error(err instanceof Error ? err.message : 'Generation failed')
      setGenerating(false)
    }
  }

  /* ── Empty state ── */
  if (posts.length === 0) {
    return (
      <div style={{ height: '100%' }}>
        {showModal && (
          <GeneratePostModal
            brandAssets={brandAssets}
            onGenerate={generatePost}
            onClose={() => setShowModal(false)}
          />
        )}
        {generating && <GeneratingModal step={step} />}
        <div style={{
          height: '100%', boxSizing: 'border-box',
          borderRadius: 20,
          border: '1.5px dashed rgba(78,69,56,0.22)',
          padding: '20px 32px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18,
          background: 'transparent',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'rgba(182,141,64,0.09)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(182,141,64,0.2)',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--candle)', fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-syne)', fontSize: 16, fontWeight: 700, color: 'var(--parchment)', marginBottom: 7, letterSpacing: '-0.02em' }}>
              No posts pending review
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 300, fontFamily: 'var(--font-ibm)' }}>
              Generate one and Lumen will write, design, and prepare it for you automatically.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            disabled={generating}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', background: 'rgba(182,141,64,0.12)',
              color: 'var(--candle)', border: '1px solid rgba(182,141,64,0.25)',
              borderRadius: 9999, fontSize: 13, fontWeight: 700,
              fontFamily: 'var(--font-syne)',
              cursor: generating ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            Generate Post
          </button>
        </div>
        <style>{`@keyframes ov-blink{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
      </div>
    )
  }

  /* ── Post cards ── */
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {showModal && (
        <GeneratePostModal
          brandAssets={brandAssets}
          onGenerate={generatePost}
          onClose={() => setShowModal(false)}
        />
      )}
      {generating && <GeneratingModal step={step} />}

      <style>{`.ov-extra-btns { display: flex; } @media (max-width: 767px) { .ov-extra-btns { display: none !important; } }`}</style>

      {/* Single flex row — fills all remaining height, cards derive width from height via aspect-ratio */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 10, alignItems: 'stretch' }}>

        {/* Cards — exactly as many as fit, no partial cards */}
        <div ref={scrollWrapperRef} style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ height: '100%', display: 'flex', gap: 10 }}>
            {(showAll ? posts : posts.slice(0, visibleCount)).map(post => (
              <div
                key={post.id}
                style={{
                  flexShrink: 0,
                  height: '100%',
                  aspectRatio: '4/5',
                  borderRadius: 14,
                  overflow: 'hidden',
                  position: 'relative',
                  background: 'var(--surface)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                  transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.22s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 36px rgba(0,0,0,0.28)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.18)' }}
              >
                {post.render_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.render_url} alt="Post preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--muted)', opacity: 0.35 }}>image</span>
                  </div>
                )}

                {/* Bottom overlay — buttons */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)', padding: '32px 8px 8px', display: 'flex', gap: 6 }}>
                  <button
                    onClick={e => { e.stopPropagation(); router.push(`/dashboard/post/${post.id}`) }}
                    style={{ flex: 1, padding: '5px 0', borderRadius: 8, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.22)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ibm)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.28)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
                  >Edit</button>
                  <button
                    onClick={async e => {
                      e.stopPropagation()
                      if (!confirm('Approve and publish this post to Instagram?')) return
                      const res = await fetch(`/api/posts/${post.id}/publish`, { method: 'POST' })
                      if (res.ok) { toast.success('Published!'); router.refresh() }
                      else { const d = await res.json(); toast.error(d.error || 'Publish failed') }
                    }}
                    style={{ flex: 1, padding: '5px 0', borderRadius: 8, background: 'var(--candle)', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ibm)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--ember)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--candle)')}
                  >Approve</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel: New post + Show more — same height as cards, hidden on mobile */}
        <div className="ov-extra-btns" style={{ flexShrink: 0, gap: 10, alignItems: 'stretch', height: '100%' }}>
          <button
            onClick={() => setShowModal(true)}
            disabled={generating}
            style={{ height: '100%', aspectRatio: '4/5', borderRadius: 14, border: '2px dashed rgba(78,69,56,0.22)', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--muted)', padding: '24px', transition: 'border-color 0.2s, color 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(182,141,64,0.38)'; e.currentTarget.style.color = 'var(--candle)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(78,69,56,0.22)'; e.currentTarget.style.color = 'var(--muted)' }}
          >
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: '1.5px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>add</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-ibm)', letterSpacing: '0.01em' }}>New post</span>
          </button>

          {posts.length > visibleCount && (
            <button
              onClick={() => setShowAll(v => !v)}
              style={{ height: '100%', aspectRatio: '4/5', borderRadius: 14, border: '2px dashed rgba(78,69,56,0.22)', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--muted)', padding: '24px', transition: 'border-color 0.2s, color 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(182,141,64,0.38)'; e.currentTarget.style.color = 'var(--candle)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(78,69,56,0.22)'; e.currentTarget.style.color = 'var(--muted)' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: '50%', border: '1.5px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{showAll ? 'expand_less' : 'more_horiz'}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-ibm)', letterSpacing: '0.01em', textAlign: 'center' }}>
                {showAll ? 'Show less' : `+${posts.length - visibleCount} more`}
              </span>
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes ov-blink{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  )
}
