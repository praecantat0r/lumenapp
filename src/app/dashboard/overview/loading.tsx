export default function OverviewLoading() {
  return (
    <>
      <style>{`
        @keyframes sk-shimmer { from { background-position: -400px 0 } to { background-position: 400px 0 } }
        .sk { background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%); background-size: 800px 100%; animation: sk-shimmer 1.4s infinite; border-radius: 10px; }
      `}</style>
      <div style={{ padding: '28px 32px', background: 'var(--carbon)', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
          {[1,2,3].map(i => <div key={i} className="sk" style={{ height: 100 }} />)}
        </div>
        <div className="sk" style={{ height: 220, marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="sk" style={{ height: 160 }} />
          <div className="sk" style={{ height: 160 }} />
        </div>
      </div>
    </>
  )
}
