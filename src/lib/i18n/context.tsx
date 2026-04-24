'use client'
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { translations, type LangCode } from './translations'

interface LanguageContextValue {
  lang: LangCode
  setLanguage: (lang: LangCode) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLanguage: () => {},
  t: (key) => key,
})

function lookup(dict: Record<string, unknown>, keys: string[]): string {
  let node: unknown = dict
  for (const k of keys) {
    if (typeof node !== 'object' || node === null) return ''
    node = (node as Record<string, unknown>)[k]
  }
  return typeof node === 'string' ? node : ''
}

export function LanguageProvider({ children, initialLang }: { children: ReactNode; initialLang?: string }) {
  const [lang, setLang] = useState<LangCode>((initialLang as LangCode) ?? 'en')

  const setLanguage = useCallback((newLang: LangCode) => {
    setLang(newLang)
    // Persist to cookie so the server layout picks it up on next load
    if (typeof document !== 'undefined') {
      document.cookie = `lumen-lang=${newLang};path=/;max-age=31536000;SameSite=Lax`
    }
  }, [])

  const t = useCallback((key: string): string => {
    const keys = key.split('.')
    const val = lookup(translations[lang] as Record<string, unknown>, keys)
    if (val) return val
    // English fallback
    return lookup(translations.en as Record<string, unknown>, keys) || key
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
