"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps as BaseThemeProviderProps } from "next-themes/dist/types";

type ThemeProviderProps = BaseThemeProviderProps & {
  children: React.ReactNode;
};

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
