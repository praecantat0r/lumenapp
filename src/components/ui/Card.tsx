import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
  onClick?: () => void
}

export function Card({ children, className = '', glow, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-6 ${glow ? 'candle-glow' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      {children}
    </div>
  )
}
