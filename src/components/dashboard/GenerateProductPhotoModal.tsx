'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import type { BrandAsset, SceneSettings } from '@/types'

const ASSET_TYPE_CONFIG: Record<string, { icon: string; label: string }> = {
  product_photo: { icon: 'inventory_2',     label: 'Product' },
  label:         { icon: 'sell',            label: 'Label' },
  logo:          { icon: 'brand_awareness', label: 'Logo' },
  photo:         { icon: 'landscape',       label: 'Scene' },
  place_photo:   { icon: 'storefront',      label: 'Location' },
  icon:          { icon: 'emoji_objects',   label: 'Icon' },
  other:         { icon: 'category',        label: 'Other' },
}
const ASSET_ICON_COLOR = '#b68d40'

export interface ProductPhotoConfig {
  assetMode: 'asset'
  settings: Partial<SceneSettings>
  assetUrl?: string
  assetName?: string
  assetDescription?: string
}

interface Props {
  brandAssets: BrandAsset[]
  onGenerate: (config: ProductPhotoConfig) => void
  onClose: () => void
  sceneSettings: SceneSettings
}

export function GenerateProductPhotoModal({ brandAssets, onGenerate, onClose, sceneSettings }: Props) {
  const [assetId, setAssetId] = useState('')
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const hasAssets = brandAssets.length > 0
  const selectedAsset = brandAssets.find(a => a.id === assetId)

  function handleGenerate() {
    if (!selectedAsset) return
    onGenerate({
      assetMode: 'asset',
      settings: sceneSettings,
      assetUrl: selectedAsset.public_url,
      assetName: selectedAsset.name,
      assetDescription: selectedAsset.description,
    })
  }

  function AssetThumb({ asset, selected, onClick }: { asset: BrandAsset; selected: boolean; onClick: () => void }) {
    const cfg = ASSET_TYPE_CONFIG[asset.type] ?? ASSET_TYPE_CONFIG.other
    return (
      <div className={`gpp-asset-thumb${selected ? ' selected' : ''}`} onClick={onClick}>
        <Image src={asset.public_url} alt={asset.name || 'Asset'} fill sizes="170px" style={{ objectFit: 'cover' }} />
        <div style={{ position: 'absolute', bottom: 5, left: 5, display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px 2px 4px', borderRadius: 4, background: 'rgba(11,10,5,.72)', backdropFilter: 'blur(4px)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 11, color: ASSET_ICON_COLOR, fontVariationSettings: "'FILL' 1" }}>{cfg.icon}</span>
          <span style={{ fontSize: 8, letterSpacing: '.1em', textTransform: 'uppercase', color: ASSET_ICON_COLOR, fontFamily: 'var(--font-ibm)', fontWeight: 600 }}>{cfg.label}</span>
        </div>
        {selected && (
          <div style={{ position: 'absolute', top: 5, right: 5, width: 18, height: 18, borderRadius: '50%', background: 'var(--candle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
              <polyline points="2,5 4.2,7.5 8,2.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
        )}
      </div>
    )
  }

  const generateDisabled = !selectedAsset

  const modal = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(11,10,5,0.8)', backdropFilter: 'blur(10px)' }}>
      <style>{`
        @keyframes gpp-in { from{opacity:0;transform:translateY(16px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        .gpp-asset-thumb { cursor:pointer; border-radius:8px; overflow:hidden; aspect-ratio:1; position:relative; transition:transform 150ms,opacity 150ms; border:2px solid transparent; }
        .gpp-asset-thumb:hover { transform:scale(1.03); }
        .gpp-asset-thumb.selected { border-color:#D4A84B; box-shadow:0 0 0 1px #D4A84B22,0 0 14px rgba(212,168,75,.18); }
        .gpp-section-label { font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); font-family:var(--font-ibm); font-weight:500; margin-bottom:6px; }
        .gpp-sub { font-size:11px; color:var(--muted); font-family:var(--font-ibm); font-weight:300; margin-bottom:8px; }
        @media (max-width: 480px) {
          .gpp-asset-grid { grid-template-columns: repeat(2,1fr) !important; }
          .gpp-body { padding: 14px 14px !important; }
          .gpp-header { padding: 16px 14px 0 !important; }
        }
      `}</style>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, width: 520, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', animation: 'gpp-in .22s cubic-bezier(.2,0,.1,1) both', boxShadow: '0 32px 96px rgba(0,0,0,0.3)', overflow: 'hidden' }}>

        {/* Header */}
        <div className="gpp-header" style={{ padding: '22px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18, color: 'var(--parchment)', letterSpacing: '-.02em' }}>Generate product photo</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, fontFamily: 'var(--font-ibm)', fontWeight: 300 }}>Select a product asset to shoot</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4, display: 'flex', marginTop: -2 }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--parchment)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><line x1="13" y1="3" x2="3" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="gpp-body" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {!hasAssets ? (
            <div style={{ textAlign: 'center', padding: '28px 20px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(212,168,75,.08)', border: '1px solid rgba(212,168,75,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="16" height="16" rx="3" stroke="#D4A84B" strokeWidth="1.3"/><circle cx="7" cy="7" r="2" stroke="#D4A84B" strokeWidth="1.2"/><path d="M2 14l5-4.5L10 12l3-3L18 14" stroke="#D4A84B" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div style={{ fontFamily: 'var(--font-syne)', fontSize: 13, fontWeight: 600, color: 'var(--sand)', marginBottom: 6 }}>No brand assets yet</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.8, fontFamily: 'var(--font-ibm)', fontWeight: 300 }}>Upload product photos in <a href="/dashboard/brand-brain" style={{ color: 'var(--candle)', textDecoration: 'none' }}>Brand Brain</a> to get started.</div>
            </div>
          ) : (
            <>
              <div>
                <div className="gpp-section-label">Product asset</div>
                <div className="gpp-sub">The product to photograph</div>
                <div className="gpp-asset-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {brandAssets.map(a => (
                    <AssetThumb key={a.id} asset={a} selected={assetId === a.id} onClick={() => setAssetId(assetId === a.id ? '' : a.id)} />
                  ))}
                </div>
                {selectedAsset?.description && (
                  <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(212,168,75,.05)', border: '1px solid rgba(212,168,75,.12)', fontSize: 11, color: 'var(--sand)', fontFamily: 'var(--font-ibm)', fontWeight: 300, lineHeight: 1.6 }}>
                    {selectedAsset.description}
                  </div>
                )}
              </div>

              {/* Scene hint */}
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(212,168,75,.04)', border: '1px solid rgba(212,168,75,.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'rgba(212,168,75,.6)', fontVariationSettings: "'FILL' 1" }}>tune</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontWeight: 300, lineHeight: 1.5 }}>
                  Scene settings from the <strong style={{ color: 'var(--sand)' }}>Scene</strong> tab will be applied.
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--sand)', fontFamily: 'var(--font-ibm)', fontSize: 13, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,168,75,.2)'; e.currentTarget.style.color = 'var(--parchment)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--sand)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={generateDisabled}
            style={{
              padding: '10px 20px', borderRadius: 8,
              background: generateDisabled ? 'rgba(212,168,75,.15)' : 'var(--candle)',
              border: 'none', color: generateDisabled ? 'var(--muted)' : '#1a1410',
              fontFamily: 'var(--font-ibm)', fontSize: 13, fontWeight: 600,
              cursor: generateDisabled ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'background 150ms',
            }}
            onMouseEnter={e => { if (!generateDisabled) e.currentTarget.style.background = '#c8983c' }}
            onMouseLeave={e => { if (!generateDisabled) e.currentTarget.style.background = 'var(--candle)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15, fontVariationSettings: "'FILL' 1" }}>camera_enhance</span>
            Generate Photo
          </button>
        </div>
      </div>
    </div>
  )

  if (!mounted) return null
  return createPortal(modal, document.body)
}
