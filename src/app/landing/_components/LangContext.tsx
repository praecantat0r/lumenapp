'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { STRINGS, type Lang, type Strings } from './i18n'

interface LangContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: Strings
}

const LangContext = createContext<LangContextValue>({
  lang: 'en',
  setLang: () => {},
  t: STRINGS.en,
})

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangRaw] = useState<Lang>('en')

  useEffect(() => {
    const stored = localStorage.getItem('lumen-lang') as Lang | null
    if (stored && (stored === 'en' || stored === 'sk')) setLangRaw(stored)
  }, [])

  const setLang = (l: Lang) => {
    setLangRaw(l)
    localStorage.setItem('lumen-lang', l)
  }

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  return (
    <LangContext.Provider value={{ lang, setLang, t: STRINGS[lang] as Strings }}>
      {children}
    </LangContext.Provider>
  )
}

export function useT() {
  return useContext(LangContext)
}
