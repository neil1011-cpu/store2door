"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

/**
 * @fileOverview Custom animated pill-shaped theme toggle switch.
 * Features a day/night sky background with sliding sun/moon knob.
 */
export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div className="w-14 h-7 rounded-full bg-muted/20" />

  const isDark = resolvedTheme === "dark"

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative w-14 h-7 rounded-full p-1 transition-all duration-500 overflow-hidden shadow-inner border border-white/20 shrink-0",
        isDark 
          ? "bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-950" 
          : "bg-gradient-to-br from-sky-400 via-sky-300 to-blue-400"
      )}
      aria-label="Toggle theme"
    >
      {/* Background elements: Clouds/Stars */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Dark Mode Background Details */}
        <div className={cn(
            "absolute inset-0 transition-opacity duration-500",
            isDark ? "opacity-100" : "opacity-0"
        )}>
            {/* Tiny Stars */}
            <div className="absolute top-1.5 right-3 w-0.5 h-0.5 bg-white rounded-full animate-pulse" />
            <div className="absolute top-3 right-6 w-0.5 h-0.5 bg-white rounded-full opacity-60" />
            <div className="absolute top-1 right-9 w-0.5 h-0.5 bg-white rounded-full" />
            {/* Night Clouds */}
            <div className="absolute -bottom-2 -right-1 w-8 h-8 bg-white/5 rounded-full blur-md" />
        </div>

        {/* Light Mode Background Details */}
        <div className={cn(
            "absolute inset-0 transition-opacity duration-500",
            !isDark ? "opacity-100" : "opacity-0"
        )}>
            {/* Day Clouds */}
            <div className="absolute -bottom-2 -left-1 w-8 h-8 bg-white/60 rounded-full blur-sm" />
            <div className="absolute -bottom-1 left-3 w-6 h-6 bg-white/40 rounded-full blur-sm" />
        </div>
      </div>

      {/* The Knob (Sun/Moon) */}
      <div
        className={cn(
          "relative z-10 w-5 h-5 rounded-full shadow-xl transform transition-all duration-500 ease-in-out",
          isDark 
            ? "translate-x-0 bg-slate-50 shadow-[0_0_10px_rgba(255,255,255,0.4)]" 
            : "translate-x-7 bg-yellow-300 shadow-[0_0_10px_rgba(253,224,71,0.6)]"
        )}
      >
        {/* Surface detail for moon */}
        {isDark && (
          <div className="absolute inset-0 overflow-hidden rounded-full">
            <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-slate-200 rounded-full opacity-40" />
            <div className="absolute bottom-1 right-1.5 w-1 h-1 bg-slate-200 rounded-full opacity-40" />
          </div>
        )}
      </div>
    </button>
  )
}