'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GeneratingModal } from './GeneratingModal'
import { GeneratePostModal } from './GeneratePostModal'
import type { BrandAsset } from '@/types'
import toast from 'react-hot-toast'
import { useGeneratePost } from '@/hooks/useGeneratePost'

const STEPS = [
  'Analyzing brand identity…',
  'Crafting visual concept…',
  'Generating image…',
  'Writing caption…',
  'Composing final design…',
]

export function OverviewGenerateButton() {
  const [showModal, setShowModal] = useState(false)
  const [brandAssets, setBrandAssets] = useState<BrandAsset[]>([])
  const router = useRouter()

  const { generating, genStep, generatePost } = useGeneratePost(
    STEPS,
    () => { toast.success('Post ready for review.'); router.refresh() },
    (msg) => toast.error(msg),
  )

  useEffect(() => {
    if (!showModal) return
    fetch('/api/brand-brain/assets').then(r => r.ok ? r.json() : []).then(d => setBrandAssets(Array.isArray(d) ? d : [])).catch(() => {})
  }, [showModal])

  return (
    <>
      {showModal && (
        <GeneratePostModal
          brandAssets={brandAssets}
          onGenerate={(config) => { setShowModal(false); generatePost(config) }}
          onClose={() => setShowModal(false)}
        />
      )}
      {generating && <GeneratingModal step={genStep} />}
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
