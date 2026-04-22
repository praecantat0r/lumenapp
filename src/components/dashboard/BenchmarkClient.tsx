'use client'
import { useState, useCallback, useRef } from 'react'

/* ─── Types ─────────────────────────────────────────────── */
interface NavTiming {
  ttfb: number
  dns: number
  tcp: number
  ssl: number
  pageLoad: number
  domReady: number
  transferSize: number
  decodedBodySize: number
}

interface CoreVitals {
  lcp: number | null
  fcp: number | null
  cls: number | null
  fid: number | null
}

interface ResourceEntry {
  name: string
  type: string
  duration: number
  transferSize: number
  decodedBodySize: number
}

interface ResourceSummary {
  script: { count: number; size: number; duration: number }
  css: { count: number; size: number; duration: number }
  font: { count: number; size: number; duration: number }
  img: { count: number; size: number; duration: number }
  fetch: { count: number; size: number; duration: number }
  other: { count: number; size: number; duration: number }
}

interface BenchmarkResult {
  nav: NavTiming
  vitals: CoreVitals
  resources: ResourceEntry[]
  summary: ResourceSummary
  score: number
  timestamp: number
}

/* ─── Helpers ───────────────────────────────────────────── */
function getResourceType(entry: PerformanceResourceTiming): string {
  const url = entry.name
  const init = (entry as PerformanceResourceTiming & { initiatorType?: string }).initiatorType || ''
  if (init === 'fetch' || init === 'xmlhttprequest') return 'fetch'
  if (init === 'img' || /\.(png|jpe?g|gif|webp|avif|svg|ico)(\?|$)/i.test(url)) return 'img'
  if (init === 'script' || /\.js(\?|$)/i.test(url)) return 'script'
  if (init === 'link' || init === 'css' || /\.css(\?|$)/i.test(url)) return 'css'
  if (/\.(woff2?|ttf|otf|eot)(\?|$)/i.test(url)) return 'font'
  return 'other'
}

function score100(val: number, good: number, poor: number): number {
  if (val <= good) return 100
  if (val >= poor) return 0
  return Math.round(100 - ((val - good) / (poor - good)) * 100)
}

function calcScore(nav: NavTiming, vitals: CoreVitals): number {
  const scores: number[] = []
  scores.push(score100(nav.ttfb, 800, 1800))
  scores.push(score100(nav.pageLoad, 2500, 6000))
  scores.push(score100(nav.transferSize / 1024, 500, 3000))   // KB
  if (vitals.lcp !== null) scores.push(score100(vitals.lcp, 2500, 4000))
  if (vitals.fcp !== null) scores.push(score100(vitals.fcp, 1800, 3000))
  if (vitals.cls !== null) scores.push(score100(vitals.cls * 1000, 100, 250)) // scaled
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

function fmt(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`
  return `${Math.round(ms)}ms`
}

function fmtBytes(bytes: number): string {
  if (bytes <= 0) return '—'
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

type Rating = 'good' | 'needs' | 'poor'
function rate(val: number, good: number, poor: number): Rating {
  if (val <= good) return 'good'
  if (val >= poor) return 'poor'
  return 'needs'
}

const RATING_COLOR: Record<Rating, string> = {
  good: '#6EBF8B',
  needs: '#D4A84B',
  poor: '#E07070',
}
const RATING_LABEL: Record<Rating, string> = {
  good: 'Good',
  needs: 'Needs work',
  poor: 'Poor',
}

function scoreColor(s: number): string {
  if (s >= 70) return '#6EBF8B'
  if (s >= 40) return '#D4A84B'
  return '#E07070'
}

/* ─── Component ─────────────────────────────────────────── */
export function BenchmarkClient() {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<BenchmarkResult | null>(null)
  const observersRef = useRef<PerformanceObserver[]>([])

  const run = useCallback(async () => {
    setRunning(true)

    // Disconnect previous observers
    observersRef.current.forEach(o => o.disconnect())
    observersRef.current = []

    // Collect Core Web Vitals via PerformanceObserver
    const vitals: CoreVitals = { lcp: null, fcp: null, cls: null, fid: null }

    await new Promise<void>(resolve => {
      let clsAcc = 0
      const WAIT = 2000

      // LCP
      try {
        const lcpObs = new PerformanceObserver(list => {
          const entries = list.getEntries()
          const last = entries[entries.length - 1] as PerformanceEntry & { startTime: number }
          vitals.lcp = last.startTime
        })
        lcpObs.observe({ type: 'largest-contentful-paint', buffered: true })
        observersRef.current.push(lcpObs)
      } catch (_) {}

      // FCP
      try {
        const fcpObs = new PerformanceObserver(list => {
          for (const e of list.getEntries()) {
            if (e.name === 'first-contentful-paint') vitals.fcp = e.startTime
          }
        })
        fcpObs.observe({ type: 'paint', buffered: true })
        observersRef.current.push(fcpObs)
      } catch (_) {}

      // CLS
      try {
        const clsObs = new PerformanceObserver(list => {
          for (const e of list.getEntries()) {
            const ls = e as PerformanceEntry & { hadRecentInput?: boolean; value?: number }
            if (!ls.hadRecentInput) clsAcc += ls.value ?? 0
          }
          vitals.cls = clsAcc
        })
        clsObs.observe({ type: 'layout-shift', buffered: true })
        observersRef.current.push(clsObs)
      } catch (_) {}

      // FID
      try {
        const fidObs = new PerformanceObserver(list => {
          const e = list.getEntries()[0] as PerformanceEntry & { processingStart?: number }
          if (e && e.processingStart) vitals.fid = e.processingStart - e.startTime
        })
        fidObs.observe({ type: 'first-input', buffered: true })
        observersRef.current.push(fidObs)
      } catch (_) {}

      setTimeout(() => {
        vitals.cls = clsAcc
        resolve()
      }, WAIT)
    })

    // Navigation timing
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    const nav = navEntries[0]
    const navData: NavTiming = nav ? {
      ttfb: nav.responseStart - nav.requestStart,
      dns: nav.domainLookupEnd - nav.domainLookupStart,
      tcp: nav.connectEnd - nav.connectStart,
      ssl: nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : 0,
      pageLoad: nav.loadEventEnd - nav.startTime,
      domReady: nav.domContentLoadedEventEnd - nav.startTime,
      transferSize: nav.transferSize || 0,
      decodedBodySize: nav.decodedBodySize || 0,
    } : {
      ttfb: 0, dns: 0, tcp: 0, ssl: 0,
      pageLoad: performance.now(), domReady: performance.now(),
      transferSize: 0, decodedBodySize: 0,
    }

    // Resource timing
    const rawResources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    const resources: ResourceEntry[] = rawResources.map(r => ({
      name: r.name,
      type: getResourceType(r),
      duration: r.duration,
      transferSize: r.transferSize,
      decodedBodySize: r.decodedBodySize,
    })).sort((a, b) => b.transferSize - a.transferSize)

    const summary: ResourceSummary = {
      script: { count: 0, size: 0, duration: 0 },
      css: { count: 0, size: 0, duration: 0 },
      font: { count: 0, size: 0, duration: 0 },
      img: { count: 0, size: 0, duration: 0 },
      fetch: { count: 0, size: 0, duration: 0 },
      other: { count: 0, size: 0, duration: 0 },
    }
    for (const r of resources) {
      const t = r.type as keyof ResourceSummary
      if (summary[t]) {
        summary[t].count++
        summary[t].size += r.transferSize
        summary[t].duration += r.duration
      }
    }

    const sc = calcScore(navData, vitals)
    setResult({ nav: navData, vitals, resources, summary, score: sc, timestamp: Date.now() })
    setRunning(false)
  }, [])

  /* ── Render ── */
  return (
    <>
      <style>{`
        @keyframes bm-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bm-spin { from{stroke-dashoffset:var(--dash-start)} to{stroke-dashoffset:var(--dash-end)} }
        .bm-row { animation: bm-in .35s ease both }
        .bm-card {
          background: var(--surface-2);
          border: 1px solid rgba(78,69,56,0.12);
          border-radius: 16px;
          padding: 20px 22px;
        }
        .bm-metric {
          background: var(--surface);
          border: 1px solid rgba(78,69,56,0.1);
          border-radius: 12px;
          padding: 14px 16px;
          display: flex; flex-direction: column; gap: 6px;
        }
        .bm-res-row {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 10px; border-radius: 8px;
          transition: background 0.12s;
        }
        .bm-res-row:hover { background: rgba(182,141,64,0.05); }
        .bm-run-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 24px; border-radius: 9999px; border: none; cursor: pointer;
          background: var(--candle);
          color: #fff; font-weight: 700; font-size: 13px;
          font-family: var(--font-syne); transition: background 0.15s, transform 0.1s;
        }
        .bm-run-btn:hover { background: var(--ember); }
        .bm-run-btn:active { transform: scale(0.97); }
        .bm-run-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        @keyframes bm-spin-icon { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        .bm-spinning { animation: bm-spin-icon 0.8s linear infinite; display: inline-block; }
        @media (max-width: 767px) { .bm-content { overflow: visible !important; flex: none !important; height: auto !important; } }
        .bm-tag {
          font-size: 9px; padding: 2px 7px; border-radius: 9999px;
          font-weight: 700; font-family: var(--font-ibm); letter-spacing: 0.04em;
        }
        .bm-type-pill {
          font-size: 9px; padding: 1px 6px; border-radius: 6px;
          font-family: var(--font-ibm); font-weight: 500; flex-shrink: 0;
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        padding: '14px 24px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--carbon)',
      }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: 18, fontWeight: 700, color: 'var(--parchment)', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 3 }}>
            Page Benchmark
          </h1>
          <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-ibm)' }}>
            Core Web Vitals · Resource Audit · Performance Score
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {result && (
            <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)' }}>
              Last run {new Date(result.timestamp).toLocaleTimeString()}
            </span>
          )}
          <button className="bm-run-btn" onClick={run} disabled={running}>
            <span
              className={`material-symbols-outlined${running ? ' bm-spinning' : ''}`}
              style={{ fontSize: 15, fontVariationSettings: "'FILL' 1" }}
            >
              {running ? 'refresh' : 'speed'}
            </span>
            {running ? 'Measuring…' : result ? 'Re-run' : 'Run Benchmark'}
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="bm-content" style={{
        flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
        padding: '20px 24px 32px',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>

        {/* Empty state */}
        {!result && !running && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, opacity: 0.5, paddingTop: 80 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 52, color: 'var(--candle)', fontVariationSettings: "'FILL' 0" }}>speed</span>
            <p style={{ fontSize: 13, color: 'var(--sand)', fontFamily: 'var(--font-ibm)', textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
              Hit <strong style={{ color: 'var(--parchment)' }}>Run Benchmark</strong> to measure Core Web Vitals, resource usage, and get actionable optimization tips.
            </p>
          </div>
        )}

        {/* Running state */}
        {running && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 80 }}>
            <span className="material-symbols-outlined bm-spinning" style={{ fontSize: 40, color: 'var(--candle)', fontVariationSettings: "'FILL' 1" }}>refresh</span>
            <p style={{ fontSize: 12, color: 'var(--sand)', fontFamily: 'var(--font-ibm)' }}>Collecting metrics… (2s observation window)</p>
          </div>
        )}

        {result && !running && <Results result={result} />}
      </div>
    </>
  )
}

/* ─── Results sub-component ─────────────────────────────── */
function Results({ result }: { result: BenchmarkResult }) {
  const { nav, vitals, resources, summary, score } = result

  // Score ring
  const R = 54, CIRC = 2 * Math.PI * R
  const dashEnd = CIRC * (1 - score / 100)

  const vitalsData = [
    {
      label: 'LCP',
      desc: 'Largest Contentful Paint',
      val: vitals.lcp,
      fmt: vitals.lcp !== null ? fmt(vitals.lcp) : 'n/a',
      rating: vitals.lcp !== null ? rate(vitals.lcp, 2500, 4000) : null,
      hint: '< 2.5s good · < 4s needs work',
    },
    {
      label: 'FCP',
      desc: 'First Contentful Paint',
      val: vitals.fcp,
      fmt: vitals.fcp !== null ? fmt(vitals.fcp) : 'n/a',
      rating: vitals.fcp !== null ? rate(vitals.fcp, 1800, 3000) : null,
      hint: '< 1.8s good · < 3s needs work',
    },
    {
      label: 'CLS',
      desc: 'Cumulative Layout Shift',
      val: vitals.cls,
      fmt: vitals.cls !== null ? vitals.cls.toFixed(3) : 'n/a',
      rating: vitals.cls !== null ? rate(vitals.cls, 0.1, 0.25) : null,
      hint: '< 0.1 good · < 0.25 needs work',
    },
    {
      label: 'FID',
      desc: 'First Input Delay',
      val: vitals.fid,
      fmt: vitals.fid !== null ? fmt(vitals.fid) : 'n/a (no interaction)',
      rating: vitals.fid !== null ? rate(vitals.fid, 100, 300) : null,
      hint: '< 100ms good',
    },
    {
      label: 'TTFB',
      desc: 'Time to First Byte',
      val: nav.ttfb,
      fmt: fmt(nav.ttfb),
      rating: rate(nav.ttfb, 800, 1800) as Rating,
      hint: '< 800ms good · < 1.8s needs work',
    },
    {
      label: 'Load',
      desc: 'Full Page Load',
      val: nav.pageLoad,
      fmt: fmt(nav.pageLoad),
      rating: rate(nav.pageLoad, 2500, 6000) as Rating,
      hint: '< 2.5s good · < 6s needs work',
    },
  ]

  const resTypes: { key: keyof ResourceSummary; label: string; color: string }[] = [
    { key: 'script', label: 'JavaScript', color: '#D4A84B' },
    { key: 'css', label: 'CSS', color: '#7EC8E3' },
    { key: 'font', label: 'Fonts', color: '#B088D4' },
    { key: 'img', label: 'Images', color: '#6EBF8B' },
    { key: 'fetch', label: 'API / Fetch', color: '#E07070' },
    { key: 'other', label: 'Other', color: '#808080' },
  ]

  const totalSize = Object.values(summary).reduce((a, v) => a + v.size, 0)
  const totalRequests = Object.values(summary).reduce((a, v) => a + v.count, 0)

  // Recommendations
  const recs: { icon: string; title: string; desc: string; sev: 'high' | 'medium' | 'low' }[] = []

  if (nav.ttfb > 800)
    recs.push({ icon: 'dns', title: 'High TTFB', desc: `Server responded in ${fmt(nav.ttfb)}. Check for slow DB queries, cold Vercel function starts, or missing edge caching.`, sev: nav.ttfb > 1800 ? 'high' : 'medium' })

  if (vitals.lcp !== null && vitals.lcp > 2500)
    recs.push({ icon: 'image', title: 'Slow LCP', desc: `Largest element took ${fmt(vitals.lcp)}. Preload the hero image and ensure it has fetchpriority="high".`, sev: vitals.lcp > 4000 ? 'high' : 'medium' })

  if (vitals.cls !== null && vitals.cls > 0.1)
    recs.push({ icon: 'table_rows', title: 'Layout Shift', desc: `CLS score ${vitals.cls.toFixed(3)}. Reserve space for images (width/height attrs) and avoid inserting content above existing content.`, sev: vitals.cls > 0.25 ? 'high' : 'medium' })

  if (summary.font.size > 200 * 1024)
    recs.push({ icon: 'text_fields', title: 'Large font payload', desc: `${fmtBytes(summary.font.size)} in fonts. Use font-display:swap, subset fonts, and prefer woff2. Consider preloading critical fonts.`, sev: summary.font.size > 500 * 1024 ? 'high' : 'medium' })

  if (summary.script.size > 500 * 1024)
    recs.push({ icon: 'code', title: 'Heavy JS bundle', desc: `${fmtBytes(summary.script.size)} of JavaScript. Code-split with dynamic import(), tree-shake unused exports, and use next/dynamic.`, sev: summary.script.size > 1024 * 1024 ? 'high' : 'medium' })

  if (summary.img.size > 1024 * 1024)
    recs.push({ icon: 'photo', title: 'Unoptimised images', desc: `${fmtBytes(summary.img.size)} in images. Use next/image for automatic WebP conversion and responsive srcset.`, sev: 'medium' })

  if (totalRequests > 80)
    recs.push({ icon: 'hub', title: 'Many HTTP requests', desc: `${totalRequests} requests loaded. Merge small assets, use HTTP/2 push, and remove unused third-party scripts.`, sev: totalRequests > 120 ? 'high' : 'medium' })

  const materialSrc = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200'
  if (resources.some(r => r.name.includes('fonts.googleapis.com')))
    recs.push({ icon: 'public', title: 'External font CDN', desc: 'Google Fonts add a DNS lookup + connection. Use next/font for zero-layout-shift self-hosted fonts with better caching.', sev: 'low' })

  if (nav.dns > 100)
    recs.push({ icon: 'dns', title: 'Slow DNS', desc: `DNS lookup took ${fmt(nav.dns)}. Use dns-prefetch and preconnect hints for critical origins.`, sev: 'low' })

  if (recs.length === 0)
    recs.push({ icon: 'check_circle', title: 'Looking great!', desc: 'No major issues detected. Keep monitoring as your content and third-party scripts grow.', sev: 'low' })

  const SEV_COLOR = { high: '#E07070', medium: '#D4A84B', low: '#6EBF8B' }
  const TOP5 = resources.filter(r => r.transferSize > 0).slice(0, 8)

  return (
    <>
      {/* Row 1: Score + timing breakdown */}
      <div className="bm-row" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 14, animationDelay: '0.03s' }}>

        {/* Score ring */}
        <div className="bm-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '24px 20px' }}>
          <svg width="128" height="128" viewBox="0 0 128 128">
            {/* Track */}
            <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(78,69,56,0.2)" strokeWidth="10" />
            {/* Score arc */}
            <circle
              cx="64" cy="64" r={R} fill="none"
              stroke={scoreColor(score)}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={dashEnd}
              transform="rotate(-90 64 64)"
              style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)' }}
            />
            <text x="64" y="60" textAnchor="middle" dominantBaseline="middle"
              style={{ fontFamily: 'var(--font-syne)', fontSize: 28, fontWeight: 800, fill: scoreColor(score) }}>
              {score}
            </text>
            <text x="64" y="80" textAnchor="middle" dominantBaseline="middle"
              style={{ fontFamily: 'var(--font-ibm)', fontSize: 9, fill: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              /100
            </text>
          </svg>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-syne)', fontSize: 13, fontWeight: 700, color: scoreColor(score) }}>
              {score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : score >= 40 ? 'Needs Work' : 'Poor'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', marginTop: 2 }}>Performance Score</div>
          </div>
        </div>

        {/* Navigation timing */}
        <div className="bm-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--candle)', fontVariationSettings: "'FILL' 1" }}>timeline</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--parchment)', fontFamily: 'var(--font-syne)' }}>Navigation Timing</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { label: 'TTFB', val: nav.ttfb, good: 800, poor: 1800 },
              { label: 'DNS', val: nav.dns, good: 50, poor: 200 },
              { label: 'TCP', val: nav.tcp, good: 50, poor: 200 },
              { label: 'SSL', val: nav.ssl, good: 50, poor: 200 },
              { label: 'DOM Ready', val: nav.domReady, good: 1500, poor: 4000 },
              { label: 'Page Load', val: nav.pageLoad, good: 2500, poor: 6000 },
            ].map(m => {
              const r = rate(m.val, m.good, m.poor)
              return (
                <div key={m.label} className="bm-metric">
                  <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontWeight: 500 }}>{m.label}</div>
                  <div style={{ fontFamily: 'var(--font-syne)', fontSize: 22, fontWeight: 800, color: RATING_COLOR[r], letterSpacing: '-0.03em', lineHeight: 1 }}>{fmt(m.val)}</div>
                  <div style={{ fontSize: 9, color: RATING_COLOR[r], fontFamily: 'var(--font-ibm)', fontWeight: 600 }}>{RATING_LABEL[r]}</div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)' }}>
              Page HTML: <strong style={{ color: 'var(--sand)' }}>{fmtBytes(nav.transferSize)}</strong> transfer · <strong style={{ color: 'var(--sand)' }}>{fmtBytes(nav.decodedBodySize)}</strong> decoded
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Core Web Vitals */}
      <div className="bm-row" style={{ animationDelay: '0.08s' }}>
        <div className="bm-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--candle)', fontVariationSettings: "'FILL' 1" }}>monitor_heart</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--parchment)', fontFamily: 'var(--font-syne)' }}>Core Web Vitals</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {vitalsData.map(v => (
              <div key={v.label} className="bm-metric">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontWeight: 500 }}>{v.label}</span>
                  {v.rating && (
                    <span className="bm-tag" style={{ background: `${RATING_COLOR[v.rating]}1A`, color: RATING_COLOR[v.rating] }}>
                      {RATING_LABEL[v.rating]}
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: 'var(--font-syne)', fontSize: 20, fontWeight: 800, color: v.rating ? RATING_COLOR[v.rating] : 'var(--muted)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {v.fmt}
                </div>
                <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', lineHeight: 1.4 }}>{v.desc}</div>
                <div style={{ fontSize: 8, color: 'rgba(201,194,181,0.4)', fontFamily: 'var(--font-ibm)', marginTop: 2 }}>{v.hint}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Resource breakdown + heaviest */}
      <div className="bm-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, animationDelay: '0.13s' }}>

        {/* Resource type summary */}
        <div className="bm-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--candle)', fontVariationSettings: "'FILL' 1" }}>layers</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--parchment)', fontFamily: 'var(--font-syne)' }}>Resource Breakdown</span>
            </div>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)' }}>
              {totalRequests} requests · {fmtBytes(totalSize)}
            </span>
          </div>
          {resTypes.map(t => {
            const s = summary[t.key]
            if (s.count === 0) return null
            const pct = totalSize > 0 ? (s.size / totalSize) * 100 : 0
            return (
              <div key={t.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: t.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--sand)', fontFamily: 'var(--font-ibm)' }}>{t.label}</span>
                    <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-ibm)' }}>×{s.count}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--parchment)', fontFamily: 'var(--font-ibm)', fontWeight: 600 }}>{fmtBytes(s.size)}</span>
                </div>
                <div style={{ height: 3, background: 'rgba(78,69,56,0.2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: t.color, borderRadius: 2, transition: 'width 0.8s cubic-bezier(.4,0,.2,1)' }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Heaviest resources */}
        <div className="bm-card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--candle)', fontVariationSettings: "'FILL' 1" }}>weight</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--parchment)', fontFamily: 'var(--font-syne)' }}>Heaviest Resources</span>
          </div>
          <div style={{ overflow: 'hidden' }}>
            {TOP5.length === 0 && <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-ibm)' }}>No resource data available.</p>}
            {TOP5.map((r, i) => {
              const shortName = r.name.split('/').pop()?.split('?')[0] || r.name
              const typeColor: Record<string, string> = {
                script: '#D4A84B', css: '#7EC8E3', font: '#B088D4',
                img: '#6EBF8B', fetch: '#E07070', other: '#808080',
              }
              return (
                <div key={i} className="bm-res-row">
                  <span className="bm-type-pill" style={{ background: `${typeColor[r.type] || '#808080'}22`, color: typeColor[r.type] || '#808080' }}>
                    {r.type}
                  </span>
                  <span style={{ flex: 1, fontSize: 10, color: 'var(--sand)', fontFamily: 'var(--font-ibm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.name}>
                    {shortName}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--parchment)', fontFamily: 'var(--font-ibm)', fontWeight: 600, flexShrink: 0 }}>
                    {fmtBytes(r.transferSize)}
                  </span>
                  <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', flexShrink: 0, minWidth: 46, textAlign: 'right' }}>
                    {fmt(r.duration)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Row 4: Recommendations */}
      <div className="bm-row" style={{ animationDelay: '0.18s' }}>
        <div className="bm-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--candle)', fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--parchment)', fontFamily: 'var(--font-syne)' }}>Recommendations</span>
            <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', marginLeft: 4 }}>{recs.length} item{recs.length !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {recs.map((r, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 10,
                background: `${SEV_COLOR[r.sev]}08`,
                border: `1px solid ${SEV_COLOR[r.sev]}22`,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: SEV_COLOR[r.sev], flexShrink: 0, fontVariationSettings: "'FILL' 1", marginTop: 1 }}>{r.icon}</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--parchment)', fontFamily: 'var(--font-ibm)' }}>{r.title}</span>
                    <span className="bm-tag" style={{ background: `${SEV_COLOR[r.sev]}22`, color: SEV_COLOR[r.sev] }}>{r.sev}</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--sand)', fontFamily: 'var(--font-ibm)', lineHeight: 1.6, margin: 0 }}>{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
