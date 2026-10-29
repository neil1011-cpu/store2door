"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

/**
 * @fileOverview Universal Theme Provider.
 * Simplified to avoid build-blocking type resolution issues with next-themes.
 */
export function ThemeProvider({ children, ...props }: any) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
