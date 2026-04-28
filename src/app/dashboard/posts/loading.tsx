export default function PostsLoading() {
  return (
    <>
      <style>{`
        @keyframes sk-shimmer { from { background-position: -400px 0 } to { background-position: 400px 0 } }
        .sk { background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%); background-size: 800px 100%; animation: sk-shimmer 1.4s infinite; border-radius: 10px; }
      `}</style>
      <div style={{ padding: '24px 32px', background: 'var(--carbon)', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="sk" style={{ aspectRatio: '4/5' }} />
          ))}
        </div>
      </div>
    </>
  )
}
