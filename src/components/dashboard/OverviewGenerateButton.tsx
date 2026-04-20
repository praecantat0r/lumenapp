'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GeneratingModal } from './GeneratingModal'
import { GeneratePostModal } from './GeneratePostModal'
import type { BrandAsset } from '@/types'
import toast from 'react-hot-toast'

const STEPS = [
  'Analyzing brand identity…',
  'Crafting visual concept…',
  'Generating image…',
  'Writing caption…',
  'Composing final design…',
]

export function OverviewGenerateButton() {
  const [showModal, setShowModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [step, setStep] = useState(STEPS[0])
  const [brandAssets, setBrandAssets] = useState<BrandAsset[]>([])
  const router = useRouter()

  useEffect(() => {
    if (!showModal) return
    fetch('/api/brand-brain/assets').then(r => r.ok ? r.json() : []).then(d => setBrandAssets(Array.isArray(d) ? d : [])).catch(() => {})
  }, [showModal])

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

  return (
    <>
      {showModal && (
        <GeneratePostModal
          brandAssets={brandAssets}
          onGenerate={generatePost}
          onClose={() => setShowModal(false)}
        />
      )}
      {generating && <GeneratingModal step={step} />}
      <style>{`@keyframes ovg-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
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
        {generating ? (
          <span className="material-symbols-outlined" style={{ fontSize: 16, animation: 'ovg-spin 1.4s linear infinite', display: 'inline-block' }}>autorenew</span>
        ) : (
          <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
        )}
        {generating ? 'Generating…' : 'Generate Post'}
      </button>
    </>
  )
}
