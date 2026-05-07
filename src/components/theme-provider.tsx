'use client'

import { useEffect, useState } from 'react'
import { BRAND } from '@/lib/brand'

export type Theme = 'light' | 'dark' | 'americana'

const THEMES: Theme[] = ['light', 'dark', 'americana']

function isTheme(value: string | null): value is Theme {
  return Boolean(value && THEMES.includes(value as Theme))
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.classList.toggle('americana', theme === 'americana')
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  const storedTheme = localStorage.getItem(BRAND.themeStorageKey)
  return isTheme(storedTheme) ? storedTheme : 'dark'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme] = useState<Theme>(getStoredTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return <>{children}</>
}

// Hook to use toggle in components
export function useThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setSelectedTheme = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem(BRAND.themeStorageKey, newTheme)
    applyTheme(newTheme)
  }

  const toggle = () => {
    setSelectedTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return { theme, setTheme: setSelectedTheme, toggle }
}
