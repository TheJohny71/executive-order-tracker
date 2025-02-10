'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ThemeProviderProps as NextThemeProviderProps } from 'next-themes/dist/types'

type Theme = 'light' | 'dark' | 'system'

interface ThemeProviderProps extends Partial<NextThemeProviderProps> {
  children: React.ReactNode
  attribute?: string
  defaultTheme?: Theme
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
  storageKey?: string
  themes?: string[]
}

export function ThemeProvider({ 
  children,
  attribute = 'class',
  defaultTheme = 'system',
  enableSystem = true,
  disableTransitionOnChange = false,
  storageKey = 'theme',
  themes = ['light', 'dark'],
  ...props
}: ThemeProviderProps) {
  return (
    <NextThemesProvider 
      attribute={attribute}
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
      disableTransitionOnChange={disableTransitionOnChange}
      storageKey={storageKey}
      themes={themes}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}