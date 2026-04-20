import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label style={{ fontFamily: 'var(--font-ibm)', fontSize: '13px', color: 'var(--sand)', fontWeight: 300 }}>
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all duration-150 ${className}`}
        style={{
          background: 'var(--surface)',
          border: `1px solid ${error ? 'var(--error)' : 'var(--border)'}`,
          color: 'var(--parchment)',
          fontFamily: 'var(--font-ibm)',
          fontWeight: 300,
        }}
        onFocus={(e) => {
          if (!error) e.currentTarget.style.borderColor = 'var(--candle)'
        }}
        onBlur={(e) => {
          if (!error) e.currentTarget.style.borderColor = 'var(--border)'
        }}
        {...props}
      />
      {error && <span style={{ fontSize: '12px', color: 'var(--error)' }}>{error}</span>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label style={{ fontFamily: 'var(--font-ibm)', fontSize: '13px', color: 'var(--sand)', fontWeight: 300 }}>
          {label}
        </label>
      )}
      <textarea
        className={`w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all duration-150 resize-none ${className}`}
        style={{
          background: 'var(--surface)',
          border: `1px solid ${error ? 'var(--error)' : 'var(--border)'}`,
          color: 'var(--parchment)',
          fontFamily: 'var(--font-ibm)',
          fontWeight: 300,
        }}
        onFocus={(e) => {
          if (!error) e.currentTarget.style.borderColor = 'var(--candle)'
        }}
        onBlur={(e) => {
          if (!error) e.currentTarget.style.borderColor = 'var(--border)'
        }}
        {...props}
      />
      {error && <span style={{ fontSize: '12px', color: 'var(--error)' }}>{error}</span>}
    </div>
  )
}
