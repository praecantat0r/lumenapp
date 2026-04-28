export default function BrandBrainLoading() {
  return (
    <>
      <style>{`
        @keyframes sk-shimmer { from { background-position: -400px 0 } to { background-position: 400px 0 } }
        .sk { background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%); background-size: 800px 100%; animation: sk-shimmer 1.4s infinite; border-radius: 10px; }
      `}</style>
      <div style={{ padding: '28px 32px', background: 'var(--carbon)', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="sk" style={{ height: 48, width: 240 }} />
        <div className="sk" style={{ height: 180 }} />
        <div className="sk" style={{ height: 180 }} />
        <div className="sk" style={{ height: 120 }} />
      </div>
    </>
  )
}
