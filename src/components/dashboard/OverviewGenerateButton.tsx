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
      <style>{`
        .ovg-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 18px;
          background: rgba(182,141,64,0.12);
          color: var(--candle); border: 1px solid rgba(182,141,64,0.25);
          border-radius: 9999px; font-size: 13px; font-weight: 700;
          font-family: var(--font-syne);
          transition: all 0.15s; white-space: nowrap;
        }
        @media (max-width: 767px) {
          .ovg-btn { padding: 8px 12px; font-size: 11px; gap: 5px; }
          .ovg-btn .material-symbols-outlined { font-size: 14px !important; }
        }
      `}</style>
      {showModal && (
        <GeneratePostModal
          brandAssets={brandAssets}
          onGenerate={(config) => { setShowModal(false); generatePost(config) }}
          onClose={() => setShowModal(false)}
        />
      )}
      {generating && <GeneratingModal step={genStep} />}
      <button
        className="ovg-btn"
        onClick={() => setShowModal(true)}
        disabled={generating}
        style={{ cursor: generating ? 'not-allowed' : 'pointer' }}
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
