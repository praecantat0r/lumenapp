'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { GeneratingModal } from './GeneratingModal'
const GeneratePostModal = dynamic(
  () => import('./GeneratePostModal').then(m => ({ default: m.GeneratePostModal })),
  { ssr: false },
)
import type { BrandAsset } from '@/types'
import toast from 'react-hot-toast'
import { useGeneratePost } from '@/hooks/useGeneratePost'
import { useLanguage } from '@/lib/i18n/context'

export function OverviewGenerateButton({ brandAssets }: { brandAssets: BrandAsset[] }) {
  const { t } = useLanguage()
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()

  const steps = [
    t('posts.genStep1'),
    t('posts.genStep2'),
    t('posts.genStep3'),
    t('posts.genStep4'),
    t('posts.genStep5'),
  ]

  const { generating, genStep, generatePost } = useGeneratePost(
    steps,
    () => { toast.success(t('posts.toastReady')); router.refresh() },
    (msg) => toast.error(msg),
  )

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
        {generating ? t('posts.statusGenerating') : t('posts.generatePost')}
      </button>
    </>
  )
}
