import { createClient } from '@/lib/supabase/server'
import { OverviewPendingPost } from '@/components/dashboard/OverviewPendingPost'
import { OverviewGenerateButton } from '@/components/dashboard/OverviewGenerateButton'
import { OverviewSearch } from '@/components/dashboard/OverviewSearch'
import type { Post } from '@/types'
// penis

export default async function OverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  //picus

  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const dayOfWeek = now.getDay()
  const monday    = new Date(now); monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); monday.setHours(0,0,0,0)
  const sunday    = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23,59,59,999)

  const [
    { data: publishedThisMonth },
    { data: pendingPosts },
    { data: weekPosts },
    { count: pendingCount },
  ] = await Promise.all([
    supabase.from('posts').select('id,analytics').eq('user_id', user.id).eq('status', 'published').gte('published_at', monthStart),
    supabase.from('posts').select('*').eq('user_id', user.id).eq('status', 'pending_review').order('created_at', { ascending: false }),
    supabase.from('posts').select('published_at,scheduled_for').eq('user_id', user.id).gte('created_at', monday.toISOString()).lte('created_at', sunday.toISOString()),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'pending_review'),
  ])

  const postsThisMonth  = publishedThisMonth?.length ?? 0
  const totalReach      = (publishedThisMonth ?? []).reduce((s: number, p: { analytics?: unknown }) =>
    s + (((p.analytics || {}) as Record<string, number>).reach ?? 0), 0)
  const pendingPostList = pendingPosts ?? []

  const daysWithPosts = new Set<number>()
  for (const p of weekPosts ?? []) {
    const d = new Date(p.published_at || p.scheduled_for || '')
    if (!isNaN(d.getTime())) daysWithPosts.add(d.getDay())
  }

  const weekDays3 = ['Mon','Tue','Wed']

  const kpiCards = [
    {
      label: 'Posts this month',
      value: postsThisMonth.toString(),
      trend: postsThisMonth > 0 ? '+4 vs last month' : null,
      bar: Math.min((postsThisMonth / 20) * 100, 100),
    },
    {
      label: 'Avg. Engagement',
      value: '—',
      bars: true,
    },
    {
      label: 'Total Reach',
      value: totalReach > 1000 ? `${(totalReach / 1000).toFixed(1)}k` : totalReach > 0 ? totalReach.toString() : '—',
      trend: totalReach > 0 ? '+14.2% from last month' : null,
      sub: 'This month',
    },
  ]

  return (
    <>
      <style>{`
        @keyframes ov-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .ov-r1{animation:ov-in .35s ease both .03s}
        .ov-r2{animation:ov-in .35s ease both .10s}
        .ov-r3{animation:ov-in .35s ease both .17s}
        .hide-scroll::-webkit-scrollbar{display:none}
        .hide-scroll{-ms-overflow-style:none;scrollbar-width:none}
        .ov-ghost-btn{
          display:inline-flex;align-items:center;justify-content:center;gap:5px;
          padding:6px 14px;border-radius:9999px;
          border:1px solid rgba(78,69,56,0.28);
          color:var(--sand);font-size:11px;font-weight:500;
          text-decoration:none;transition:all 0.15s;
          font-family:var(--font-ibm);
        }
        .ov-ghost-btn:hover{border-color:rgba(182,141,64,0.38);color:var(--parchment)}
        .ov-cal-row:hover{background:rgba(182,141,64,0.06)!important}
        .ov-adj:hover{background:rgba(182,141,64,0.22)!important}
        .ov-callink:hover{color:var(--candle)!important}


        /* ── Responsive ── */
        @media (max-width: 1024px) {
          .ov-kpi-grid  { grid-template-columns: 1fr !important; }
          .ov-row3-grid { grid-template-columns: 1fr !important; }
          .ov-weekly    { display: none !important; }
        }
        @media (max-width: 767px) {
          .ov-main {
            overflow-y: auto !important; overflow-x: hidden !important;
            padding: 12px 12px 32px !important;
          }
          .ov-bento-rows { overflow: visible !important; height: auto !important; }
          .ov-r1.ov-row { flex: none !important; margin-bottom: 12px; }
          .ov-r2.ov-row { flex: none !important; height: 220px; margin-bottom: 12px; }
          .ov-r3.ov-row { flex: none !important; }
          .ov-topbar {
            flex-wrap: wrap !important; gap: 8px !important;
            padding: 16px 16px !important; align-items: flex-start !important;
          }
          .ov-topbar-actions {
            width: 100%; display: flex; gap: 8px; align-items: center; flex-direction: column;
          }
          .ov-search-row { width: 100%; display: flex; gap: 8px; align-items: center; }
          .ov-search-wrap { flex: 1; min-width: 0; }
          .ov-ghost-btn { width: auto; align-self: flex-start; font-size: 10px; padding: 5px 10px; }
        }
        @media (max-width: 480px) {
          .ov-main { padding: 8px 8px 24px !important; }
          .ov-r2.ov-row { height: 200px; }
        }
      `}</style>

      {/* ── Topbar ── */}
      <div className="ov-r1 ov-topbar" style={{
        padding: '24px 32px', flexShrink: 0, borderBottom: '1px solid rgba(78,69,56,0.25)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        background: 'var(--carbon)',
      }}>
        <div>
          <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--candle)', fontWeight: 600 }}>Lumen Dashboard</span>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: 32, fontWeight: 800, letterSpacing: '-.03em', color: 'var(--parchment)', lineHeight: 1.1, marginTop: 4 }}>Overview</h1>
        </div>
        <div className="ov-topbar-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="ov-search-row" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="ov-search-wrap"><OverviewSearch /></div>
            <OverviewGenerateButton />
          </div>
          <a href="/dashboard/posts" className="ov-ghost-btn">View all posts</a>
        </div>
      </div>

      {/* ── Main — proportional rows, always fits viewport with no scroll ── */}
      <div className="ov-main" style={{
        flex: 1, minHeight: 0, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        padding: '14px 24px 14px', gap: 0,
      }}>

        {/* ── Row 1: Hero Bento — 25 parts ── */}
        <div className="ov-r1 ov-row ov-kpi-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 252px', gap: 10, flex: 25, minHeight: 0, marginBottom: 20 }}>

          {/* Large reach card */}
          <div style={{
            background: 'var(--surface-2)', borderRadius: 18, padding: '28px 32px',
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 12px 28px rgba(78,69,56,0.06)',
            minHeight: 0,
          }}>
            <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontWeight: 500, marginBottom: 6 }}>
              {kpiCards[2].label}
            </p>
            <div style={{ fontFamily: 'var(--font-syne)', fontSize: 56, fontWeight: 800, color: 'var(--parchment)', letterSpacing: '-0.05em', lineHeight: 1, marginBottom: 12 }}>
              {kpiCards[2].value}
            </div>
            {kpiCards[2].trend ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--candle)', fontWeight: 600, fontFamily: 'var(--font-ibm)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>trending_up</span>
                {kpiCards[2].trend}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-ibm)' }}>{kpiCards[2].sub}</div>
            )}
            {/* Decorative wave */}
            <div style={{ position: 'absolute', right: 0, top: 0, width: '55%', height: '100%', pointerEvents: 'none', opacity: 0.08 }}>
              <svg width="100%" height="100%" viewBox="0 0 200 80" preserveAspectRatio="none">
                <path d="M0,60 Q50,10 100,40 T200,20" fill="none" stroke="var(--candle)" strokeWidth="3" strokeLinecap="round"/>
                <path d="M0,70 Q50,30 100,55 T200,38" fill="none" stroke="var(--candle)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
              </svg>
            </div>
          </div>

          {/* Stacked KPI cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
            {/* Posts */}
            <div style={{
              background: 'var(--surface)', borderRadius: 14, padding: '16px 18px',
              boxShadow: '0 8px 20px rgba(78,69,56,0.04)', border: '1px solid rgba(78,69,56,0.07)',
              flex: 1, minHeight: 0, overflow: 'hidden',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontWeight: 500 }}>{kpiCards[0].label}</p>
                {kpiCards[0].trend && <span style={{ fontSize: 9, color: 'var(--candle)', fontWeight: 600, fontFamily: 'var(--font-ibm)' }}>{kpiCards[0].trend}</span>}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-syne)', fontSize: 32, fontWeight: 800, color: 'var(--parchment)', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 8 }}>{kpiCards[0].value}</div>
                <div style={{ width: '100%', height: 2, background: 'rgba(78,69,56,0.2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${kpiCards[0].bar}%`, background: 'var(--candle)', borderRadius: 2 }} />
                </div>
              </div>
            </div>
            {/* Engagement */}
            <div style={{
              background: 'var(--surface)', borderRadius: 14, padding: '16px 18px',
              boxShadow: '0 8px 20px rgba(78,69,56,0.04)', border: '1px solid rgba(78,69,56,0.07)',
              flex: 1, minHeight: 0, overflow: 'hidden',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontWeight: 500 }}>{kpiCards[1].label}</p>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--candle)', background: 'rgba(182,141,64,0.12)', borderRadius: '50%', padding: 3, fontVariationSettings: "'FILL' 1" }}>favorite</span>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-syne)', fontSize: 32, fontWeight: 800, color: 'var(--parchment)', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 8 }}>{kpiCards[1].value}</div>
                <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 14 }}>
                  {[40,62,35,80,55].map((h, bi) => (
                    <div key={bi} style={{ flex: 1, height: `${h}%`, background: bi === 3 ? 'var(--candle)' : `rgba(182,141,64,${0.15 + bi * 0.1})`, borderRadius: 2 }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 2: Pending Review — 35 parts ── */}
        <div className="ov-r2 ov-row" style={{ flex: 35, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: 17, fontWeight: 700, color: 'var(--parchment)', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 2 }}>
                Pending Review
              </h2>
              <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-ibm)' }}>
                {pendingCount !== null && pendingCount > 0
                  ? `${pendingCount} item${pendingCount > 1 ? 's' : ''} require your attention today`
                  : 'All clear — no posts waiting'}
              </p>
            </div>
            <a href="/dashboard/posts" style={{ fontSize: 11, color: 'var(--candle)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700, fontFamily: 'var(--font-ibm)' }}>
              View all queue <span className="material-symbols-outlined" style={{ fontSize: 12 }}>arrow_forward</span>
            </a>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <OverviewPendingPost posts={pendingPostList as Post[]} />
          </div>
        </div>

        {/* ── Row 3: AI Insights + Weekly Flow — 25 parts ── */}
        <div className="ov-r3 ov-row ov-row3-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 252px', gap: 10, flex: 25, minHeight: 0 }}>

          {/* AI Insights */}
          <div style={{
            background: 'rgba(182,141,64,0.06)', borderRadius: 18, padding: '20px 28px',
            border: '1px solid rgba(182,141,64,0.12)', position: 'relative', overflow: 'hidden',
          }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', right: 20, top: 14, fontSize: 64, color: 'var(--candle)', opacity: 0.055, pointerEvents: 'none', fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--candle)', fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
              <span style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--candle)', fontWeight: 700, fontFamily: 'var(--font-ibm)' }}>Strategic Recommendation</span>
            </div>
            <h3 style={{ fontFamily: 'var(--font-syne)', fontSize: 15, fontWeight: 700, color: 'var(--parchment)', letterSpacing: '-0.02em', marginBottom: 8 }}>
              Prime Posting Opportunity
            </h3>
            <p style={{ fontSize: 12, color: 'var(--sand)', lineHeight: 1.7, fontFamily: 'var(--font-ibm)', marginBottom: 14 }}>
              Your audience engagement peaks between <strong style={{ color: 'var(--parchment)', fontWeight: 600 }}>18:00 and 20:00</strong> on Tuesdays. We suggest shifting your content to this window to maximize organic reach.
            </p>
            <button className="ov-adj" style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 16px', borderRadius: 9999,
              background: 'rgba(182,141,64,0.12)', border: '1px solid rgba(182,141,64,0.25)',
              color: 'var(--candle)', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--font-ibm)', transition: 'background 0.15s',
            }}>
              Adjust Schedule
            </button>
          </div>

          {/* Weekly Flow — 3 days */}
          <div className="ov-weekly" style={{
            background: 'var(--surface-2)', borderRadius: 18, padding: '18px 18px 12px',
            boxShadow: '0 12px 28px rgba(78,69,56,0.04)', border: '1px solid rgba(78,69,56,0.07)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
              <h3 style={{ fontFamily: 'var(--font-syne)', fontSize: 13, fontWeight: 700, color: 'var(--parchment)', letterSpacing: '-0.01em' }}>Weekly Flow</h3>
              <div style={{ display: 'flex', gap: 3 }}>
                {(['arrow_back_ios','arrow_forward_ios'] as const).map(icon => (
                  <button key={icon} style={{ padding: '3px', background: 'none', border: '1px solid rgba(78,69,56,0.2)', borderRadius: 9999, cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{icon}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {weekDays3.map((day, i) => {
                const d = new Date(monday); d.setDate(monday.getDate() + i)
                const isToday = d.toDateString() === now.toDateString()
                const jsDay = i === 6 ? 0 : i + 1
                const hasPost = daysWithPosts.has(jsDay)
                return (
                  <div key={day} className="ov-cal-row" style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px', borderRadius: 10,
                    background: isToday ? 'rgba(182,141,64,0.08)' : 'transparent', transition: 'background 0.15s',
                  }}>
                    <div style={{ width: 30, textAlign: 'center', flexShrink: 0 }}>
                      <p style={{ fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: isToday ? 'var(--candle)' : 'var(--muted)', fontFamily: 'var(--font-ibm)', fontWeight: 500, marginBottom: 1 }}>{day}</p>
                      <p style={{ fontFamily: 'var(--font-syne)', fontSize: 14, fontWeight: 700, color: isToday ? 'var(--candle)' : 'var(--sand)', lineHeight: 1 }}>{d.getDate()}</p>
                    </div>
                    {hasPost ? (
                      <div style={{ flex: 1, background: isToday ? 'rgba(182,141,64,0.1)' : 'var(--surface)', padding: '5px 10px', borderRadius: 8, borderLeft: `3px solid ${isToday ? 'var(--candle)' : 'rgba(78,69,56,0.3)'}` }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--parchment)', fontFamily: 'var(--font-ibm)', lineHeight: 1.3 }}>Campaign Launch</p>
                        <p style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', marginTop: 1 }}>3 posts scheduled</p>
                      </div>
                    ) : (
                      <div style={{ flex: 1, border: '1.5px dashed rgba(78,69,56,0.16)', borderRadius: 8, padding: '5px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 12, color: 'var(--muted)', opacity: 0.4 }}>add</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <a href="/dashboard/statistics" className="ov-callink" style={{
              display: 'block', textAlign: 'center', marginTop: 10,
              paddingTop: 10, borderTop: '1px solid rgba(78,69,56,0.1)',
              fontSize: 10, fontWeight: 600, color: 'var(--muted)',
              fontFamily: 'var(--font-ibm)', letterSpacing: '0.06em',
              textDecoration: 'none', transition: 'color 0.15s', flexShrink: 0,
            }}>
              Full Calendar View
            </a>
          </div>
        </div>

      </div>
    </>
  )
}
