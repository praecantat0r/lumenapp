'use client'
import { useState, useEffect } from 'react'
import { LangProvider } from './_components/LangContext'
import { Nav } from './_components/Nav'
import { HeroA, HeroB } from './_components/Hero'
import { HowItWorks } from './_components/HowItWorks'
import { Features } from './_components/Features'
import { BrandBrain } from './_components/BrandBrain'
import { BeforeAfter } from './_components/BeforeAfter'
import { FeedPreview } from './_components/FeedPreview'
import { VideoPreview } from './_components/VideoPreview'
import { Testimonials } from './_components/Testimonials'
import { Pricing } from './_components/Pricing'
import { FAQ } from './_components/FAQ'
import { Footer } from './_components/Footer'

const TWEAK_DEFAULTS = {
  heroVariant: 'B' as 'A' | 'B',
  headline: '',
  ctaLabel: 'Start free trial',
  feedDensity: 'default',
  theme: 'light',
  sections: {
    howItWorks: true,
    features: true,
    brandBrain: true,
    beforeAfter: true,
    feed: true,
    video: true,
    testimonials: true,
    pricing: true,
    faq: true,
  },
}

type TweakState = typeof TWEAK_DEFAULTS

function App() {
  const [state, setState] = useState<TweakState>(() => ({
    ...TWEAK_DEFAULTS,
    theme: typeof window !== 'undefined'
      ? (localStorage.getItem('lumen-theme') ?? 'light')
      : 'light',
  }))
  const [scrolled, setScrolled] = useState(false)

  // apply theme to <html> and persist
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme)
    localStorage.setItem('lumen-theme', state.theme)
  }, [state.theme])

  // scroll tracker
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const update = (patch: Partial<Omit<TweakState, 'sections'>> & { sections?: Partial<Record<string, boolean>> }) => {
    setState(s => {
      const next = { ...s, ...patch } as TweakState
      if (patch.sections) next.sections = { ...s.sections, ...patch.sections } as TweakState['sections']
      return next
    })
  }

  const scrollToPricing = () => {
    const el = document.getElementById('pricing')
    if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' })
  }

  const goToSignup = () => {
    window.location.href = 'https://app.lumen-reach.com/signup'
  }

  const Hero = state.heroVariant === 'B' ? HeroB : HeroA

  return (
    <>
      <Nav
        theme={state.theme}
        scrolled={scrolled}
        onThemeChange={t => update({ theme: t })}
        onCTA={scrollToPricing}
      />

      <Hero
        theme={state.theme}
        headline={state.headline}
        ctaLabel={state.ctaLabel}
        onCTA={goToSignup}
      />

      {state.sections.howItWorks  && <HowItWorks />}
      {state.sections.features    && <Features />}
      {state.sections.brandBrain  && <BrandBrain />}
      {state.sections.beforeAfter && <BeforeAfter />}
      {state.sections.feed        && <FeedPreview density={state.feedDensity} />}
      {state.sections.video       && <VideoPreview />}
      {state.sections.testimonials && <Testimonials />}
      {state.sections.pricing     && <Pricing onCTA={scrollToPricing} />}
      {state.sections.faq         && <FAQ />}

      <Footer onCTA={goToSignup} />

    </>
  )
}

export default function LandingPage() {
  return (
    <LangProvider>
      <App />
    </LangProvider>
  )
}
