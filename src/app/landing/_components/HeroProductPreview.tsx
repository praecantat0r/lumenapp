'use client'
import { useState, useEffect, useRef } from 'react'
import { useT } from './LangContext'
import { useBreakpoint } from './useBreakpoint'

interface LandingPost { caption: string | null; hashtags: string | null; render_url: string }

function AgentDot({ active }: { active: boolean }) {
  return (
    <span style={{
      position: 'relative', width: 8, height: 8, borderRadius: '50%',
      background: active ? 'var(--candle)' : 'rgba(78,69,56,0.65)',
      flexShrink: 0, transition: 'background .3s', display: 'inline-block',
    }}>
      {active && (
        <span style={{
          position: 'absolute', inset: -4, borderRadius: '50%',
          border: '1px solid var(--candle)',
          animation: 'pp-pulse 1.4s ease-out infinite',
        }}/>
      )}
      <style>{`@keyframes pp-pulse { 0%{transform:scale(.8);opacity:1} 100%{transform:scale(1.8);opacity:0} }`}</style>
    </span>
  )
}

const DEFAULT_CAPTIONS = {
  sk: 'Sloboda sa začína tam, kde sa končí asfalt. 🛣️\n\nKonvertibilný Ford Mustang nie je len auto — je to pozvánka na cestu bez plánu. Otvorená strecha, zvuk motora a krajina, ktorá sa roztvára pred tebou. Či už hľadáš adrenalín alebo chvíľu útechy od každodenného života, Mustang ti ju dá.\n\nV FastMotors ti pomôžeme nájsť presne ten Ford, ktorý ti zmení spôsob, ako jazdíš. A keď príde čas na údržbu alebo servis, my sa o neho postaráme s maximálnou starostlivosťou.',
  en: 'Freedom begins where the asphalt ends. 🛣️\n\nThe Ford Mustang convertible isn\'t just a car — it\'s an invitation to a journey without a plan. Open roof, the sound of the engine, and the landscape unfolding before you. Whether you\'re chasing adrenaline or a moment of escape from everyday life, the Mustang delivers.\n\nAt FastMotors, we\'ll help you find exactly the Ford that changes how you drive. And when it\'s time for maintenance or service, we\'ll take care of it with the utmost attention.',
}

const DEFAULT_TAGS = {
  sk: ['#mustang', '#open road', '#jazda', '#sloboda'],
  en: ['#mustang', '#openroad', '#drive', '#freedom'],
}

export function HeroProductPreview() {
  const { t, lang } = useT()
  const { isMobile } = useBreakpoint()

  const postsRef = useRef<LandingPost[]>([])
  const postIdxRef = useRef(0)

  const [stage, setStage] = useState(0)
  const [caption, setCaption] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>(DEFAULT_TAGS[lang as 'sk' | 'en'] ?? DEFAULT_TAGS.en)
  const [overlayText, setOverlayText] = useState('')

  useEffect(() => {
    fetch('/api/landing/posts?limit=8')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.posts)) postsRef.current = d.posts })
      .catch(() => {})
  }, [])

  useEffect(() => {
    let typeTimer: ReturnType<typeof setInterval> | null = null
    let stage1Timer: ReturnType<typeof setTimeout> | null = null
    let stage2Timer: ReturnType<typeof setTimeout> | null = null
    let loopTimer: ReturnType<typeof setInterval> | null = null

    const defaultCaption = DEFAULT_CAPTIONS[lang as 'sk' | 'en'] ?? DEFAULT_CAPTIONS.en
    const defaultTags = DEFAULT_TAGS[lang as 'sk' | 'en'] ?? DEFAULT_TAGS.en

    const runOnce = () => {
      if (typeTimer) clearInterval(typeTimer)
      if (stage1Timer) clearTimeout(stage1Timer)
      if (stage2Timer) clearTimeout(stage2Timer)

      const posts = postsRef.current
      const post = posts.length > 0 ? posts[postIdxRef.current % posts.length] : null
      postIdxRef.current += 1

      const captionToType = post?.caption?.split('\n\n')[0] ?? defaultCaption
      const postImageUrl = post?.render_url ?? null

      const parsedTags = post?.hashtags
        ? (post.hashtags.match(/#[\w\u00C0-\u017E]+/g)?.slice(0, 4) ?? defaultTags)
        : defaultTags

      setImageUrl(postImageUrl)
      setTags(parsedTags)
      setOverlayText(captionToType.split('\n')[0].slice(0, 60) + '…')

      let i = 0
      setCaption('')
      setStage(0)
      typeTimer = setInterval(() => {
        i++
        if (i <= captionToType.length) {
          setCaption(captionToType.slice(0, i))
        } else {
          if (typeTimer) clearInterval(typeTimer)
        }
      }, 45)
      stage1Timer = setTimeout(() => setStage(1), 3500)
      stage2Timer = setTimeout(() => setStage(2), 5800)
    }

    runOnce()
    loopTimer = setInterval(runOnce, 32000)

    return () => {
      if (loopTimer) clearInterval(loopTimer)
      if (typeTimer) clearInterval(typeTimer)
      if (stage1Timer) clearTimeout(stage1Timer)
      if (stage2Timer) clearTimeout(stage2Timer)
    }
  }, [lang])

  return (
    <div style={{
      position: 'relative',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 40px 120px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(182,141,64,0.08)',
    }}>
      {/* window chrome */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
        borderBottom: '1px solid var(--border)', background: 'var(--surface-2)',
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0,1,2].map(i => <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: '#3a3530', display: 'block' }}/>)}
        </div>
        <div style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-ibm)', fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em' }}>
          {t.preview.url}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        minHeight: isMobile ? 'auto' : 380,
      }}>
        {/* LEFT — caption agent */}
        <div style={{
          padding: isMobile ? 16 : 24,
          borderRight: isMobile ? 'none' : '1px solid var(--border)',
          borderBottom: isMobile ? '1px solid var(--border)' : 'none',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AgentDot active={stage === 0} />
            <span style={{
              fontFamily: 'var(--font-ibm)', fontSize: 10, letterSpacing: '0.15em',
              textTransform: 'uppercase', color: stage === 0 ? 'var(--candle)' : 'var(--muted)',
            }}>{t.preview.writing}</span>
          </div>

          <div style={{
            padding: 16, borderRadius: 10,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            minHeight: isMobile ? 120 : 200,
            fontFamily: 'var(--font-syne)', fontStyle: 'italic',
            fontSize: isMobile ? 15 : 17, lineHeight: 1.45, color: 'var(--candle)',
            textWrap: 'pretty' as React.CSSProperties['textWrap'],
            whiteSpace: 'pre-wrap',
          }}>
            &ldquo;{caption}
            {stage === 0 && (
              <span style={{
                display: 'inline-block', width: 2, height: 18,
                marginLeft: 2, verticalAlign: 'middle',
                background: 'var(--candle)',
                animation: 'pp-caret 1s steps(2, end) infinite',
              }}/>
            )}
            {stage > 0 && '\u201d'}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tags.map((tg, i) => (
              <span key={tg} style={{
                padding: '4px 10px', borderRadius: 9999,
                fontFamily: 'var(--font-ibm)', fontSize: 10,
                background: stage >= 1 ? 'rgba(182,141,64,0.12)' : 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: stage >= 1 ? 'var(--candle)' : 'var(--muted)',
                opacity: stage >= 1 ? 1 : 0.5,
                transition: 'opacity .4s, color .4s, background .4s',
                transitionDelay: `${i * 80}ms`,
              }}>{tg}</span>
            ))}
          </div>
        </div>

        {/* RIGHT — image agent */}
        <div style={{ padding: isMobile ? 16 : 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AgentDot active={stage === 1} />
            <span style={{
              fontFamily: 'var(--font-ibm)', fontSize: 10, letterSpacing: '0.15em',
              textTransform: 'uppercase', color: stage === 1 ? 'var(--candle)' : 'var(--muted)',
            }}>{t.preview.generating}</span>
          </div>

          <div style={{
            position: 'relative',
            aspectRatio: isMobile ? '4/3' : '3/4',
            borderRadius: 10,
            overflow: 'hidden', border: '1px solid var(--border)',
            background: 'var(--surface-2)', flex: isMobile ? 'none' : 1,
          }}>
            {stage === 1 && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 2,
                background: 'linear-gradient(90deg, transparent, rgba(212,168,75,0.2), transparent)',
                animation: 'pp-shimmer 1.8s linear infinite',
              }}/>
            )}
            <img
              src={imageUrl ?? '/sample_post.png'}
              alt="Generated post"
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%', objectFit: 'cover',
                opacity: stage === 2 ? 1 : 0,
                transition: 'opacity 1s ease',
                display: 'block',
              }}
            />
            {stage === 2 && (
              <>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.6) 100%)',
                  zIndex: 1,
                }}/>
                <div style={{
                  position: 'absolute', bottom: 14, left: 14, right: 14, zIndex: 2,
                  fontFamily: 'var(--font-syne)', fontStyle: 'italic',
                  fontSize: 13, color: '#f6f2ea', lineHeight: 1.3,
                  textShadow: '0 2px 18px rgba(0,0,0,0.8)',
                  animation: 'pp-fade .5s',
                }}>{overlayText}</div>
                <div style={{
                  position: 'absolute', top: 12, left: 12, zIndex: 2,
                  padding: '3px 8px', borderRadius: 9999,
                  background: 'rgba(110,191,139,0.2)', backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(110,191,139,0.3)',
                  fontFamily: 'var(--font-ibm)', fontSize: 8,
                  letterSpacing: '0.12em', color: '#6EBF8B', fontWeight: 700,
                  animation: 'pp-fade .5s',
                }}>{t.preview.ready}</div>
              </>
            )}
            {stage < 1 && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontSize: 11,
                letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>{t.preview.awaiting}</div>
            )}
          </div>

          <button style={{
            padding: '10px 16px', borderRadius: 9999, border: 'none',
            background: stage === 2 ? 'var(--candle)' : 'var(--surface-2)',
            color: stage === 2 ? '#fff' : 'var(--muted)',
            fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 12,
            cursor: stage === 2 ? 'pointer' : 'not-allowed',
            transition: 'background .4s, color .4s',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              {stage === 2 ? 'publish' : 'lock'}
            </span>
            {stage === 2 ? t.preview.publish : t.preview.pipelineLocked}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pp-caret { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pp-shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        @keyframes pp-fade { from{opacity:0} to{opacity:1} }
      `}</style>
    </div>
  )
}
