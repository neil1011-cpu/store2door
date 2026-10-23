"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

/**
 * @fileOverview Universal Theme Provider.
 * Fixed compilation errors by standardizing prop types for Next.js 15.
 */
export function ThemeProvider({ children, ...props }: any) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
