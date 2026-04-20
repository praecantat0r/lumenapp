'use client'
import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts'

type Period = 7 | 30 | 90

interface StatsData {
  insights?: Array<{ name: string; values?: Array<{ value: number; end_time: string }> }>
  media?:    Array<{ id: string; caption?: string; timestamp: string; like_count?: number; comments_count?: number }>
}

const CANDLE = '#D4A84B'; const MUTED = 'rgba(246,242,234,0.28)'
const BLUE   = '#7AABFF'; const GREEN = '#6EBF8B'; const RED = '#E07070'; const EMBER = '#B5852A'

function fmt(n: number) { return n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n) }

const tooltipStyle = { background:'#1c1c19', border:'1px solid rgba(78,69,56,0.4)', borderRadius:12, fontFamily:"'Inter',sans-serif", color:'#fcf9f4', fontSize:12 }
const axisStyle    = { fill: 'rgba(201,194,181,0.5)', fontSize: 9, fontFamily:"'Inter',sans-serif" }

const MOCK: Record<Period, {
  kpi: { followers: string; reach: string; impressions: string; eng: string }
  reachData:    Array<{ date: string; reach: number; prev: number }>
  followData:   Array<{ week: string; new: number; lost: number }>
  engData:      Array<{ post: string; rate: number }>
  sources:      Array<{ name: string; value: number; color: string }>
  topPosts:     Array<{ rank: number; title: string; date: string; reach: number; imp: number; likes: number; comments: number; saves: number; eng: number }>
}> = {
  7: {
    kpi: { followers:'2,841', reach:'18.4k', impressions:'31k', eng:'5.1%' },
    reachData: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i) => ({ date:d, reach:[2100,3400,2800,4200,3600,5812,4900][i], prev:[1800,2900,2200,3100,2900,4200,3800][i] })),
    followData: ['W–4','W–3','W–2','W–1','This'].map((w,i) => ({ week:w, new:[18,24,21,28,31][i], lost:[-4,-6,-3,-8,-5][i] })),
    engData: Array.from({length:10},(_,i)=>({ post:`P${i+1}`, rate:[3.8,5.1,6.4,4.2,4.9,3.2,5.8,4.1,6.1,3.6][i] })),
    sources: [{name:'Hashtags',value:38,color:CANDLE},{name:'Home feed',value:31,color:BLUE},{name:'Explore',value:19,color:GREEN},{name:'Profile',value:12,color:EMBER}],
    topPosts: [
      {rank:1,title:'Spring collection',date:'23 Mar',reach:5812,imp:9240,likes:441,comments:38,saves:87,eng:6.4},
      {rank:2,title:'Quality over noise',date:'26 Mar',reach:3240,imp:5180,likes:312,comments:24,saves:54,eng:5.1},
      {rank:3,title:'Made with intention',date:'18 Mar',reach:3100,imp:4960,likes:289,comments:22,saves:61,eng:4.9},
      {rank:4,title:'Show up every day',date:'20 Mar',reach:2760,imp:4410,likes:224,comments:17,saves:41,eng:4.2},
      {rank:5,title:'Behind the brand',date:'24 Mar',reach:2100,imp:3360,likes:198,comments:11,saves:32,eng:3.8},
    ],
  },
  30: {
    kpi: { followers:'2,841', reach:'84.2k', impressions:'142k', eng:'4.8%' },
    reachData: Array.from({length:30},(_,i)=>{ const d=new Date(2026,2,28); d.setDate(d.getDate()-29+i); return { date:`${d.getDate()}/${d.getMonth()+1}`, reach:[1800,2100,1600,2400,2900,2200,3100,2600,3400,2800,3200,2400,3800,3100,2700,4200,3600,3900,3200,4500,3800,4100,3500,5200,4600,4900,5812,5100,4700,5400][i], prev:[1400,1700,1300,1900,2300,1800,2500,2100,2700,2200,2600,1900,3100,2500,2200,3400,2900,3100,2600,3700,3100,3300,2800,4200,3700,3900,4600,4100,3800,4300][i] } }),
    followData: ['W1','W2','W3','W4'].map((w,i)=>({ week:w, new:[22,31,28,37][i], lost:[-5,-8,-6,-9][i] })),
    engData: Array.from({length:10},(_,i)=>({ post:`P${i+1}`, rate:[3.8,5.1,6.4,4.2,4.9,3.2,5.8,4.1,6.1,3.6][i] })),
    sources: [{name:'Hashtags',value:38,color:CANDLE},{name:'Home feed',value:31,color:BLUE},{name:'Explore',value:19,color:GREEN},{name:'Profile',value:12,color:EMBER}],
    topPosts: [
      {rank:1,title:'Spring collection',date:'23 Mar',reach:5812,imp:9240,likes:441,comments:38,saves:87,eng:6.4},
      {rank:2,title:'Quality over noise',date:'26 Mar',reach:3240,imp:5180,likes:312,comments:24,saves:54,eng:5.1},
      {rank:3,title:'Made with intention',date:'18 Mar',reach:3100,imp:4960,likes:289,comments:22,saves:61,eng:4.9},
      {rank:4,title:'Show up every day',date:'20 Mar',reach:2760,imp:4410,likes:224,comments:17,saves:41,eng:4.2},
      {rank:5,title:'Behind the brand',date:'24 Mar',reach:2100,imp:3360,likes:198,comments:11,saves:32,eng:3.8},
    ],
  },
  90: {
    kpi: { followers:'2,841', reach:'248k', impressions:'412k', eng:'4.4%' },
    reachData: Array.from({length:12},(_,i)=>({ date:`W${i+1}`, reach:[12000,14500,11800,16200,15400,18900,17200,20100,19400,22600,24100,26800][i], prev:[9800,11200,9400,13100,12400,15200,13900,16400,15800,18200,19500,21600][i] })),
    followData: ['Jan','Feb','Mar'].map((w,i)=>({ week:w, new:[68,84,118][i], lost:[-18,-22,-28][i] })),
    engData: Array.from({length:10},(_,i)=>({ post:`P${i+1}`, rate:[3.4,4.8,5.9,3.8,4.5,2.9,5.2,3.7,5.6,3.3][i] })),
    sources: [{name:'Hashtags',value:38,color:CANDLE},{name:'Home feed',value:31,color:BLUE},{name:'Explore',value:19,color:GREEN},{name:'Profile',value:12,color:EMBER}],
    topPosts: [
      {rank:1,title:'Spring collection',date:'23 Mar',reach:5812,imp:9240,likes:441,comments:38,saves:87,eng:6.4},
      {rank:2,title:'Quality over noise',date:'26 Mar',reach:3240,imp:5180,likes:312,comments:24,saves:54,eng:5.1},
      {rank:3,title:'Made with intention',date:'18 Mar',reach:3100,imp:4960,likes:289,comments:22,saves:61,eng:4.9},
    ],
  },
}

const HEATMAP_DATA = [
  [1,2,2,3,1,4,5,3,2,6,4,3],
  [2,3,3,5,3,6,8,5,3,9,7,5],
  [1,2,2,4,2,5,6,4,2,7,5,4],
  [2,3,4,5,3,7,9,6,3,8,6,5],
  [1,2,3,4,2,5,6,4,2,6,4,3],
  [2,3,4,5,4,5,4,6,5,4,3,2],
  [1,2,3,3,4,5,4,5,4,3,2,1],
]
const HEATMAP_DAYS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const HEATMAP_HOURS = ['6am','9am','12pm','3pm','6pm','9pm']
const HEATMAP_IDXS  = [0,1,3,5,7,9,11]

export default function StatisticsPage() {
  const [period, setPeriod] = useState<Period>(30)
  const [apiData, setApiData] = useState<StatsData | null>(null)

  useEffect(() => {
    fetch('/api/instagram/stats').then(r => r.json()).then(setApiData).catch(() => {})
  }, [])

  const d   = MOCK[period]
  const kpi = d.kpi
  const engColors = d.engData.map(v => v.rate >= 5 ? CANDLE : v.rate >= 4 ? 'rgba(212,168,75,.65)' : 'rgba(212,168,75,.38)')

  const kpiItems = [
    { label:'Total followers',   val:kpi.followers,   trend:'+118 this period', spark:'M0,28 L13,22 L26,24 L40,14 L53,17 L66,8 L80,5' },
    { label:'Total reach',       val:kpi.reach,       trend:'+22% vs prev.',   spark:'M0,26 L13,20 L26,22 L40,12 L53,15 L66,6 L80,3' },
    { label:'Impressions',       val:kpi.impressions, trend:'+18% vs prev.',   spark:'M0,24 L13,18 L26,20 L40,10 L53,13 L66,5 L80,2' },
    { label:'Avg. engagement',   val:kpi.eng,         trend:'+0.6pp',          spark:'M0,22 L13,19 L26,21 L40,14 L53,16 L66,10 L80,7' },
  ]

  const insights = [
    {
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke={CANDLE} strokeWidth="1.4"/>
          <path d="M12 7v5l3 2" stroke={CANDLE} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      label: 'Best posting time',
      text: <span>Posts published <strong style={{color:'#F6F2EA',fontStyle:'normal',fontWeight:400}}>Tue &amp; Thu 18:00–20:00</strong> generate 2.3× more engagement than your average.</span>,
    },
    {
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <polyline points="3,17 8,9 13,13 17,6 21,10" stroke={CANDLE} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      label: 'Top content type',
      text: <span><strong style={{color:'#F6F2EA',fontStyle:'normal',fontWeight:400}}>Brand story posts</strong> outperform product posts by 41% on reach. Lumen has weighted this month&apos;s schedule accordingly.</span>,
    },
    {
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke={CANDLE} strokeWidth="1.4"/>
          <circle cx="12" cy="12" r="3.5" stroke={CANDLE} strokeWidth="1.4"/>
          <path d="M12 3v2M12 19v2M21 12h-2M5 12H3" stroke={CANDLE} strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      ),
      label: 'Growth forecast',
      text: <span>At current trajectory, you&apos;ll reach <strong style={{color:'#F6F2EA',fontStyle:'normal',fontWeight:400}}>3,200 followers</strong> by end of April — 12 days ahead of last month&apos;s forecast.</span>,
    },
  ]

  return (
    <>
      <style>{`
        @keyframes st-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .st-r1{animation:st-in .45s ease both .04s}
        .st-r2{animation:st-in .45s ease both .11s}
        .st-r3{animation:st-in .45s ease both .18s}
        .st-r4{animation:st-in .45s ease both .25s}
        .st-r5{animation:st-in .45s ease both .32s}
        .st-pb{padding:7px 16px;border-radius:9999px;font-size:12px;font-weight:500;color:var(--muted);cursor:pointer;border:none;background:none;font-family:var(--font-ibm);transition:all .15s}
        .st-pb:hover{color:var(--parchment)}
        .st-pb.on{background:var(--surface-3);color:var(--parchment)}
        .st-tr{transition:background .12s;cursor:pointer}
        .st-tr:hover{background:rgba(182,141,64,.04)}
        thead th{padding:10px 18px;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);font-weight:500;text-align:left;border-bottom:1px solid rgba(78,69,56,0.3);white-space:nowrap;font-family:var(--font-ibm)}
        thead th.num{text-align:right}
        tbody td{padding:11px 18px;font-size:12px;color:var(--sand);font-weight:400;vertical-align:middle;font-family:var(--font-ibm)}
        tbody td.num{text-align:right;font-variant-numeric:tabular-nums}
        tbody td.hl{color:var(--parchment);font-weight:500}
        .st-kpi:hover{border-color:rgba(182,141,64,0.25)!important;}

        /* ── Responsive ── */
        @media (max-width: 1024px) {
          .st-kpi-grid        { grid-template-columns: repeat(2,1fr) !important; }
          .st-insights-grid   { grid-template-columns: repeat(2,1fr) !important; }
          .st-main-charts     { grid-template-columns: 1fr !important; }
          .st-secondary-charts{ grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 767px) {
          .st-topbar { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; padding: 16px 20px !important; }
          .st-topbar-right { width: 100%; display: flex; gap: 8px; align-items: center; }
          .st-period-btns { flex: 1; }
          .st-export-btn { flex-shrink: 0; }
          .st-content { padding: 16px 16px 40px !important; }
          .st-kpi-grid        { grid-template-columns: 1fr 1fr !important; gap: 10px !important; margin-bottom: 16px !important; }
          .st-insights-grid   { grid-template-columns: 1fr !important; gap: 10px !important; margin-bottom: 16px !important; }
          .st-secondary-charts{ grid-template-columns: 1fr !important; }
          .st-table-wrap      { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .st-table-wrap table { min-width: 640px; }
        }
        @media (max-width: 480px) {
          .st-kpi-grid { grid-template-columns: 1fr !important; }
          .st-main-charts { gap: 10px !important; }
        }
      `}</style>

      {/* ── Topbar ── */}
      <div className="st-topbar" style={{ borderBottom:'1px solid rgba(78,69,56,0.25)', padding:'24px 32px', display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexShrink:0, background:'var(--carbon)' }}>
        <div>
          <span style={{ fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--candle)', fontWeight:600 }}>Performance Portfolio</span>
          <h1 style={{ fontFamily:'var(--font-syne)', fontSize:32, fontWeight:800, letterSpacing:'-.03em', color:'var(--parchment)', lineHeight:1.1, marginTop:4 }}>Statistics</h1>
        </div>
        <div className="st-topbar-right" style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div className="st-period-btns" style={{ display:'flex', background:'var(--surface-2)', border:'1px solid rgba(78,69,56,0.25)', borderRadius:9999, padding:'4px', gap:2 }}>
            {([7,30,90] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`st-pb${period===p?' on':''}`}>{p}d</button>
            ))}
          </div>
          <button
            className="st-export-btn"
            style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'9px 20px', background:'var(--candle)', color:'#ffffff', border:'none', borderRadius:9999, fontFamily:'var(--font-syne)', fontSize:13, fontWeight:700, cursor:'pointer', transition:'background 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--ember)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--candle)'}}>
            <span className="material-symbols-outlined" style={{fontSize:16}}>file_download</span>
            Export Data
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="st-content" style={{ flex:1, overflowY:'auto', padding:'28px 32px 52px' }}>

        {/* KPI bento grid */}
        <div className="st-r1 st-kpi-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
          {kpiItems.map((k) => (
            <div key={k.label} className="st-kpi" style={{
              background:'var(--surface-2)', padding:'22px 22px 20px',
              borderRadius:20, position:'relative', overflow:'hidden',
              border:'1px solid rgba(78,69,56,0.2)', transition:'border-color 0.2s',
            }}>
              <div style={{ position:'absolute', top:-10, right:-10, width:60, height:60, background:'rgba(182,141,64,0.04)', borderRadius:'50%' }} />
              <div style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--muted)', fontWeight:500, marginBottom:14 }}>{k.label}</div>
              <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
                <div style={{ fontFamily:'var(--font-syne)', fontSize:32, fontWeight:800, color:'var(--parchment)', letterSpacing:'-.04em', lineHeight:1 }}>{k.val}</div>
                <div style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:12, color:'var(--candle)', fontWeight:600, marginBottom:2 }}>
                  <span className="material-symbols-outlined" style={{fontSize:14}}>arrow_upward</span>
                  {k.trend.replace('+','').replace(' vs prev.','')}
                </div>
              </div>
              <svg style={{ position:'absolute', bottom:8, right:8, opacity:.15 }} width="80" height="28" viewBox="0 0 80 32">
                <polyline points={k.spark} fill="none" stroke={CANDLE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          ))}
        </div>

        {/* AI Insights strip */}
        <div className="st-r2 st-insights-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
          {insights.map((ins) => (
            <div key={ins.label} style={{ background:'var(--surface-2)', borderRadius:20, padding:'22px', border:'1px solid rgba(78,69,56,0.2)', position:'relative', overflow:'hidden' }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(182,141,64,0.1)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14, border:'1px solid rgba(182,141,64,0.2)' }}>
                {ins.icon}
              </div>
              <div style={{ fontSize:10, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--muted)', fontWeight:600, marginBottom:8 }}>{ins.label}</div>
              <div style={{ fontSize:12, lineHeight:1.7, color:'var(--sand)' }}>{ins.text}</div>
            </div>
          ))}
        </div>

        {/* Main charts row */}
        <div className="st-r3 st-main-charts" style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:16, marginBottom:20 }}>

          {/* Reach over time */}
          <div style={{ background:'var(--surface-2)', border:'1px solid rgba(78,69,56,0.2)', borderRadius:20, padding:'24px 24px 16px' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
              <div>
                <div style={{ fontFamily:'var(--font-syne)', fontSize:16, fontWeight:700, color:'var(--parchment)', letterSpacing:'-.02em' }}>Reach over time</div>
                <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>Daily unique content impressions across all platforms.</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:'var(--font-syne)', fontSize:26, fontWeight:800, color:'var(--candle)', letterSpacing:'-.03em' }}>{kpi.reach}</div>
                <div style={{ fontSize:11, color:'#6EBF8B', marginTop:2 }}>↑ 22% vs prev.</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={d.reachData} margin={{ top:5, right:5, bottom:0, left:0 }}>
                <defs>
                  <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={CANDLE} stopOpacity={0.22}/>
                    <stop offset="95%" stopColor={CANDLE} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} interval={period===30?4:period===90?2:0}/>
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={fmt} width={36}/>
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color:'#F6F2EA' }} labelStyle={{ color:'rgba(246,242,234,.6)', fontSize:10 }}/>
                <Area type="monotone" dataKey="prev"  stroke="rgba(212,168,75,.28)" strokeWidth={1.5} strokeDasharray="4 4" fill="none" dot={false} name="Prev. period"/>
                <Area type="monotone" dataKey="reach" stroke={CANDLE} strokeWidth={2} fill="url(#reachGrad)" dot={false} activeDot={{ r:5, fill:CANDLE, stroke:'#111009', strokeWidth:2 }} name="Reach"/>
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display:'flex', gap:18, marginTop:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, color:'rgba(246,242,234,.32)', fontFamily:'var(--font-ibm)' }}>
                <div style={{ width:16, height:2, borderRadius:1, background:CANDLE }}/> Reach
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, color:'rgba(246,242,234,.32)', fontFamily:'var(--font-ibm)' }}>
                <div style={{ width:16, height:1, borderTop:'1px dashed rgba(212,168,75,.4)' }}/> Prev. period
              </div>
            </div>
          </div>

          {/* Follower growth */}
          <div style={{ background:'var(--surface-2)', border:'1px solid rgba(78,69,56,0.2)', borderRadius:20, padding:'22px 22px 16px' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
              <div>
                <div style={{ fontFamily:'var(--font-syne)', fontSize:13, fontWeight:600, color:'var(--parchment)', letterSpacing:'-.02em' }}>Follower growth</div>
                <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>Net new followers per week</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:'var(--font-syne)', fontSize:24, fontWeight:700, color:CANDLE, letterSpacing:'-.03em' }}>+118</div>
                <div style={{ fontSize:10, color:'rgba(110,191,139,.8)', marginTop:2, fontFamily:'var(--font-ibm)' }}>↑ this period</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={d.followData} margin={{ top:5, right:5, bottom:0, left:0 }}>
                <XAxis dataKey="week" tick={axisStyle} axisLine={false} tickLine={false}/>
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={32}/>
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color:'#F6F2EA' }} labelStyle={{ color:'rgba(246,242,234,.6)', fontSize:10 }}/>
                <Bar dataKey="new"  fill="rgba(212,168,75,.75)" radius={[5,5,0,0]} name="New followers" barSize={18}/>
                <Bar dataKey="lost" fill="rgba(224,112,112,.55)" radius={[5,5,0,0]} name="Unfollows" barSize={18}/>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display:'flex', gap:18, marginTop:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, color:'rgba(246,242,234,.32)', fontFamily:'var(--font-ibm)' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:CANDLE }}/> New followers
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, color:'rgba(246,242,234,.32)', fontFamily:'var(--font-ibm)' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:RED }}/> Unfollows
              </div>
            </div>
          </div>
        </div>

        {/* Secondary charts row */}
        <div className="st-r4 st-secondary-charts" style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:20 }}>

          {/* Engagement by post */}
          <div style={{ background:'var(--surface-2)', border:'1px solid rgba(78,69,56,0.2)', borderRadius:20, padding:'22px 22px 16px' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
              <div>
                <div style={{ fontFamily:'var(--font-syne)', fontSize:13, fontWeight:600, color:'var(--parchment)', letterSpacing:'-.02em' }}>Engagement by post</div>
                <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>Last 10 published posts</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:'var(--font-syne)', fontSize:24, fontWeight:700, color:CANDLE }}>{kpi.eng}</div>
                <div style={{ fontSize:10, color:'rgba(246,242,234,.32)', fontFamily:'var(--font-ibm)' }}>avg. rate</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={d.engData} margin={{ top:5, right:5, bottom:0, left:0 }}>
                <XAxis dataKey="post" tick={axisStyle} axisLine={false} tickLine={false}/>
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={28} tickFormatter={v=>`${v}%`} domain={[0,8]}/>
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color:'#F6F2EA' }} labelStyle={{ color:'rgba(246,242,234,.6)', fontSize:10 }}/>
                <Bar dataKey="rate" radius={[4,4,0,0]} barSize={16} name="Eng. rate">
                  {d.engData.map((_entry, i) => <Cell key={i} fill={engColors[i]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Impression sources */}
          <div style={{ background:'var(--surface-2)', border:'1px solid rgba(78,69,56,0.2)', borderRadius:20, padding:'22px 22px 16px' }}>
            <div style={{ marginBottom:8 }}>
              <div style={{ fontFamily:'var(--font-syne)', fontSize:13, fontWeight:600, color:'var(--parchment)', letterSpacing:'-.02em' }}>Impression sources</div>
              <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>Where your reach comes from</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:20, marginTop:8 }}>
              <div style={{ width:160, height:160, flexShrink:0 }}>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={d.sources} cx="50%" cy="50%" innerRadius={52} outerRadius={72} dataKey="value" paddingAngle={3} strokeWidth={3} stroke="#1A1810">
                      {d.sources.map((s, i) => <Cell key={i} fill={s.color} style={{outline:'none'}}/>)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10 }}>
                {d.sources.map(s => (
                  <div key={s.name} style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:'rgba(246,242,234,.65)', fontFamily:'var(--font-ibm)' }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:s.color, flexShrink:0 }}/>
                    <span style={{ flex:1 }}>{s.name}</span>
                    <span style={{ color:'#F6F2EA', fontWeight:400 }}>{s.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Heatmap */}
          <div style={{ background:'var(--surface-2)', border:'1px solid rgba(78,69,56,0.2)', borderRadius:20, padding:'22px 22px 16px' }}>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontFamily:'var(--font-syne)', fontSize:13, fontWeight:600, color:'var(--parchment)', letterSpacing:'-.02em' }}>Engagement heatmap</div>
              <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>By day · best performing hours</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'28px repeat(6,1fr)', gap:3, marginBottom:3 }}>
              <div/>
              {HEATMAP_HOURS.map(h => <div key={h} style={{ fontSize:9, color:'rgba(246,242,234,.28)', textAlign:'center', fontFamily:'var(--font-ibm)' }}>{h}</div>)}
            </div>
            {HEATMAP_DAYS.map((day, di) => (
              <div key={day} style={{ display:'grid', gridTemplateColumns:'28px repeat(6,1fr)', gap:3, marginBottom:3 }}>
                <div style={{ fontSize:9, color:'rgba(246,242,234,.28)', display:'flex', alignItems:'center', fontFamily:'var(--font-ibm)' }}>{day}</div>
                {HEATMAP_IDXS.map((bi, ci) => {
                  const v = HEATMAP_DATA[di][bi]
                  const alpha = 0.1 + (v/10)*0.85
                  const bg = v>=7 ? `rgba(212,168,75,${alpha})` : v>=4 ? `rgba(212,168,75,${alpha*0.7})` : `rgba(45,42,31,${0.3+alpha*0.5})`
                  return <div key={ci} title={`${day} ${HEATMAP_HOURS[ci]}: ${v}/10`} style={{ aspectRatio:1, borderRadius:3, background:bg }}/>
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Top posts table */}
        <div className="st-r5" style={{ background:'var(--surface-2)', border:'1px solid rgba(78,69,56,0.2)', borderRadius:20, overflow:'hidden' }}>
          <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid rgba(78,69,56,0.2)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontFamily:'var(--font-syne)', fontSize:16, fontWeight:700, color:'var(--parchment)' }}>Top performing posts</div>
            <a href="/dashboard/posts"
              style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', background:'rgba(78,69,56,0.25)', color:'var(--sand)', border:'1px solid rgba(78,69,56,0.35)', borderRadius:9999, fontSize:12, textDecoration:'none', transition:'all .15s', fontWeight:500 }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(182,141,64,0.3)';e.currentTarget.style.color='var(--parchment)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(78,69,56,0.35)';e.currentTarget.style.color='var(--sand)'}}>
              View all →
            </a>
          </div>
          <div className="st-table-wrap">
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <th style={{ width:36, paddingLeft:20 }}>#</th>
                <th>Post</th>
                <th className="num">Reach</th>
                <th className="num">Impr.</th>
                <th className="num">Likes</th>
                <th className="num">Comments</th>
                <th className="num">Saves</th>
                <th className="num">Eng.</th>
                <th>Published</th>
              </tr>
            </thead>
            <tbody>
              {d.topPosts.map(p => {
                const rankColor = p.rank===1 ? 'var(--candle)' : p.rank===2 ? 'var(--sand)' : p.rank===3 ? 'var(--muted)' : 'var(--muted)'
                const barW = (p.eng / 6.4 * 100).toFixed(0)
                return (
                  <tr key={p.rank} className="st-tr" style={{ borderBottom:'1px solid rgba(78,69,56,0.15)' }}>
                    <td style={{ paddingLeft:20 }}>
                      <span style={{ fontFamily:'var(--font-syne)', fontSize:13, fontWeight:700, color:rankColor }}>{p.rank}</span>
                    </td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ width:36, height:36, borderRadius:8, background:'var(--surface-3)', flexShrink:0, border:'1px solid rgba(78,69,56,0.2)' }}/>
                        <div>
                          <div style={{ fontSize:12, color:'var(--parchment)', fontWeight:500, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.title}</div>
                          <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>{p.date}</div>
                        </div>
                      </div>
                    </td>
                    <td className="num hl">{fmt(p.reach)}</td>
                    <td className="num">{fmt(p.imp)}</td>
                    <td className="num">{p.likes}</td>
                    <td className="num">{p.comments}</td>
                    <td className="num">{p.saves}</td>
                    <td className="num">
                      <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'flex-end' }}>
                        <div style={{ width:52, height:3, background:'rgba(78,69,56,0.35)', borderRadius:2, overflow:'hidden', flexShrink:0 }}>
                          <div style={{ height:'100%', borderRadius:2, background:'var(--candle)', width:`${barW}%` }}/>
                        </div>
                        <span style={{ color:'var(--candle)', fontWeight:600 }}>{p.eng}%</span>
                      </div>
                    </td>
                    <td style={{ fontSize:11, color:'var(--muted)' }}>{p.date}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>

      </div>
    </>
  )
}
