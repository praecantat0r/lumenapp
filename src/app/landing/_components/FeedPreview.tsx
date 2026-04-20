'use client'
import { useState, useEffect } from 'react'
import { SectionHeader } from './ui'
import { useT } from './LangContext'
import { useBreakpoint } from './useBreakpoint'

const bgs = [
  'linear-gradient(145deg,#3a2815,#1a0e06), radial-gradient(circle at 30% 30%,rgba(212,168,75,0.45),transparent 60%)',
  'linear-gradient(155deg,#2d2418,#0e0e0d), radial-gradient(circle at 70% 20%,rgba(182,141,64,0.38),transparent 60%)',
  'linear-gradient(145deg,#2a1a0c,#0e0e0d), radial-gradient(circle at 20% 80%,rgba(212,168,75,0.3),transparent 60%)',
  'linear-gradient(135deg,#1a1410,#0e0e0d), radial-gradient(circle at 60% 40%,rgba(182,141,64,0.42),transparent 55%)',
  'linear-gradient(155deg,#2f2010,#0e0e0d), radial-gradient(circle at 80% 80%,rgba(212,168,75,0.3),transparent 60%)',
  'linear-gradient(135deg,#281c0e,#0e0e0d), radial-gradient(circle at 30% 60%,rgba(212,168,75,0.38),transparent 55%)',
  'linear-gradient(165deg,#25180a,#0e0e0d), radial-gradient(circle at 50% 30%,rgba(212,168,75,0.35),transparent 55%)',
  'linear-gradient(145deg,#322110,#0e0e0d), radial-gradient(circle at 20% 40%,rgba(212,168,75,0.4),transparent 60%)',
]
const likeCounts = ['2.1k','3.4k','5.7k','1.8k','4.2k','3.1k','2.9k','6.0k']

interface LandingPost { caption: string | null; hashtags: string | null; render_url: string; created_at: string }
interface Post { bg: string; caption: string; likes: string; day: string; imageUrl?: string }

function FeedTile({ post, likesLabel, tileWidth }: { post: Post; likesLabel: string; tileWidth: number }) {
  return (
    <div style={{
      width: tileWidth, flexShrink: 0,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg, #b68d40, #d4a84b)', flexShrink: 0 }}/>
        <span style={{ fontFamily: 'var(--font-ibm)', fontSize: 11, color: 'var(--parchment)', fontWeight: 400 }}>ember.and.oak</span>
        <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--muted)', marginLeft: 'auto' }}>more_horiz</span>
      </div>
      <div style={{ aspectRatio: '1/1', background: post.bg, backgroundSize: 'cover', position: 'relative' }}>
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        <div style={{
          position: 'absolute', top: 8, right: 8, padding: '2px 7px', borderRadius: 9999,
          background: 'rgba(14,14,13,0.75)', backdropFilter: 'blur(10px)',
          fontFamily: 'var(--font-ibm)', fontSize: 8, fontWeight: 700,
          letterSpacing: '0.12em', color: 'var(--candle)',
        }}>AI</div>
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 17, color: 'var(--parchment)' }}>favorite</span>
          <span className="material-symbols-outlined" style={{ fontSize: 17, color: 'var(--parchment)' }}>mode_comment</span>
          <span className="material-symbols-outlined" style={{ fontSize: 17, color: 'var(--parchment)' }}>send</span>
          <span className="material-symbols-outlined" style={{ fontSize: 17, color: 'var(--parchment)', marginLeft: 'auto' }}>bookmark</span>
        </div>
        <div style={{ fontFamily: 'var(--font-ibm)', fontSize: 11, color: 'var(--parchment)', fontWeight: 400 }}>
          <b style={{ fontWeight: 500 }}>{post.likes}</b> {likesLabel} · {post.day}
        </div>
        <p style={{
          margin: '6px 0 0', fontFamily: 'var(--font-syne)', fontStyle: 'italic',
          fontSize: 12, lineHeight: 1.4, color: 'var(--sand)',
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'],
          overflow: 'hidden',
        }}>{post.caption}</p>
      </div>
    </div>
  )
}

function Row({ posts, direction, likesLabel, tileWidth }: { posts: Post[]; direction: 'left' | 'right'; likesLabel: string; tileWidth: number }) {
  const doubled = [...posts, ...posts]
  return (
    <div style={{ display: 'flex', overflow: 'hidden' }}>
      <div style={{
        display: 'flex', gap: 16, padding: '0 8px',
        animation: `feed-marquee-${direction} 50s linear infinite`,
        flexShrink: 0,
      }}>
        {doubled.map((p, i) => <FeedTile key={i} post={p} likesLabel={likesLabel} tileWidth={tileWidth} />)}
      </div>
      <style>{`
        @keyframes feed-marquee-left { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes feed-marquee-right { from{transform:translateX(-50%)} to{transform:translateX(0)} }
      `}</style>
    </div>
  )
}

export function FeedPreview({ density = 'default' }: { density?: string }) {
  const { t } = useT()
  const { isMobile } = useBreakpoint()
  const [dbPosts, setDbPosts] = useState<LandingPost[]>([])

  useEffect(() => {
    fetch('/api/landing/posts?limit=16')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.posts)) setDbPosts(d.posts) })
      .catch(() => {})
  }, [])

  const count = density === 'dense' ? 8 : density === 'sparse' ? 4 : 6
  const tileWidth = isMobile ? 180 : 240

  const allPosts: Post[] = dbPosts.length > 0
    ? dbPosts.map((p, i) => ({
        bg: bgs[i % bgs.length],
        caption: p.caption?.split('\n\n')[0] ?? '',
        likes: likeCounts[i % likeCounts.length],
        day: t.feed.days[i % t.feed.days.length],
        imageUrl: p.render_url,
      }))
    : t.feed.captions.map((caption, i) => ({
        bg: bgs[i],
        caption,
        likes: likeCounts[i],
        day: t.feed.days[i],
      }))

  const posts = allPosts.slice(0, Math.max(count, 4))

  return (
    <section style={{ padding: isMobile ? '72px 0' : '120px 0', position: 'relative', overflow: 'hidden' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: isMobile ? '0 20px' : '0 32px' }}>
        <SectionHeader
          eyebrow={t.feed.eyebrow}
          title={<>{t.feed.title_1} <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--candle)' }}>{t.feed.title_2}</span>{t.feed.title_3}</>}
          subtitle={t.feed.sub}
          center
        />
      </div>

      <div style={{ marginTop: 64, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: isMobile ? 60 : 120, zIndex: 2, pointerEvents: 'none', background: 'linear-gradient(90deg, var(--carbon), transparent)' }}/>
        <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: isMobile ? 60 : 120, zIndex: 2, pointerEvents: 'none', background: 'linear-gradient(-90deg, var(--carbon), transparent)' }}/>
        <Row posts={posts} direction="left" likesLabel={t.feed.likes} tileWidth={tileWidth} />
        <div style={{ height: 16 }}/>
        <Row posts={[...posts].reverse()} direction="right" likesLabel={t.feed.likes} tileWidth={tileWidth} />
      </div>
    </section>
  )
}
