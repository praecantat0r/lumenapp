'use client'

export function LumenMark({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none">
      <style>{`
        @keyframes ray-breathe {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes diag-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .lumen-ray-1 { animation: ray-breathe 3s ease-in-out infinite 0s; }
        .lumen-ray-2 { animation: ray-breathe 3s ease-in-out infinite 0.4s; }
        .lumen-ray-3 { animation: ray-breathe 3s ease-in-out infinite 0.8s; }
        .lumen-ray-4 { animation: ray-breathe 3s ease-in-out infinite 1.2s; }
        .lumen-diag { transform-origin: 26px 26px; animation: diag-rotate 18s linear infinite; }
      `}</style>
      <line className="lumen-ray-1" x1="26" y1="16" x2="26" y2="4"  stroke="#D4A84B" strokeWidth="1.5" strokeLinecap="round"/>
      <line className="lumen-ray-2" x1="26" y1="36" x2="26" y2="48" stroke="#D4A84B" strokeWidth="1.5" strokeLinecap="round"/>
      <line className="lumen-ray-3" x1="16" y1="26" x2="4"  y2="26" stroke="#D4A84B" strokeWidth="1.5" strokeLinecap="round"/>
      <line className="lumen-ray-4" x1="36" y1="26" x2="48" y2="26" stroke="#D4A84B" strokeWidth="1.5" strokeLinecap="round"/>
      <g className="lumen-diag">
        <line x1="18.9" y1="18.9" x2="11" y2="11" stroke="#D4A84B" strokeWidth="1" strokeLinecap="round" opacity="0.55"/>
        <line x1="33.1" y1="33.1" x2="41" y2="41" stroke="#D4A84B" strokeWidth="1" strokeLinecap="round" opacity="0.55"/>
        <line x1="33.1" y1="18.9" x2="41" y2="11" stroke="#D4A84B" strokeWidth="1" strokeLinecap="round" opacity="0.55"/>
        <line x1="18.9" y1="33.1" x2="11" y2="41" stroke="#D4A84B" strokeWidth="1" strokeLinecap="round" opacity="0.55"/>
      </g>
      <circle cx="26" cy="26" r="4" fill="#D4A84B"/>
    </svg>
  )
}

export function LumenWordmark({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LumenMark size={28} />
      <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '20px', letterSpacing: '-0.02em', color: 'var(--parchment)' }}>
        lumen
      </span>
    </div>
  )
}
