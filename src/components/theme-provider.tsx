"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

/**
 * @fileOverview Universal Theme Provider.
 * Standardized for Next.js 15 and resolved broken type imports.
 */
export function ThemeProvider({ children, ...props }: any) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}