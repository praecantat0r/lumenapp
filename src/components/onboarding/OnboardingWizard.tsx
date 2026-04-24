'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Step1Basics } from './steps/Step1Basics'
import { Step2Brand } from './steps/Step2Brand'
import { Step3Tone } from './steps/Step3Tone'
import { Step4Content } from './steps/Step4Content'
import { Step5Settings } from './steps/Step5Settings'
import { Step6Instagram } from './steps/Step6Instagram'
import { OnboardingSuccess } from './OnboardingSuccess'
import { LumenMark } from '@/components/ui/LumenLogo'
import type { BrandBrainForm } from '@/types'
import toast from 'react-hot-toast'
import { useLanguage } from '@/lib/i18n/context'

const STEP_KEYS = [
  { number: '01', titleKey: 'onboarding.steps.s1title', ctxKey: 'onboarding.steps.s1ctx' },
  { number: '02', titleKey: 'onboarding.steps.s2title', ctxKey: 'onboarding.steps.s2ctx' },
  { number: '03', titleKey: 'onboarding.steps.s3title', ctxKey: 'onboarding.steps.s3ctx' },
  { number: '04', titleKey: 'onboarding.steps.s4title', ctxKey: 'onboarding.steps.s4ctx' },
  { number: '05', titleKey: 'onboarding.steps.s5title', ctxKey: 'onboarding.steps.s5ctx' },
  { number: '06', titleKey: 'onboarding.steps.s6title', ctxKey: 'onboarding.steps.s6ctx' },
]

const initialForm: BrandBrainForm = {
  brand_name: '', website_url: '', industry: '', location: '', language: 'en',
  brand_description: '', products: '', slogans: '',
  tone_keywords: [], tone_description: '', target_audience: '', audience_problem: '',
  post_topics: '', post_avoid: '', content_ratio: '', materials_link: '',
  platforms: ['instagram'], posting_frequency: '3x/week', posting_time: '',
}

export function OnboardingWizard({ userId }: { userId: string }) {
  const [step, setStep]       = useState(1)
  const [form, setForm]       = useState<BrandBrainForm>(initialForm)
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const router = useRouter()
  const { t } = useLanguage()

  function update(fields: Partial<BrandBrainForm>) { setForm(prev => ({ ...prev, ...fields })) }

  async function next() {
    // After step 1, scrape the website and run AI autofill in parallel
    if (step === 1) {
      setLoading(true)
      try {
        // 1. Scrape website (if URL provided)
        let scraped: Record<string, unknown> = {}
        if (form.website_url) {
          try {
            const r = await fetch('/api/brand-brain/scrape', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ website_url: form.website_url }),
            })
            if (r.ok) {
              const result = await r.json()
              if (result.scraped_about) scraped = result
              else toast(t('onboarding.scrapeWarning'), { icon: '⚠️' })
            } else {
              toast(t('onboarding.scrapeError'), { icon: '⚠️' })
            }
          } catch {
            toast(t('onboarding.scrapeNetError'), { icon: '⚠️' })
          }
        }

        // 2. AI autofill — cheap gpt-4o-mini fills remaining fields in Slovak
        let ai: Record<string, unknown> = {}
        try {
          const r = await fetch('/api/brand-brain/autofill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              brand_name:        form.brand_name,
              industry:          form.industry,
              location:          form.location,
              brand_description: scraped.scraped_about    || '',
              products:          scraped.scraped_products || '',
              slogans:           scraped.scraped_taglines
                                   ? (scraped.scraped_taglines as string[]).join(', ')
                                   : '',
            }),
          })
          if (r.ok) ai = await r.json()
        } catch { /* autofill failure is non-blocking */ }

        // 3. Merge results into form — user-typed values always win
        setForm(prev => ({
          ...prev,

          // Scraped fields (step 2) — only fill if empty
          brand_description: prev.brand_description || (scraped.scraped_about    as string) || prev.brand_description,
          products:          prev.products          || (scraped.scraped_products as string) || prev.products,
          slogans:           prev.slogans           || (scraped.scraped_taglines as string[] ?? []).join(', ') || prev.slogans,
          scraped_about:     (scraped.scraped_about    as string) ?? prev.scraped_about,
          scraped_products:  (scraped.scraped_products as string) ?? prev.scraped_products,
          scraped_taglines:  (scraped.scraped_taglines as string[]) ?? prev.scraped_taglines,

          // AI-filled fields (steps 3–5) — only fill if empty
          tone_keywords:    prev.tone_keywords.length > 0   ? prev.tone_keywords   : (ai.tone_keywords    as string[]) ?? prev.tone_keywords,
          tone_description: prev.tone_description.trim()    ? prev.tone_description : (ai.tone_description as string)  ?? prev.tone_description,
          target_audience:  prev.target_audience.trim()     ? prev.target_audience  : (ai.target_audience  as string)  ?? prev.target_audience,
          audience_problem: prev.audience_problem.trim()    ? prev.audience_problem : (ai.audience_problem as string)  ?? prev.audience_problem,
          post_topics:      prev.post_topics.trim()         ? prev.post_topics      : (Array.isArray(ai.post_topics) ? (ai.post_topics as string[]).join('\n') : (ai.post_topics as string)) ?? prev.post_topics,
          post_avoid:       prev.post_avoid.trim()          ? prev.post_avoid       : (Array.isArray(ai.post_avoid)   ? (ai.post_avoid   as string[]).join('\n') : (ai.post_avoid   as string)) ?? prev.post_avoid,
          content_ratio:    prev.content_ratio?.trim()      ? prev.content_ratio    : (ai.content_ratio    as string)  ?? prev.content_ratio,
          posting_time:     prev.posting_time?.trim()       ? prev.posting_time     : (ai.posting_time     as string)  ?? prev.posting_time,
        }))
      } finally {
        setLoading(false)
      }
    }
    setStep(s => Math.min(s + 1, 6))
  }

  function back() { setStep(s => Math.max(s - 1, 1)) }

  async function submit() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('brand_brains').upsert({
        user_id: userId, ...form, onboarding_complete: true, status: 'active',
      }, { onConflict: 'user_id' })
      if (error) throw error
      setStep(6)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function complete() {
    setDone(true)
    setTimeout(() => router.push('/dashboard/overview'), 2800)
  }

  if (done) return <OnboardingSuccess />

  const meta     = STEP_KEYS[step - 1]
  const progress = (step / 6) * 100

  return (
    <>
      <style>{`
        @keyframes obReveal {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ob-anim { animation: obReveal 0.45s cubic-bezier(0.22,1,0.36,1) both; }

        /* Input overrides — clean underline inside .ob-form */
        .ob-form input:not([type=radio]):not([type=checkbox]),
        .ob-form textarea,
        .ob-form select {
          background: transparent !important;
          border: none !important;
          border-bottom: 1px solid rgba(45,42,31,0.9) !important;
          border-radius: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          caret-color: #D4A84B;
        }
        .ob-form input:focus:not([type=radio]):not([type=checkbox]),
        .ob-form textarea:focus,
        .ob-form select:focus {
          border-bottom-color: #D4A84B !important;
          outline: none !important;
          box-shadow: none !important;
        }
        .ob-form input::placeholder,
        .ob-form textarea::placeholder { color: rgba(196,185,154,0.25) !important; }
        .ob-form input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px #111009 inset !important;
          -webkit-text-fill-color: #F6F2EA !important;
        }

        /* Shared button classes for step components */
        .ob-btn {
          background: #D4A84B; color: #ffffff; border: none;
          padding: 12px 28px;
          font-family: var(--font-syne); font-weight: 700;
          font-size: 12px; letter-spacing: 0.07em; text-transform: uppercase;
          cursor: pointer; transition: background 0.15s, transform 0.1s;
        }
        .ob-btn:hover:not(:disabled) { background: #c4983d; }
        .ob-btn:active:not(:disabled) { transform: scale(0.985); }
        .ob-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .ob-btn-ghost {
          background: transparent; color: rgba(196,185,154,0.4); border: none;
          padding: 12px 0;
          font-family: var(--font-ibm); font-size: 13px;
          cursor: pointer; transition: color 0.15s;
        }
        .ob-btn-ghost:hover { color: rgba(196,185,154,0.75); }

        /* Tone/platform toggle chips */
        .ob-chip {
          padding: 6px 14px;
          font-size: 12px; font-family: var(--font-ibm); font-weight: 300;
          letter-spacing: 0.04em; cursor: pointer;
          background: transparent;
          color: rgba(196,185,154,0.5);
          border: 1px solid rgba(45,42,31,0.9);
          transition: all 0.15s;
        }
        .ob-chip:hover:not(.ob-chip-on) { border-color: rgba(196,185,154,0.35); color: rgba(196,185,154,0.8); }
        .ob-chip-on { background: rgba(212,168,75,0.1); color: #D4A84B; border-color: rgba(212,168,75,0.35); }

        /* Platform card */
        .ob-platform {
          padding: 18px 8px; cursor: pointer; text-align: center;
          background: transparent; border: 1px solid rgba(45,42,31,0.9);
          color: rgba(196,185,154,0.45); transition: all 0.15s;
          font-family: var(--font-ibm); font-size: 13px;
        }
        .ob-platform:hover:not(.ob-platform-on) { border-color: rgba(196,185,154,0.3); }
        .ob-platform-on { background: rgba(212,168,75,0.08); color: #D4A84B; border-color: rgba(212,168,75,0.3); }

        .ob-dot-grid {
          background-image: radial-gradient(circle, rgba(212,168,75,0.08) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        .ob-glow { background: radial-gradient(ellipse at 55% 35%, rgba(212,168,75,0.09) 0%, transparent 65%); }

        @media (max-width: 780px) {
          .ob-left  { display: none !important; }
          .ob-right { padding: 36px 24px !important; }
        }
      `}</style>

      {/* Progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, background: 'rgba(45,42,31,0.6)', zIndex: 100 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: '#D4A84B', transition: 'width 0.55s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>

      <div style={{ display: 'flex', minHeight: '100vh', background: '#111009', paddingTop: 2 }}>

        {/* ── Left panel ── */}
        <div
          className="ob-left ob-dot-grid ob-glow"
          style={{
            width: '42%', flexShrink: 0,
            background: '#0D0C07',
            borderRight: '1px solid rgba(212,168,75,0.1)',
            display: 'flex', flexDirection: 'column',
            padding: '40px 44px',
            position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <LumenMark size={20} />
              <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 14, color: '#F6F2EA', letterSpacing: '-0.01em' }}>lumen</span>
            </div>
            <button
              onClick={async () => { const s = createClient(); await s.auth.signOut(); router.push('/login') }}
              style={{ background: 'none', border: 'none', color: 'rgba(196,185,154,0.28)', fontFamily: 'var(--font-ibm)', fontSize: 10, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}
            >
              {t('onboarding.signOut')}
            </button>
          </div>

          {/* Step content — re-mounts on step change for animation */}
          <div className="ob-anim" key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: 32 }}>
            <div style={{
              fontFamily: 'var(--font-syne)', fontWeight: 700,
              fontSize: 'clamp(72px, 10vw, 108px)',
              color: 'rgba(212,168,75,0.055)',
              lineHeight: 1, letterSpacing: '-0.04em',
              marginBottom: -12, userSelect: 'none',
            }}>
              {meta.number}
            </div>

            <p style={{ fontFamily: 'var(--font-ibm)', fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(212,168,75,0.65)', marginBottom: 16 }}>
              {t('onboarding.stepOf').replace('{step}', String(step))}
            </p>

            <h2 style={{
              fontFamily: 'var(--font-syne)', fontWeight: 700,
              fontSize: 'clamp(24px, 2.8vw, 36px)',
              lineHeight: 1.1, color: '#F6F2EA',
              letterSpacing: '-0.02em', marginBottom: 16,
            }}>
              {t(meta.titleKey)}
            </h2>

            <p style={{
              fontFamily: 'var(--font-ibm)', fontWeight: 300,
              fontSize: 13.5, lineHeight: 1.75,
              color: 'rgba(196,185,154,0.48)', maxWidth: 270,
            }}>
              {t(meta.ctxKey)}
            </p>
          </div>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {STEP_KEYS.map((_, i) => (
              <div key={i} style={{
                height: 4,
                width: i + 1 === step ? 22 : 4,
                borderRadius: 2,
                background: i + 1 <= step ? '#D4A84B' : 'rgba(45,42,31,0.9)',
                transition: 'all 0.45s cubic-bezier(0.4,0,0.2,1)',
              }} />
            ))}
          </div>

          <div style={{ position: 'absolute', bottom: 0, right: -1, width: 80, height: 80, borderTop: '1px solid rgba(212,168,75,0.06)', borderLeft: '1px solid rgba(212,168,75,0.06)', pointerEvents: 'none' }} />
        </div>

        {/* ── Right panel ── */}
        <div
          className="ob-right ob-form"
          style={{ flex: 1, overflowY: 'auto', padding: '64px 60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div className="ob-anim" key={`f${step}`} style={{ width: '100%', maxWidth: 440 }}>
            {step === 1 && <Step1Basics data={form} onChange={update} onNext={next} loading={loading} />}
            {step === 2 && <Step2Brand  data={form} onChange={update} onNext={next} onBack={back} />}
            {step === 3 && <Step3Tone   data={form} onChange={update} onNext={next} onBack={back} />}
            {step === 4 && <Step4Content data={form} onChange={update} onNext={next} onBack={back} />}
            {step === 5 && <Step5Settings data={form} onChange={update} onSubmit={submit} onBack={back} loading={loading} />}
            {step === 6 && <Step6Instagram hasInstagram={form.platforms.includes('instagram')} onComplete={complete} />}
          </div>
        </div>

      </div>
    </>
  )
}
