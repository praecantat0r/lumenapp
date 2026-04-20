'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function OverviewSearch() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && query.trim()) {
      router.push(`/dashboard/posts?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <span className="material-symbols-outlined" style={{
        position: 'absolute', left: 12, fontSize: 16,
        color: 'var(--muted)', pointerEvents: 'none',
      }}>search</span>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search archive…"
        style={{
          background: 'var(--surface-2)', border: '1px solid rgba(78,69,56,0.25)',
          borderRadius: 9999, padding: '8px 16px 8px 36px',
          fontSize: 13, color: 'var(--parchment)', fontFamily: 'var(--font-ibm)',
          outline: 'none', width: 240, transition: 'border-color 0.15s',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(182,141,64,0.4)')}
        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(78,69,56,0.25)')}
      />
    </div>
  )
}
