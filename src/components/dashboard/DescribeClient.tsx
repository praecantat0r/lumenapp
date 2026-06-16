'use client'
import { useState } from 'react'
import { useGeneratePost } from '@/hooks/useGeneratePost'

const GEN_STEPS = [
  'Expanding your description…',
  'Generating image…',
  'Rendering post…',
]

export function DescribeClient() {
  const [describeInput, setDescribeInput] = useState('')
  const [variations, setVariations] = useState<string[]>([])
  const [activeVariation, setActiveVariation] = useState(0)
  const [editedPrompt, setEditedPrompt] = useState('')
  const [enhancing, setEnhancing] = useState(false)
  const [enhanceError, setEnhanceError] = useState('')
  const [done, setDone] = useState(false)
  const [genError, setGenError] = useState('')
  const [phase, setPhase] = useState<'input' | 'variations'>('input')

  const { generating, genStep, generatePost } = useGeneratePost(
    GEN_STEPS,
    () => setDone(true),
    (msg) => setGenError(msg),
  )

  async function handleEnhance() {
    setEnhancing(true)
    setEnhanceError('')
    try {
      const res = await fetch('/api/generate/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: describeInput }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to enhance')
      setVariations(data.variations)
      setActiveVariation(0)
      setEditedPrompt(data.variations[0])
      setPhase('variations')
    } catch (err) {
      setEnhanceError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setEnhancing(false)
    }
  }

  function goVariation(dir: 1 | -1) {
    const next = (activeVariation + dir + variations.length) % variations.length
    setActiveVariation(next)
    setEditedPrompt(variations[next])
  }

  function handleGenerate() {
    setGenError('')
    generatePost({ assetMode: 'custom', customImagePrompt: editedPrompt || describeInput })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && describeInput.trim() && !enhancing) {
      e.preventDefault()
      handleEnhance()
    }
  }

  if (done) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(110,191,139,.1)', border: '1px solid rgba(110,191,139,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><polyline points="5,12 10,17 19,7" stroke="#6EBF8B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 22, color: 'var(--parchment)', marginBottom: 10 }}>Post created</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontWeight: 300, lineHeight: 1.75, marginBottom: 32 }}>Your post is generating in the background and will appear in Posts ready for review.</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <a href="/dashboard/posts" style={{ padding: '11px 24px', background: 'var(--candle)', color: '#fff', borderRadius: 10, fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 12, letterSpacing: '.05em', textTransform: 'uppercase', textDecoration: 'none' }}>View Posts</a>
            <button onClick={() => { setDone(false); setPhase('input'); setVariations([]); setEditedPrompt(''); setDescribeInput('') }} style={{ padding: '11px 24px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--sand)', borderRadius: 10, fontFamily: 'var(--font-ibm)', fontSize: 12, cursor: 'pointer' }}>Create another</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes dc-spin  { to { transform: rotate(360deg); } }
        @keyframes dc-pulse { 0%,100%{opacity:.25} 50%{opacity:.55} }
        @keyframes dc-up    { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }

        .dc-input-wrap {
          position: relative;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.1);
          background: rgba(255,255,255,.04);
          transition: border-color 200ms, box-shadow 200ms;
        }
        .dc-input-wrap:focus-within {
          border-color: rgba(212,168,75,.4);
          box-shadow: 0 0 0 3px rgba(212,168,75,.07), 0 8px 40px rgba(0,0,0,.3);
        }
        .dc-textarea {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          padding: 20px 22px 56px;
          color: var(--parchment);
          font-family: var(--font-ibm);
          font-size: 15px;
          font-weight: 300;
          line-height: 1.65;
          resize: none;
          box-sizing: border-box;
        }
        .dc-textarea::placeholder { color: rgba(255,255,255,.22); }
        .dc-send-btn {
          position: absolute;
          right: 12px;
          bottom: 12px;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: var(--candle);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 150ms, opacity 150ms;
          flex-shrink: 0;
        }
        .dc-send-btn:hover:not(:disabled) { background: var(--ember); }
        .dc-send-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        .dc-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.1);
          background: rgba(255,255,255,.04);
          color: var(--muted);
          font-family: var(--font-ibm);
          font-size: 11px;
          font-weight: 400;
          cursor: pointer;
          transition: border-color 150ms, color 150ms, background 150ms;
          text-decoration: none;
        }
        .dc-chip:hover { border-color: rgba(212,168,75,.3); color: var(--sand); background: rgba(212,168,75,.05); }

        .dc-var-wrap { animation: dc-up .3s cubic-bezier(.2,0,.1,1) both; }

        .dc-arrow-btn {
          width: 34px; height: 34px;
          border-radius: 8px;
          background: transparent;
          border: 1px solid rgba(255,255,255,.1);
          color: var(--candle);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: border-color 150ms, background 150ms;
          flex-shrink: 0;
        }
        .dc-arrow-btn:hover { border-color: rgba(212,168,75,.4); background: rgba(212,168,75,.07); }

        .dc-gen-btn {
          width: 100%;
          padding: 14px 0;
          background: var(--candle);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-family: var(--font-syne);
          font-weight: 700;
          font-size: 13px;
          letter-spacing: .06em;
          text-transform: uppercase;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 9px;
          transition: background 150ms, opacity 150ms;
        }
        .dc-gen-btn:hover:not(:disabled) { background: var(--ember); }
        .dc-gen-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        @media (max-width: 600px) {
          .dc-center { padding: 32px 16px !important; }
          .dc-title { font-size: 22px !important; }
        }
      `}</style>

      <div className="dc-center" style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: phase === 'input' ? 'center' : 'flex-start', padding: '48px 24px', boxSizing: 'border-box' }}>

        {/* ── Phase: input ─────────────────────────────── */}
        {phase === 'input' && (
          <div style={{ width: '100%', maxWidth: 600, textAlign: 'center' }}>
            <div className="dc-title" style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 28, color: 'var(--parchment)', letterSpacing: '-.02em', marginBottom: 10 }}>
              What image do you have in mind?
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontWeight: 300, marginBottom: 32, lineHeight: 1.6 }}>
              Describe it in a few words — AI expands it into a cinematic prompt
            </div>

            {/* Input box */}
            <div className="dc-input-wrap" style={{ marginBottom: 20 }}>
              <textarea
                className="dc-textarea"
                value={describeInput}
                onChange={e => setDescribeInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. honey jar on a wooden table, warm afternoon sunlight, bees in the background…"
                rows={3}
                autoFocus
              />
              <button
                className="dc-send-btn"
                onClick={handleEnhance}
                disabled={!describeInput.trim() || enhancing}
                title="Enhance with AI"
              >
                {enhancing
                  ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: 'dc-spin .9s linear infinite' }}><circle cx="8" cy="8" r="6" stroke="#fff" strokeWidth="1.6" strokeDasharray="17 8" strokeLinecap="round"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                }
              </button>
            </div>

            {enhanceError && <div style={{ marginBottom: 16, fontSize: 12, color: '#e07070', fontFamily: 'var(--font-ibm)' }}>{enhanceError}</div>}

            <button
              className="dc-chip"
              onClick={handleEnhance}
              disabled={!describeInput.trim() || enhancing}
              style={{ fontSize: 12, padding: '9px 20px', color: enhancing || !describeInput.trim() ? 'var(--muted)' : 'var(--candle)', borderColor: describeInput.trim() && !enhancing ? 'rgba(212,168,75,.3)' : undefined }}
            >
              {enhancing
                ? <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ animation: 'dc-spin .9s linear infinite' }}><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="13 7" strokeLinecap="round"/></svg>
                : <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1v2M6 9v2M1 6h2M9 6h2M2.8 2.8l1.4 1.4M7.8 7.8l1.4 1.4M2.8 9.2l1.4-1.4M7.8 4.2l1.4-1.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
              }
              {enhancing ? 'Expanding…' : 'Enhance with AI'}
            </button>
          </div>
        )}

        {/* ── Phase: variations ────────────────────────── */}
        {phase === 'variations' && (
          <div className="dc-var-wrap" style={{ width: '100%', maxWidth: 640 }}>

            {/* Back + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <button onClick={() => setPhase('input')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontSize: 12, cursor: 'pointer', padding: 0, transition: 'color 150ms' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--sand)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="9,2 4,7 9,12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Back
              </button>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', letterSpacing: '.05em', textTransform: 'uppercase' }}>3 variations</span>
            </div>

            {/* Variation switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <button className="dc-arrow-btn" onClick={() => goVariation(-1)}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polyline points="6.5,2 3.5,5 6.5,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <span style={{ fontFamily: 'var(--font-ibm)', fontSize: 12, color: 'var(--candle)', minWidth: 36, textAlign: 'center', letterSpacing: '.04em' }}>{activeVariation + 1} / {variations.length}</span>
              <button className="dc-arrow-btn" onClick={() => goVariation(1)}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polyline points="3.5,2 6.5,5 3.5,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontWeight: 300 }}>Edit before generating</span>
            </div>

            {/* Editable prompt */}
            <div className="dc-input-wrap" style={{ marginBottom: 20 }}>
              <textarea
                className="dc-textarea"
                value={editedPrompt}
                onChange={e => setEditedPrompt(e.target.value)}
                rows={10}
                style={{ paddingBottom: 20, fontSize: 13, lineHeight: 1.75 }}
              />
            </div>

            {/* Generate */}
            {generating ? (
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ animation: 'dc-spin 1.1s linear infinite', flexShrink: 0 }}><circle cx="9" cy="9" r="7" stroke="var(--candle)" strokeWidth="1.5" strokeDasharray="20 10" strokeLinecap="round"/></svg>
                <span style={{ fontFamily: 'var(--font-ibm)', fontSize: 13, color: 'var(--sand)', fontWeight: 300 }}>{genStep}</span>
              </div>
            ) : (
              <button className="dc-gen-btn" onClick={handleGenerate} disabled={!editedPrompt.trim() && !describeInput.trim()}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1v3M8 12v3M1 8h3M12 8h3M3.3 3.3l2.1 2.1M10.6 10.6l2.1 2.1M3.3 12.7l2.1-2.1M10.6 5.4l2.1-2.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                Generate Post
              </button>
            )}
            {genError && <div style={{ marginTop: 10, fontSize: 12, color: '#e07070', fontFamily: 'var(--font-ibm)' }}>{genError}</div>}
          </div>
        )}
      </div>
    </>
  )
}
