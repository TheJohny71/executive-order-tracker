'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ProviderProps } from 'next-themes/dist/types'

type Theme = 'light' | 'dark' | 'system'
type Attribute = 'class' | 'data-theme'

export interface ThemeProviderProps {
  children: React.ReactNode
  attribute?: Attribute
  defaultTheme?: Theme
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
  storageKey?: string
  themes?: string[]
  forcedTheme?: Theme
  nonce?: string
}

export function ThemeProvider({ 
  children,
  attribute = 'class',
  defaultTheme = 'system',
  enableSystem = true,
  disableTransitionOnChange = false,
  storageKey = 'theme',
  themes = ['light', 'dark'],
  forcedTheme,
  nonce,
  ...props
}: ThemeProviderProps) {
  return (
    <NextThemesProvider 
      {...props}
      attribute={attribute}
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
      disableTransitionOnChange={disableTransitionOnChange}
      storageKey={storageKey}
      themes={themes}
      forcedTheme={forcedTheme}
      nonce={nonce}
    >
      {children}
    </NextThemesProvider>
  )
}