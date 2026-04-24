'use client'
import { useState, useRef, useEffect } from 'react'
import { AssetUploader } from './AssetUploader'
import type { BrandBrain, BrandAsset } from '@/types'
import toast from 'react-hot-toast'
import { useLanguage } from '@/lib/i18n/context'
import { LANGUAGES, type LangCode } from '@/lib/i18n/translations'

const TONE_KEYS = [
  'Professional', 'Friendly', 'Inspiring', 'Authoritative', 'Playful',
  'Luxurious', 'Minimal', 'Bold', 'Warm', 'Humorous', 'Informative', 'Passionate',
]

const SECTION_IDS = [
  { id: 'identity', num: '01', labelKey: 'brandBrain.sectionIdentity' },
  { id: 'voice',    num: '02', labelKey: 'brandBrain.sectionVoice'    },
  { id: 'content',  num: '03', labelKey: 'brandBrain.sectionContent'  },
  { id: 'schedule', num: '04', labelKey: 'brandBrain.sectionSchedule' },
  { id: 'assets',   num: '05', labelKey: 'brandBrain.sectionAssets'   },
]

interface Props {
  brandBrain: BrandBrain | null
  assets: BrandAsset[]
  igConnection: { username?: string } | null
  userId: string
}

function completeness(form: Partial<BrandBrain>): number {
  const fields = [
    form.brand_name, form.industry, form.brand_description, form.products,
    form.tone_keywords?.length, form.tone_description, form.target_audience,
    form.audience_problem, form.post_topics, form.post_avoid, form.language,
  ]
  const filled = fields.filter(f => f && (typeof f === 'number' ? f > 0 : String(f).trim().length > 0)).length
  return Math.round((filled / fields.length) * 100)
}

function sectionComplete(id: string, form: Partial<BrandBrain>): boolean {
  if (id === 'identity') return !!(form.brand_name && form.industry && form.brand_description)
  if (id === 'voice')    return !!(form.tone_keywords?.length && form.tone_description && form.target_audience)
  if (id === 'content')  return !!(form.post_topics && form.post_avoid)
  if (id === 'schedule') return !!(form.posting_frequency)
  return false
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <label style={{
          fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontWeight: 600,
        }}>{label}</label>
        {hint && <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', opacity: 0.7 }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function SectionHeader({ num, title, done, completeLabel }: { num: string; title: string; done: boolean; completeLabel: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: done ? 'rgba(182,141,64,0.12)' : 'rgba(78,69,56,0.25)',
        border: `1px solid ${done ? 'rgba(182,141,64,0.3)' : 'rgba(78,69,56,0.35)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: done ? 'var(--candle)' : 'var(--muted)', fontVariationSettings: done ? "'FILL' 1" : "'FILL' 0" }}>
          {done ? 'check_circle' : 'fingerprint'}
        </span>
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 20, color: 'var(--parchment)', letterSpacing: '-0.02em', lineHeight: 1 }}>{title}</div>
      </div>
      {done && (
        <div style={{
          marginLeft: 'auto', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
          padding: '4px 12px', borderRadius: 9999, background: 'rgba(182,141,64,0.1)',
          color: 'var(--candle)', fontWeight: 700, border: '1px solid rgba(182,141,64,0.2)',
        }}>{completeLabel}</div>
      )}
    </div>
  )
}

function parseTopicsPercent(value: string): number {
  const m = value.match(/(\d+)%\s*topics/i)
  return m ? Math.min(100, Math.max(0, parseInt(m[1]))) : 60
}

function ContentRatioSlider({ value, onChange, topicsLabel, servicesLabel, exampleText }: {
  value: string; onChange: (v: string) => void
  topicsLabel: string; servicesLabel: string; exampleText: string
}) {
  const topics = parseTopicsPercent(value)
  const products = 100 - topics

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseInt(e.target.value)
    onChange(`${v}% topics, ${100 - v}% services`)
  }

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-ibm)', color: '#D4A84B', fontWeight: 400 }}>
          {topics}% {topicsLabel}
        </span>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-ibm)', color: 'var(--muted)', fontWeight: 300 }}>
          {products}% {servicesLabel}
        </span>
      </div>
      <div style={{ position: 'relative', height: 4, borderRadius: 2, background: 'var(--border)', marginBottom: 8 }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 2,
          width: `${topics}%`, background: '#D4A84B', transition: 'width 0.1s',
        }} />
        <div style={{
          position: 'absolute', right: 0, top: 0, height: '100%', borderRadius: 2,
          width: `${products}%`, background: 'rgba(196,185,154,0.2)',
        }} />
      </div>
      <input
        type="range" min={0} max={100} step={5} value={topics}
        onChange={handleChange}
        style={{ width: '100%', accentColor: '#D4A84B', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
      />
      <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', marginTop: 4 }}>
        {exampleText}
      </div>
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="bb-section-card" style={style}>
      {children}
    </div>
  )
}

export function BrandBrainClient({ brandBrain, assets: initialAssets, igConnection: initialIgConnection, userId }: Props) {
  const [form, setForm]         = useState<Partial<BrandBrain>>(brandBrain || {})
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [assets, setAssets]     = useState(initialAssets)
  const [activeSection, setActiveSection] = useState('identity')
  const [igConnection, setIgConnection]   = useState(initialIgConnection)
  const [disconnecting, setDisconnecting] = useState(false)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const { t, setLanguage } = useLanguage()
  const SECTIONS = SECTION_IDS.map(s => ({ ...s, label: t(s.labelKey) }))

  const score = completeness(form)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('ig_connected') === '1') {
      toast.success(t('brandBrain.toastIgConnected'))
      // Scroll the schedule section into view so the @handle is visible
      setTimeout(() => {
        sectionRefs.current['schedule']?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setActiveSection('schedule')
      }, 300)
      // Clean up the URL without a re-render
      const clean = window.location.pathname
      window.history.replaceState({}, '', clean)
    }
  }, [])

  function update(fields: Partial<BrandBrain>) {
    setForm(prev => ({ ...prev, ...fields }))
  }

  async function save() {
    setSaving(true)
    const res = await fetch('/api/brand-brain/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      const json = await res.json()
      setSaved(true)
      if (json._warning) {
        toast.error(t('brandBrain.toastMigration'))
      } else {
        toast.success(t('brandBrain.toastUpdated'))
      }
      setTimeout(() => setSaved(false), 2000)
    } else {
      toast.error(t('brandBrain.toastSaveFailed'))
    }
  }

  async function disconnectInstagram() {
    if (!confirm(t('brandBrain.igDisconnectConfirm'))) return
    setDisconnecting(true)
    const res = await fetch('/api/instagram/disconnect', { method: 'POST' })
    setDisconnecting(false)
    if (res.ok) {
      setIgConnection(null)
      toast.success(t('brandBrain.toastIgDisconnected'))
    } else {
      toast.error(t('brandBrain.toastDisconnectFailed'))
    }
  }

  function scrollTo(id: string) {
    setActiveSection(id)
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <style>{`
        .bb-input, .bb-textarea {
          width: 100%;
          background: var(--surface-3);
          border: 1px solid rgba(78,69,56,0.3);
          border-radius: 12px;
          color: var(--parchment);
          font-size: 14px;
          font-family: var(--font-ibm);
          font-weight: 400;
          padding: 12px 14px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          resize: none;
          box-sizing: border-box;
        }
        .bb-input::placeholder, .bb-textarea::placeholder { color: var(--muted); }
        .bb-input:focus, .bb-textarea:focus { border-color: rgba(182,141,64,0.4); box-shadow: 0 0 0 3px rgba(182,141,64,0.08); }
        .bb-textarea { line-height: 1.7; }
        .bb-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 28px; }
        .bb-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px 28px; }
        .bb-tone-chip {
          padding: 8px 16px; border-radius: 9999px;
          font-size: 12px; font-weight: 500;
          cursor: pointer; border: 1px solid rgba(78,69,56,0.3);
          background: transparent; color: var(--muted);
          font-family: var(--font-ibm); transition: all 0.15s;
        }
        .bb-tone-chip:hover { border-color: rgba(182,141,64,0.3); color: var(--sand); }
        .bb-tone-chip.active {
          border-color: rgba(182,141,64,0.4);
          background: rgba(182,141,64,0.1);
          color: var(--candle);
        }
        .bb-nav-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 11px 16px; cursor: pointer; border: none;
          background: none; width: 100%; text-align: left;
          transition: all 0.15s; border-radius: 12px;
        }
        .bb-nav-item:hover { background: rgba(78,69,56,0.2); }
        .bb-nav-item.active { background: var(--surface-3); }
        .bb-nav-item .num { font-family: var(--font-ibm); font-size: 10px; font-weight: 600; letter-spacing: 0.1em; min-width: 20px; transition: color 0.15s; color: var(--muted); }
        .bb-nav-item .name { font-family: var(--font-ibm); font-size: 14px; font-weight: 500; transition: color 0.15s; }
        .bb-nav-item.active .name { color: var(--parchment); }
        .bb-nav-item:not(.active) .name { color: var(--sand); }
        .bb-nav-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; transition: all 0.2s; }
        .bb-save-btn {
          width: 100%; padding: 11px 0; border-radius: 9999px;
          font-family: var(--font-syne); font-weight: 700; font-size: 13px;
          cursor: pointer; border: none; transition: background 0.15s;
        }
        .bb-save-btn:not(:disabled) { background: var(--candle); color: #ffffff; }
        .bb-save-btn:not(:disabled):hover { background: var(--ember); }
        .bb-save-btn:disabled { background: rgba(182,141,64,0.12); color: rgba(182,141,64,0.35); cursor: not-allowed; box-shadow: none; }
        .bb-save-btn.saved { background: rgba(110,191,139,0.15) !important; color: #6EBF8B !important; box-shadow: none !important; }
        .bb-section-card {
          background: var(--surface-2); border: 1px solid rgba(78,69,56,0.2);
          border-radius: 24px; padding: 36px;
          display: flex; flex-direction: column; gap: 24px;
        }
        .bb-section-card:hover { border-color: rgba(78,69,56,0.3); }
        [data-theme="light"] .bb-section-card { border-color: rgba(210,197,179,0.55); }
        [data-theme="light"] .bb-section-card:hover { border-color: rgba(182,141,64,0.3); }
        @media (max-width: 900px) {
          .bb-grid { grid-template-columns: 1fr; }
          .bb-grid-3 { grid-template-columns: 1fr 1fr; }
          .bb-layout { flex-direction: column !important; gap: 0 !important; padding: 20px 20px 60px !important; }
          .bb-sticky-sidebar { display: none !important; }
          .bb-mobile-nav { display: flex !important; }
          .bb-section-card { padding: 24px 20px !important; }
          .bb-page-header { padding: 16px 20px !important; flex-direction: column !important; align-items: flex-start !important; gap: 12px; }
          .bb-page-header-right { width: 100%; }
        }
        @media (max-width: 480px) {
          .bb-layout { padding: 12px 12px 60px !important; }
          .bb-grid-3 { grid-template-columns: 1fr !important; }
          .bb-section-card { padding: 18px 16px !important; border-radius: 16px !important; }
        }
        .bb-mobile-nav {
          display: none;
          overflow-x: auto; -webkit-overflow-scrolling: touch;
          gap: 8px; padding: 0 0 12px; margin-bottom: 16px;
          flex-shrink: 0;
        }
        .bb-mobile-nav::-webkit-scrollbar { display: none; }
        .bb-mobile-nav-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 7px 14px; border-radius: 9999px; white-space: nowrap;
          font-size: 12px; font-weight: 500; font-family: var(--font-ibm);
          border: 1px solid rgba(78,69,56,0.3); background: none;
          color: var(--sand); cursor: pointer; transition: all 0.15s; flex-shrink: 0;
        }
        .bb-mobile-nav-btn.active { background: rgba(182,141,64,0.1); border-color: rgba(182,141,64,0.4); color: var(--candle); }
        .bb-mobile-save {
          display: none; position: fixed; bottom: 0; left: 0; right: 0;
          padding: 12px 16px; background: var(--surface); border-top: 1px solid var(--border);
          z-index: 50;
        }
        @media (max-width: 900px) {
          .bb-mobile-save { display: block; }
        }
      `}</style>

      {/* ── Page header ── */}
      <div className="bb-page-header" style={{ borderBottom: '1px solid rgba(78,69,56,0.25)', padding: '24px 32px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexShrink: 0, background: 'var(--carbon)' }}>
        <div>
          <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--candle)', fontWeight: 600 }}>{t('brandBrain.headerLabel')}</span>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: 32, fontWeight: 800, color: 'var(--parchment)', letterSpacing: '-0.03em', lineHeight: 1.1, marginTop: 4 }}>{t('brandBrain.title')}</h1>
        </div>
        <div className="bb-page-header-right" style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--candle)', fontWeight: 600, marginBottom: 6 }}>{t('brandBrain.configStatus')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 140, height: 4, background: 'rgba(78,69,56,0.35)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: score >= 80 ? '#6EBF8B' : 'var(--candle)', width: `${score}%`, borderRadius: 2, transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 14, color: score >= 80 ? '#6EBF8B' : 'var(--candle)' }}>{score}%</span>
          </div>
        </div>
      </div>

      {/* ── Mobile bottom save button ── */}
      <div className="bb-mobile-save">
        <button className={`bb-save-btn${saved ? ' saved' : ''}`} onClick={save} disabled={saving}>
          {saving ? t('brandBrain.saving') : saved ? t('brandBrain.saved') : t('brandBrain.saveChanges')}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ── Mobile section nav (hidden on desktop, shown at ≤900px) ── */}
        <div className="bb-mobile-nav" style={{ padding: '12px 20px 0' }}>
          {SECTIONS.map(s => (
            <button key={s.id} className={`bb-mobile-nav-btn${activeSection === s.id ? ' active' : ''}`} onClick={() => scrollTo(s.id)}>
              {s.num} {s.label}
            </button>
          ))}
        </div>

      <div className="bb-layout" style={{ display: 'flex', gap: '40px', alignItems: 'flex-start', padding: '32px 40px 80px' }}>

        {/* ── Sticky sidebar ── */}
        <div className="bb-sticky-sidebar" style={{ width: 220, flexShrink: 0, position: 'sticky', top: 24 }}>
          <div style={{ width: 220 }}>

          {/* Brand card */}
          <div style={{
            background: 'var(--surface-2)', border: '1px solid rgba(78,69,56,0.2)',
            borderRadius: 16, padding: '18px 20px', marginBottom: 16,
          }}>
            <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--font-ibm)', marginBottom: 6 }}>
              {t('brandBrain.title')}
            </div>
            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15, color: 'var(--parchment)', letterSpacing: '-0.01em', lineHeight: 1.2, minHeight: 20 }}>
              {form.brand_name || <span style={{ color: 'rgba(196,185,154,0.25)', fontWeight: 300, fontSize: 13 }}>{t('brandBrain.unnamedBrand')}</span>}
            </div>
            {form.industry && (
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', marginTop: 3 }}>{form.industry}</div>
            )}

            {/* Score bar */}
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--font-ibm)' }}>{t('brandBrain.completeness')}</span>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-syne)', fontWeight: 700, color: score >= 80 ? '#6EBF8B' : score >= 40 ? '#D4A84B' : 'var(--muted)' }}>{score}%</span>
              </div>
              <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2, transition: 'width 0.4s ease',
                  width: `${score}%`,
                  background: score >= 80 ? '#6EBF8B' : score >= 40 ? '#D4A84B' : 'rgba(212,168,75,0.4)',
                }} />
              </div>
            </div>
          </div>

          {/* Section nav */}
          <nav style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {SECTIONS.map(s => {
              const done = sectionComplete(s.id, form)
              return (
                <button key={s.id} className={`bb-nav-item${activeSection === s.id ? ' active' : ''}`} onClick={() => scrollTo(s.id)}>
                  <span className="name">{s.label}</span>
                  <span className="bb-nav-dot" style={{
                    background: done ? 'var(--candle)' : 'rgba(78,69,56,0.4)',
                    boxShadow: done ? '0 0 6px rgba(182,141,64,0.3)' : 'none',
                  }} />
                </button>
              )
            })}
          </nav>

          <div style={{ height: 1, background: 'rgba(78,69,56,0.25)', marginBottom: 16 }} />

          <button
            className={`bb-save-btn${saved ? ' saved' : ''}`}
            onClick={save}
            disabled={saving}
          >
            {saving ? t('brandBrain.saving') : saved ? t('brandBrain.saved') : t('brandBrain.saveChanges')}
          </button>
          </div>
        </div>

        {/* ── Main content ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ── 01 Identity ── */}
          <section ref={el => { sectionRefs.current['identity'] = el }} id="identity" style={{ scrollMarginTop: 24 }}>
            <Card>
              <SectionHeader num="01" title={t('brandBrain.sectionIdentity')} done={sectionComplete('identity', form)} completeLabel={t('brandBrain.complete')} />

              <div className="bb-grid">
                <Field label={t('brandBrain.brandName')}>
                  <input className="bb-input" value={form.brand_name || ''} onChange={e => update({ brand_name: e.target.value })} placeholder={t('brandBrain.brandNamePlaceholder')} />
                </Field>
                <Field label={t('brandBrain.industry')}>
                  <input className="bb-input" value={form.industry || ''} onChange={e => update({ industry: e.target.value })} placeholder={t('brandBrain.industryPlaceholder')} />
                </Field>
                <Field label={t('brandBrain.language')}>
                  <select
                    className="bb-input"
                    value={form.language || 'en'}
                    onChange={e => {
                      const val = e.target.value as LangCode
                      update({ language: val })
                      setLanguage(val)
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </Field>
                <Field label={t('brandBrain.location')}>
                  <input className="bb-input" value={form.location || ''} onChange={e => update({ location: e.target.value })} placeholder={t('brandBrain.locationPlaceholder')} />
                </Field>
              </div>

              <div style={{ height: 1, background: 'rgba(78,69,56,0.3)' }} />

              <Field label={t('brandBrain.brandDesc')} hint={t('brandBrain.brandDescHint')}>
                <textarea className="bb-textarea" rows={4} value={form.brand_description || ''} onChange={e => update({ brand_description: e.target.value })} placeholder={t('brandBrain.brandDescPlaceholder')} />
              </Field>
              <Field label={t('brandBrain.products')}>
                <textarea className="bb-textarea" rows={3} value={form.products || ''} onChange={e => update({ products: e.target.value })} placeholder={t('brandBrain.productsPlaceholder')} />
              </Field>

              <div style={{ height: 1, background: 'rgba(78,69,56,0.3)' }} />

              <div className="bb-grid">
                <Field label={t('brandBrain.slogans')}>
                  <input className="bb-input" value={form.slogans || ''} onChange={e => update({ slogans: e.target.value })} placeholder={t('brandBrain.slogansPlaceholder')} />
                </Field>
                <Field label={t('brandBrain.website')}>
                  <input className="bb-input" type="url" value={form.website_url || ''} onChange={e => update({ website_url: e.target.value })} placeholder={t('brandBrain.websitePlaceholder')} />
                </Field>
              </div>
            </Card>
          </section>

          {/* ── 02 Voice & Tone ── */}
          <section ref={el => { sectionRefs.current['voice'] = el }} id="voice" style={{ scrollMarginTop: 24 }}>
            <Card>
              <SectionHeader num="02" title={t('brandBrain.sectionVoice')} done={sectionComplete('voice', form)} completeLabel={t('brandBrain.complete')} />

              <Field label={t('brandBrain.toneKeywords')} hint={t('brandBrain.toneKeywordsHint')}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {TONE_KEYS.map(key => {
                    const sel = (form.tone_keywords || []).includes(key)
                    return (
                      <button
                        key={key}
                        className={`bb-tone-chip${sel ? ' active' : ''}`}
                        onClick={() => {
                          const curr = form.tone_keywords || []
                          update({ tone_keywords: sel ? curr.filter(k => k !== key) : curr.length < 3 ? [...curr, key] : curr })
                        }}
                      >{t(`onboarding.tone.${key}`)}</button>
                    )
                  })}
                </div>
              </Field>

              <div style={{ height: 1, background: 'rgba(78,69,56,0.3)' }} />

              <Field label={t('brandBrain.toneVoice')}>
                <textarea className="bb-textarea" rows={3} value={form.tone_description || ''} onChange={e => update({ tone_description: e.target.value })} placeholder={t('brandBrain.toneVoicePlaceholder')} />
              </Field>

              <div className="bb-grid">
                <Field label={t('brandBrain.targetAudience')}>
                  <textarea className="bb-textarea" rows={3} value={form.target_audience || ''} onChange={e => update({ target_audience: e.target.value })} placeholder={t('brandBrain.targetAudiencePlaceholder')} />
                </Field>
                <Field label={t('brandBrain.audienceProblem')}>
                  <textarea className="bb-textarea" rows={3} value={form.audience_problem || ''} onChange={e => update({ audience_problem: e.target.value })} placeholder={t('brandBrain.audienceProblemPlaceholder')} />
                </Field>
              </div>
            </Card>
          </section>

          {/* ── 03 Content ── */}
          <section ref={el => { sectionRefs.current['content'] = el }} id="content" style={{ scrollMarginTop: 24 }}>
            <Card>
              <SectionHeader num="03" title={t('brandBrain.sectionContent')} done={sectionComplete('content', form)} completeLabel={t('brandBrain.complete')} />

              <Field label={t('brandBrain.postTopics')}>
                <textarea className="bb-textarea" rows={4} value={form.post_topics || ''} onChange={e => update({ post_topics: e.target.value })} placeholder={t('brandBrain.postTopicsPlaceholder')} />
              </Field>
              <Field label={t('brandBrain.postAvoid')}>
                <textarea className="bb-textarea" rows={3} value={form.post_avoid || ''} onChange={e => update({ post_avoid: e.target.value })} placeholder={t('brandBrain.postAvoidPlaceholder')} />
              </Field>

              <div
                onClick={() => update({ include_people: !(form.include_people ?? true) })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                  border: '1px solid rgba(78,69,56,0.3)',
                  background: (form.include_people ?? true) ? 'rgba(182,141,64,0.05)' : 'var(--surface-3)',
                  transition: 'border-color 0.2s, background 0.2s',
                  userSelect: 'none',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(182,141,64,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(78,69,56,0.3)')}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  border: `1.5px solid ${(form.include_people ?? true) ? 'var(--candle)' : 'rgba(78,69,56,0.5)'}`,
                  background: (form.include_people ?? true) ? 'var(--candle)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {(form.include_people ?? true) && (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <polyline points="2,6 5,9 10,3" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--parchment)', fontFamily: 'var(--font-ibm)', fontWeight: 400 }}>
                    {t('brandBrain.includePeople')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontWeight: 300, marginTop: 2 }}>
                    {t('brandBrain.includePeopleHint')}
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: 'rgba(78,69,56,0.3)' }} />

              <div className="bb-grid">
                <Field label={t('brandBrain.contentRatio')} hint={t('brandBrain.contentRatioHint')}>
                  <ContentRatioSlider
                    value={form.content_ratio || ''}
                    onChange={val => update({ content_ratio: val })}
                    topicsLabel={t('brandBrain.topicsLabel')}
                    servicesLabel={t('brandBrain.servicesLabel')}
                    exampleText={t('brandBrain.contentRatioExample')}
                  />
                </Field>
                <Field label={t('brandBrain.materials')}>
                  <input className="bb-input" type="url" value={form.materials_link || ''} onChange={e => update({ materials_link: e.target.value })} placeholder={t('brandBrain.materialsPlaceholder')} />
                </Field>
              </div>

              <div style={{ height: 1, background: 'rgba(78,69,56,0.3)' }} />

              {/* Promotions */}
              <div>
                <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--font-ibm)', marginBottom: 4 }}>
                  {t('brandBrain.activePromotions')}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(196,185,154,0.4)', fontFamily: 'var(--font-ibm)', fontWeight: 300, marginBottom: 16, lineHeight: 1.5 }}>
                  {t('brandBrain.activePromotionsHint')}
                </div>
                <div className="bb-grid">
                  <Field label={t('brandBrain.specialOffer')} hint={t('brandBrain.specialOfferHint')}>
                    <input
                      className="bb-input"
                      value={form.special_offer || ''}
                      onChange={e => update({ special_offer: e.target.value })}
                      placeholder={t('brandBrain.specialOfferPlaceholder')}
                    />
                  </Field>
                  <Field label={t('brandBrain.discount')} hint={t('brandBrain.discountHint')}>
                    <input
                      className="bb-input"
                      value={form.discount || ''}
                      onChange={e => update({ discount: e.target.value })}
                      placeholder={t('brandBrain.discountPlaceholder')}
                    />
                  </Field>
                </div>
              </div>
            </Card>
          </section>

          {/* ── 04 Schedule ── */}
          <section ref={el => { sectionRefs.current['schedule'] = el }} id="schedule" style={{ scrollMarginTop: 24 }}>
            <Card>
              <SectionHeader num="04" title={t('brandBrain.sectionSchedule')} done={sectionComplete('schedule', form)} completeLabel={t('brandBrain.complete')} />

              <div className="bb-grid">
                <Field label={t('brandBrain.postingFrequency')}>
                  <input className="bb-input" value={form.posting_frequency || ''} onChange={e => update({ posting_frequency: e.target.value })} placeholder={t('brandBrain.postingFrequencyPlaceholder')} />
                </Field>
                <Field label={t('brandBrain.postingTime')}>
                  <input className="bb-input" value={form.posting_time || ''} onChange={e => update({ posting_time: e.target.value })} placeholder={t('brandBrain.postingTimePlaceholder')} />
                </Field>
              </div>

              <div style={{ height: 1, background: 'rgba(78,69,56,0.3)' }} />

              {/* Instagram connection */}
              <div>
                <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--font-ibm)', marginBottom: 12 }}>
                  {t('brandBrain.igConnection')}
                </div>
                {igConnection ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '16px 20px', background: 'rgba(110,191,139,0.05)',
                    border: '1px solid rgba(110,191,139,0.12)', borderRadius: 8,
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 8,
                      background: 'rgba(110,191,139,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <rect x="2" y="2" width="20" height="20" rx="5" stroke="#6EBF8B" strokeWidth="1.5"/>
                        <circle cx="12" cy="12" r="4" stroke="#6EBF8B" strokeWidth="1.5"/>
                        <circle cx="17.5" cy="6.5" r="1" fill="#6EBF8B"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--parchment)', fontFamily: 'var(--font-ibm)', fontWeight: 400 }}>
                        @<span style={{ color: '#6EBF8B' }}>{igConnection.username}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', marginTop: 2 }}>
                        {t('brandBrain.igAutoPublishing')}
                      </div>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6EBF8B' }} />
                        <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6EBF8B', fontFamily: 'var(--font-ibm)' }}>{t('brandBrain.igActive')}</span>
                      </div>
                      <button
                        onClick={disconnectInstagram}
                        disabled={disconnecting}
                        style={{
                          padding: '5px 12px', borderRadius: 6,
                          background: 'transparent',
                          border: '1px solid rgba(196,185,154,0.18)',
                          color: 'var(--muted)', fontSize: 11,
                          fontFamily: 'var(--font-ibm)', fontWeight: 400,
                          cursor: disconnecting ? 'not-allowed' : 'pointer',
                          opacity: disconnecting ? 0.5 : 1,
                          transition: 'border-color 0.15s, color 0.15s',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = 'rgba(220,80,80,0.35)'; (e.target as HTMLButtonElement).style.color = '#e07070' }}
                        onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = 'rgba(196,185,154,0.18)'; (e.target as HTMLButtonElement).style.color = 'var(--muted)' }}
                      >
                        {disconnecting ? t('brandBrain.igDisconnecting') : t('brandBrain.igDisconnect')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '16px 20px', background: 'var(--surface-2)',
                    border: '1px solid var(--border)', borderRadius: 8,
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 8, background: 'var(--surface)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <rect x="2" y="2" width="20" height="20" rx="5" stroke="rgba(196,185,154,0.25)" strokeWidth="1.5"/>
                        <circle cx="12" cy="12" r="4" stroke="rgba(196,185,154,0.25)" strokeWidth="1.5"/>
                        <circle cx="17.5" cy="6.5" r="1" fill="rgba(196,185,154,0.25)"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: 'var(--sand)', fontFamily: 'var(--font-ibm)', fontWeight: 300 }}>{t('brandBrain.igNotConnected')}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', marginTop: 2 }}>{t('brandBrain.igConnectPrompt')}</div>
                    </div>
                    <a href="/api/instagram/auth" style={{ textDecoration: 'none' }}>
                      <button style={{
                        padding: '8px 18px', background: '#D4A84B', color: '#ffffff',
                        border: 'none', borderRadius: 6, fontFamily: 'var(--font-syne)',
                        fontWeight: 700, fontSize: 11, letterSpacing: '0.07em',
                        cursor: 'pointer', whiteSpace: 'nowrap', textTransform: 'uppercase',
                      }}>
                        {t('brandBrain.igConnectBtn')}
                      </button>
                    </a>
                  </div>
                )}
              </div>
            </Card>
          </section>

          {/* ── 05 Assets ── */}
          <section ref={el => { sectionRefs.current['assets'] = el }} id="assets" style={{ scrollMarginTop: 24 }}>
            <Card>
              <div>
                <SectionHeader num="05" title={t('brandBrain.sectionAssets')} done={false} completeLabel={t('brandBrain.complete')} />
                <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontWeight: 300, lineHeight: 1.7 }}>
                  {t('assets.uploadDrop')} {t('assets.uploadFormats')}
                </p>
              </div>
              <AssetUploader assets={assets} userId={userId} onAssetsChange={setAssets} />
            </Card>
          </section>

        </div>
      </div>
      </div>
    </>
  )
}
