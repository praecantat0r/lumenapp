'use client'
import { useRef, useState } from 'react'
import { useT } from './LangContext'
import { useBreakpoint } from './useBreakpoint'

export function VideoPreview() {
  const { t, lang } = useT()
  const { isMobile } = useBreakpoint()
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  function handlePlay() {
    setPlaying(true)
    videoRef.current?.play()
  }

  return (
    <section id="video" style={{ padding: isMobile ? '0 20px 72px' : '0 32px 120px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{
          position: 'relative', aspectRatio: '16/9', borderRadius: isMobile ? 12 : 16, overflow: 'hidden',
          border: '1px solid var(--border)',
          background: '#0e0e0d',
          boxShadow: '0 50px 140px -30px rgba(0,0,0,0.7)',
        }}>
          <video
            ref={videoRef}
            src={lang === 'sk'
              ? 'https://uwhlwsbssdphtpcbxeuy.supabase.co/storage/v1/object/public/brand-assets/landing/PromoSnappy.mp4'
              : 'https://uwhlwsbssdphtpcbxeuy.supabase.co/storage/v1/object/public/brand-assets/landing/PromoSnappyEN.mp4'
            }
            controls
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {!playing && (
            <div
              onClick={handlePlay}
              style={{
                position: 'absolute', inset: 0, cursor: 'pointer',
                background: 'linear-gradient(135deg, #1c1510 0%, #0e0e0d 65%), radial-gradient(circle at 30% 40%, rgba(212,168,75,0.25), transparent 55%)',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(14,14,13,0) 0%, rgba(14,14,13,0.5) 100%)' }}/>
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
              }}>
                <div style={{
                  width: isMobile ? 60 : 84, height: isMobile ? 60 : 84, borderRadius: '50%',
                  background: 'var(--candle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 60px rgba(212,168,75,0.5)',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: isMobile ? 28 : 38, color: '#0e0e0d', fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                </div>
                <div style={{
                  fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: isMobile ? 16 : 22,
                  letterSpacing: '-0.02em', color: 'var(--candle)',
                  textAlign: 'center', padding: '0 20px',
                }}>{t.video.play}</div>
              </div>
              <div style={{
                position: 'absolute', bottom: isMobile ? 16 : 24, left: isMobile ? 16 : 24, right: isMobile ? 16 : 24,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontFamily: 'var(--font-ibm)', fontSize: isMobile ? 10 : 11, color: 'var(--sand)',
                letterSpacing: '0.1em', textTransform: 'uppercase', flexWrap: 'wrap', gap: 8,
              }}>
                <span>{t.video.tagLeft}</span>
                <span>{t.video.tagRight}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
