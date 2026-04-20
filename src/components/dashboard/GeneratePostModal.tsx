'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import type { BrandAsset } from '@/types'

type AssetMode = 'original' | 'auto' | 'specific' | 'composite'

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

interface GenerateConfig {
  assetMode: AssetMode
  assetUrl?: string
  assetName?: string
  assetType?: string
  assetDescription?: string
  scenicAssetUrl?: string
  scenicAssetName?: string
  scenicAssetDescription?: string
  productAssetUrl?: string
  productAssetName?: string
  productAssetDescription?: string
}

interface Props {
  brandAssets: BrandAsset[]
  onGenerate: (config: GenerateConfig) => void
  onClose: () => void
}

export function GeneratePostModal({ brandAssets, onGenerate, onClose }: Props) {
  const [tab, setTab] = useState<'original' | 'asset' | 'composite'>('original')
  const [assetChoice, setAssetChoice] = useState<'auto' | string>('auto')
  const [compositeScenicId,  setCompositeScenicId]  = useState('')
  const [compositeProductId, setCompositeProductId] = useState('')
  const [scenicFilter,  setScenicFilter]  = useState<'scenic' | 'all'>('scenic')
  const [productFilter, setProductFilter] = useState<'product' | 'all'>('product')
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const hasAssets = brandAssets.length > 0
  const compositeScenicAsset  = brandAssets.find(a => a.id === compositeScenicId)
  const compositeProductAsset = brandAssets.find(a => a.id === compositeProductId)
  const compositeReady = !!compositeScenicId && !!compositeProductId

  function handleGenerate() {
    if (tab === 'original') {
      onGenerate({ assetMode: 'original' })
    } else if (tab === 'composite') {
      onGenerate({
        assetMode: 'composite',
        scenicAssetUrl:           compositeScenicAsset?.public_url,
        scenicAssetName:          compositeScenicAsset?.name,
        scenicAssetDescription:   compositeScenicAsset?.description,
        productAssetUrl:          compositeProductAsset?.public_url,
        productAssetName:         compositeProductAsset?.name,
        productAssetDescription:  compositeProductAsset?.description,
      })
    } else if (assetChoice === 'auto') {
      onGenerate({ assetMode: 'auto' })
    } else {
      const asset = brandAssets.find(a => a.id === assetChoice)
      onGenerate({
        assetMode: 'specific',
        assetUrl: asset?.public_url,
        assetName: asset?.name,
        assetType: asset?.type,
        assetDescription: asset?.description,
      })
    }
  }

  function AssetThumb({ asset, selected, onClick }: { asset: BrandAsset; selected: boolean; onClick: () => void }) {
    const cfg = ASSET_TYPE_CONFIG[asset.type] ?? ASSET_TYPE_CONFIG.other
    return (
      <div
        className={`gpm-asset-thumb${selected ? ' selected' : ''}`}
        onClick={onClick}
      >
        <Image src={asset.public_url} alt={asset.name || 'Brand asset'} fill sizes="170px" style={{ objectFit: 'cover' }} />
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

  const generateDisabled =
    (tab === 'asset' && !hasAssets) ||
    (tab === 'composite' && !compositeReady)

  const modal = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(11,10,5,0.8)', backdropFilter: 'blur(10px)' }}>
      <style>{`
        @keyframes gpm-in { from{opacity:0;transform:translateY(16px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        .gpm-asset-thumb { cursor:pointer; border-radius:8px; overflow:hidden; aspect-ratio:1; position:relative; transition:transform 150ms, opacity 150ms; border:2px solid transparent; }
        .gpm-asset-thumb:hover { transform:scale(1.03); }
        .gpm-asset-thumb.selected { border-color:#D4A84B; box-shadow:0 0 0 1px #D4A84B22, 0 0 14px rgba(212,168,75,.18); }
        .gpm-tab { flex:1; padding:11px 0; border:1px solid var(--border); background:transparent; border-radius:8px; font-family:var(--font-ibm); font-size:13px; font-weight:300; color:var(--muted); cursor:pointer; transition:all 150ms; display:flex; align-items:center; justify-content:center; gap:8px; }
        .gpm-tab:hover { color:var(--parchment); border-color:rgba(212,168,75,.2); }
        .gpm-tab.active { background:rgba(212,168,75,.07); border-color:rgba(212,168,75,.35); color:var(--parchment); }
        .gpm-auto-pill { display:flex; align-items:center; gap:10px; padding:10px 14px; border:1px solid var(--border); border-radius:8px; cursor:pointer; transition:border-color 150ms,background 150ms; }
        .gpm-auto-pill:hover { border-color:rgba(212,168,75,.2); }
        .gpm-auto-pill.selected { border-color:rgba(212,168,75,.4); background:rgba(212,168,75,.05); }
        .gpm-picker-label { font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); font-family:var(--font-ibm); font-weight:500; margin-bottom:4px; }
        .gpm-picker-sub { font-size:11px; color:var(--muted); font-family:var(--font-ibm); font-weight:300; margin-bottom:10px; }
        .gpm-filter-tab { padding:4px 10px; border-radius:9999px; font-family:var(--font-ibm); font-size:10px; font-weight:500; letter-spacing:.06em; border:1px solid var(--border); background:transparent; color:var(--muted); cursor:pointer; transition:all 120ms; }
        .gpm-filter-tab:hover { color:var(--parchment); border-color:rgba(212,168,75,.25); }
        .gpm-filter-tab.active { background:rgba(212,168,75,.1); border-color:rgba(212,168,75,.35); color:var(--parchment); }
        @media (max-width: 480px) {
          .gpm-asset-grid { grid-template-columns: repeat(2,1fr) !important; }
          .gpm-body { padding: 14px 14px !important; }
          .gpm-header { padding: 16px 14px 0 !important; }
        }
      `}</style>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, width: 520, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', animation: 'gpm-in .22s cubic-bezier(.2,0,.1,1) both', boxShadow: '0 32px 96px rgba(0,0,0,0.3)', overflow: 'hidden' }}>

        {/* Header */}
        <div className="gpm-header" style={{ padding: '22px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18, color: 'var(--parchment)', letterSpacing: '-.02em' }}>Generate post</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, fontFamily: 'var(--font-ibm)', fontWeight: 300 }}>Choose how AI creates the image</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4, display: 'flex', marginTop: -2 }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--parchment)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><line x1="13" y1="3" x2="3" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Mode tabs */}
        <div style={{ padding: '20px 24px 0', display: 'flex', gap: 8, flexShrink: 0 }}>
          <button className={`gpm-tab${tab === 'original' ? ' active' : ''}`} onClick={() => setTab('original')}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1v3M8 12v3M1 8h3M12 8h3M3.3 3.3l2.1 2.1M10.6 10.6l2.1 2.1M3.3 12.7l2.1-2.1M10.6 5.4l2.1-2.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            AI original
          </button>
          <button className={`gpm-tab${tab === 'asset' ? ' active' : ''}`} onClick={() => { setTab('asset') }} style={{ opacity: !hasAssets && tab !== 'asset' ? 0.45 : 1 }} title={!hasAssets ? 'Upload brand assets in Brand Brain first' : undefined}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="1.5" width="13" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="5.5" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1.5 11l4-3.5L8 10l2.5-2.5L14.5 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Use asset
            {!hasAssets && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(120,112,88,.15)', color: 'var(--muted)', letterSpacing: '.06em' }}>0</span>}
          </button>
          <button className={`gpm-tab${tab === 'composite' ? ' active' : ''}`} onClick={() => setTab('composite')} style={{ opacity: !hasAssets && tab !== 'composite' ? 0.45 : 1 }} title={!hasAssets ? 'Upload brand assets in Brand Brain first' : undefined}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="6" width="13" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><rect x="4" y="2" width="8" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.2" opacity=".55"/></svg>
            Composite
          </button>
        </div>

        {/* Scrollable body */}
        <div className="gpm-body" style={{ flex: 1, overflowY: 'auto', padding: '18px 24px' }}>

          {tab === 'original' ? (
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(212,168,75,.1)', border: '1px solid rgba(212,168,75,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1v3M8 12v3M1 8h3M12 8h3M3.3 3.3l2.1 2.1M10.6 10.6l2.1 2.1M3.3 12.7l2.1-2.1M10.6 5.4l2.1-2.1" stroke="#D4A84B" strokeWidth="1.3" strokeLinecap="round"/></svg>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-syne)', fontSize: 13, fontWeight: 600, color: 'var(--parchment)', marginBottom: 5 }}>Fully AI-generated</div>
                <div style={{ fontSize: 12, color: 'var(--sand)', lineHeight: 1.7, fontFamily: 'var(--font-ibm)', fontWeight: 300 }}>Claude designs an original visual concept from scratch, tailored to your brand identity, tone, and recent post history. No brand photos are used.</div>
              </div>
            </div>

          ) : tab === 'composite' ? (
            !hasAssets ? (
              <div style={{ textAlign: 'center', padding: '36px 20px' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(212,168,75,.08)', border: '1px solid rgba(212,168,75,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="16" height="16" rx="3" stroke="#D4A84B" strokeWidth="1.3"/><circle cx="7" cy="7" r="2" stroke="#D4A84B" strokeWidth="1.2"/><path d="M2 14l5-4.5L10 12l3-3L18 14" stroke="#D4A84B" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div style={{ fontFamily: 'var(--font-syne)', fontSize: 13, fontWeight: 600, color: 'var(--sand)', marginBottom: 6 }}>No brand assets yet</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.8, fontFamily: 'var(--font-ibm)', fontWeight: 300 }}>Upload location photos and product photos in <a href="/dashboard/brand-brain" style={{ color: 'var(--candle)', textDecoration: 'none' }}>Brand Brain</a> to use composite mode.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Composite description */}
                <div style={{ background: 'rgba(212,168,75,.05)', border: '1px solid rgba(212,168,75,.12)', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><rect x="1.5" y="6" width="13" height="8.5" rx="1.5" stroke="#D4A84B" strokeWidth="1.3"/><rect x="4" y="2" width="8" height="6.5" rx="1.5" stroke="#D4A84B" strokeWidth="1.2" opacity=".55"/></svg>
                  <span style={{ fontSize: 11, color: 'var(--sand)', fontFamily: 'var(--font-ibm)', fontWeight: 300, lineHeight: 1.6 }}>AI will analyze your scene's colors, lighting, and atmosphere, then realistically place your product inside it — like a professional on-location product photo.</span>
                </div>

                {/* Scene picker */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div className="gpm-picker-label" style={{ marginBottom: 0 }}>① Scene / Location</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className={`gpm-filter-tab${scenicFilter === 'scenic' ? ' active' : ''}`} onClick={() => setScenicFilter('scenic')}>Scene</button>
                      <button className={`gpm-filter-tab${scenicFilter === 'all' ? ' active' : ''}`} onClick={() => setScenicFilter('all')}>All</button>
                    </div>
                  </div>
                  <div className="gpm-picker-sub">Background environment — best with a location or scene photo</div>
                  <div className="gpm-asset-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {(scenicFilter === 'scenic'
                      ? brandAssets.filter(a => a.type === 'place_photo' || a.type === 'photo')
                      : brandAssets
                    ).map(asset => (
                      <AssetThumb key={asset.id} asset={asset} selected={compositeScenicId === asset.id} onClick={() => setCompositeScenicId(asset.id)} />
                    ))}
                  </div>
                </div>

                {/* Product picker */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div className="gpm-picker-label" style={{ marginBottom: 0 }}>② Product</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className={`gpm-filter-tab${productFilter === 'product' ? ' active' : ''}`} onClick={() => setProductFilter('product')}>Product</button>
                      <button className={`gpm-filter-tab${productFilter === 'all' ? ' active' : ''}`} onClick={() => setProductFilter('all')}>All</button>
                    </div>
                  </div>
                  <div className="gpm-picker-sub">Item to place in the scene — best with a product photo</div>
                  <div className="gpm-asset-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {(productFilter === 'product'
                      ? brandAssets.filter(a => a.type === 'product_photo' || a.type === 'label')
                      : brandAssets
                    ).map(asset => (
                      <AssetThumb key={asset.id} asset={asset} selected={compositeProductId === asset.id} onClick={() => setCompositeProductId(asset.id)} />
                    ))}
                  </div>
                </div>

                {/* Combined preview */}
                {compositeReady && compositeScenicAsset && compositeProductAsset && (
                  <div style={{ background: 'rgba(110,191,139,.06)', border: '1px solid rgba(110,191,139,.2)', borderRadius: 8, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#6EBF8B" strokeWidth="1.2"/><polyline points="4.5,7 6.2,9 9.5,5" stroke="#6EBF8B" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                    <span style={{ fontSize: 11, color: 'var(--sand)', fontFamily: 'var(--font-ibm)', fontWeight: 300 }}>
                      AI will place <strong style={{ color: 'var(--parchment)', fontWeight: 400 }}>{compositeProductAsset.name || 'the product'}</strong> inside <strong style={{ color: 'var(--parchment)', fontWeight: 400 }}>{compositeScenicAsset.name || 'the scene'}</strong>, matching the location&apos;s lighting and atmosphere
                    </span>
                  </div>
                )}
              </div>
            )

          ) : !hasAssets ? (
            <div style={{ textAlign: 'center', padding: '36px 20px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(212,168,75,.08)', border: '1px solid rgba(212,168,75,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="16" height="16" rx="3" stroke="#D4A84B" strokeWidth="1.3"/><circle cx="7" cy="7" r="2" stroke="#D4A84B" strokeWidth="1.2"/><path d="M2 14l5-4.5L10 12l3-3L18 14" stroke="#D4A84B" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div style={{ fontFamily: 'var(--font-syne)', fontSize: 13, fontWeight: 600, color: 'var(--sand)', marginBottom: 6 }}>No brand assets yet</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.8, fontFamily: 'var(--font-ibm)', fontWeight: 300 }}>Upload logos, product photos, and brand imagery in <a href="/dashboard/brand-brain" style={{ color: 'var(--candle)', textDecoration: 'none' }}>Brand Brain</a> to use them here.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Auto option */}
              <div className={`gpm-auto-pill${assetChoice === 'auto' ? ' selected' : ''}`} onClick={() => setAssetChoice('auto')}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${assetChoice === 'auto' ? 'var(--candle)' : 'var(--border)'}`, background: assetChoice === 'auto' ? 'var(--candle)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 150ms' }}>
                  {assetChoice === 'auto' && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ffffff' }}/>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-ibm)', fontSize: 12, color: 'var(--parchment)', fontWeight: 400, marginBottom: 2 }}>Let AI choose from all assets</div>
                  <div style={{ fontFamily: 'var(--font-ibm)', fontSize: 11, color: 'var(--muted)', fontWeight: 300 }}>AI references your uploaded brand imagery for visual consistency</div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
                <span style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--font-ibm)' }}>or pick one</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
              </div>

              {/* Asset grid */}
              <div className="gpm-asset-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {brandAssets.map(asset => (
                  <div key={asset.id} className={`gpm-asset-thumb${assetChoice === asset.id ? ' selected' : ''}`} onClick={() => setAssetChoice(asset.id)}>
                    <Image src={asset.public_url} alt={asset.name || 'Brand asset'} fill sizes="170px" style={{ objectFit: 'cover' }} />
                    {(() => {
                      const cfg = ASSET_TYPE_CONFIG[asset.type] ?? ASSET_TYPE_CONFIG.other
                      return (
                        <div style={{ position: 'absolute', bottom: 5, left: 5, display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px 2px 4px', borderRadius: 4, background: 'rgba(11,10,5,.72)', backdropFilter: 'blur(4px)' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 11, color: ASSET_ICON_COLOR, fontVariationSettings: "'FILL' 1" }}>{cfg.icon}</span>
                          <span style={{ fontSize: 8, letterSpacing: '.1em', textTransform: 'uppercase', color: ASSET_ICON_COLOR, fontFamily: 'var(--font-ibm)', fontWeight: 600 }}>{cfg.label}</span>
                        </div>
                      )
                    })()}
                    {assetChoice === asset.id && (
                      <div style={{ position: 'absolute', top: 5, right: 5, width: 18, height: 18, borderRadius: '50%', background: 'var(--candle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><polyline points="2,5 4.2,7.5 8,2.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                      </div>
                    )}
                    {asset.name && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', padding: '0 6px 24px', opacity: 0, transition: 'opacity 150ms' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0' }}>
                        <div style={{ fontSize: 9, color: 'var(--parchment)', fontFamily: 'var(--font-ibm)', lineHeight: 1.3, textShadow: '0 1px 3px rgba(0,0,0,.7)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{asset.name}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Selected asset info */}
              {assetChoice !== 'auto' && (() => {
                const a = brandAssets.find(x => x.id === assetChoice)
                if (!a) return null
                return (
                  <div style={{ background: 'rgba(212,168,75,.05)', border: '1px solid rgba(212,168,75,.15)', borderRadius: 8, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#D4A84B" strokeWidth="1.2"/><line x1="7" y1="6" x2="7" y2="9.5" stroke="#D4A84B" strokeWidth="1.2" strokeLinecap="round"/><circle cx="7" cy="4.5" r=".6" fill="#D4A84B"/></svg>
                    <span style={{ fontSize: 11, color: 'var(--sand)', fontFamily: 'var(--font-ibm)', fontWeight: 300 }}>
                      {a.type === 'product_photo'
                        ? <>AI will create a <strong style={{ color: 'var(--parchment)', fontWeight: 400 }}>product photography shot</strong> of <strong style={{ color: 'var(--parchment)', fontWeight: 400 }}>{a.name || 'this product'}</strong>, preserving its exact appearance</>
                        : a.type === 'place_photo'
                        ? <>AI will generate a scene set inside <strong style={{ color: 'var(--parchment)', fontWeight: 400 }}>{a.name || 'this location'}</strong>, matching its lighting, colors, and atmosphere</>
                        : <>AI will build the scene around <strong style={{ color: 'var(--parchment)', fontWeight: 400 }}>{a.name || a.type}</strong> as the hero element</>
                      }
                    </span>
                  </div>
                )
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', color: 'var(--sand)', padding: '10px 0', borderRadius: 8, fontFamily: 'var(--font-ibm)', fontSize: 12, cursor: 'pointer', transition: 'border-color 150ms,color 150ms' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sand)'; e.currentTarget.style.color = 'var(--parchment)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--sand)' }}>
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={generateDisabled}
            style={{ flex: 2, background: 'var(--candle)', color: '#ffffff', border: 'none', padding: '10px 0', borderRadius: 8, fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 12, letterSpacing: '.04em', textTransform: 'uppercase', cursor: generateDisabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: generateDisabled ? 0.4 : 1, transition: 'background 150ms' }}
            onMouseEnter={e => { if (!generateDisabled) e.currentTarget.style.background = 'var(--ember)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--candle)' }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 1v3M8 12v3M1 8h3M12 8h3M3.3 3.3l2.1 2.1M10.6 10.6l2.1 2.1M3.3 12.7l2.1-2.1M10.6 5.4l2.1-2.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            {tab === 'composite' && !compositeReady ? 'Select both assets' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  )

  if (!mounted) return null
  return createPortal(modal, document.body)
}
