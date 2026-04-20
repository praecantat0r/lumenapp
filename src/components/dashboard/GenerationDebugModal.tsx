'use client'
import { useState } from 'react'

export interface GenerationDebugData {
  post_mode: string
  asset_mode: string
  validation_score: number
  validation_attempts: number
  validation_feedback: string | null
  visual_concept: string
  image_prompt: string
  caption: string
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
      <div style={{
        fontSize: 9, letterSpacing: '0.13em', textTransform: 'uppercase',
        color: 'var(--muted)', fontFamily: 'var(--font-ibm)', marginBottom: 6,
      }}>{label}</div>
      {children}
    </div>
  )
}

function ExpandableText({ text, mono }: { text: string; mono?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const PREVIEW = 260
  const isTruncatable = text.length > PREVIEW

  return (
    <div>
      <div style={{
        fontSize: mono ? 11 : 12,
        fontFamily: 'var(--font-ibm)',
        fontWeight: 300,
        lineHeight: 1.65,
        color: mono ? 'rgba(196,185,154,0.65)' : 'var(--parchment)',
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
      }}>
        {isTruncatable && !expanded ? text.slice(0, PREVIEW) + '…' : text}
      </div>
      {isTruncatable && (
        <button onClick={() => setExpanded(e => !e)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--muted)', fontSize: 10, fontFamily: 'var(--font-ibm)',
          letterSpacing: '0.08em', padding: '4px 0 0', textDecoration: 'underline',
          textUnderlineOffset: 2,
        }}>
          {expanded ? 'Show less' : 'Show full prompt'}
        </button>
      )}
    </div>
  )
}

const ASSET_MODE_LABELS: Record<string, string> = {
  original: 'AI only',
  specific: 'Asset (specific)',
  auto: 'Asset (auto)',
  composite: 'Composite',
}

export function GenerationDebugModal({ data, onClose }: { data: GenerationDebugData; onClose: () => void }) {
  const score = data.validation_score
  const passed = score >= 0.6
  const scoreColor = score >= 0.85 ? '#6EBF8B' : score >= 0.6 ? '#D4A84B' : '#e05252'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(10,9,8,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '28px 28px 24px',
          maxWidth: 640, width: '100%', maxHeight: '88vh',
          overflowY: 'auto',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{
              fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--muted)', fontFamily: 'var(--font-ibm)', marginBottom: 4,
            }}>DEBUG — Generation result</div>
            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18, color: 'var(--parchment)', letterSpacing: '-0.02em' }}>
              Post generated
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', fontSize: 18, lineHeight: 1, padding: 4,
          }}>✕</button>
        </div>

        {/* Validation score bar */}
        <div style={{
          background: 'var(--surface-2)', border: `1px solid ${passed ? 'rgba(110,191,139,0.25)' : 'rgba(224,82,82,0.25)'}`,
          borderRadius: 8, padding: '14px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
              <div style={{
                fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--muted)', fontFamily: 'var(--font-ibm)',
              }}>Brand validation</div>
              <div style={{
                fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                fontFamily: 'var(--font-ibm)', fontWeight: 700,
                color: passed ? '#6EBF8B' : '#e05252',
                background: passed ? 'rgba(110,191,139,0.12)' : 'rgba(224,82,82,0.12)',
                border: `1px solid ${passed ? 'rgba(110,191,139,0.3)' : 'rgba(224,82,82,0.3)'}`,
                borderRadius: 3, padding: '2px 6px',
              }}>{passed ? 'PASSED' : 'FAILED'}</div>
            </div>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 2, width: `${score * 100}%`, background: scoreColor, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ marginTop: 5, fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)' }}>
              {data.validation_attempts} attempt{data.validation_attempts !== 1 ? 's' : ''} &nbsp;·&nbsp; threshold 0.60
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 28, color: scoreColor, flexShrink: 0 }}>
            {score.toFixed(2)}
          </div>
        </div>

        {/* Validator feedback */}
        {data.validation_feedback && (
          <Section label="Validator feedback">
            <div style={{ fontSize: 12, fontFamily: 'var(--font-ibm)', fontWeight: 300, lineHeight: 1.65, color: 'var(--parchment)', marginBottom: 12 }}>
              {data.validation_feedback}
            </div>
          </Section>
        )}

        {/* Meta row */}
        <Section label="Post info">
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 12 }}>
            {[
              { k: 'Mode', v: data.post_mode === 'topics' ? 'Content / Topic' : 'Service showcase' },
              { k: 'Asset', v: ASSET_MODE_LABELS[data.asset_mode] ?? data.asset_mode },
            ].map(({ k, v }) => (
              <div key={k}>
                <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--font-ibm)', marginBottom: 3 }}>{k}</div>
                <div style={{ fontSize: 12, color: 'var(--parchment)', fontFamily: 'var(--font-ibm)', fontWeight: 300 }}>{v}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Visual concept */}
        <Section label="Visual concept">
          <div style={{ fontSize: 12, fontFamily: 'var(--font-ibm)', fontWeight: 300, lineHeight: 1.65, color: 'var(--parchment)', marginBottom: 12 }}>
            {data.visual_concept}
          </div>
        </Section>

        {/* Image prompt */}
        <Section label="Image prompt sent to AI">
          <div style={{ marginBottom: 12 }}>
            <ExpandableText text={data.image_prompt} mono />
          </div>
        </Section>

        {/* Caption */}
        <Section label="Caption">
          <div style={{ marginBottom: 4 }}>
            <ExpandableText text={data.caption} />
          </div>
        </Section>

        <div style={{ marginTop: 20, fontSize: 10, color: 'rgba(196,185,154,0.25)', fontFamily: 'var(--font-ibm)', letterSpacing: '0.05em' }}>
          Debug panel — for development only.
        </div>
      </div>
    </div>
  )
}
