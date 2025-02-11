'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ProviderProps } from 'next-themes/dist/types'

type ThemeProviderProps = ProviderProps & {
  children: React.ReactNode;
}

export function ThemeProvider({ 
  children,
  ...props
}: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      {children}
    </NextThemesProvider>
  )
}