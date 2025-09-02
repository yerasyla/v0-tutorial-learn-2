"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

type Theme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Load theme from localStorage on mount
    const savedTheme = localStorage.getItem("tutorial-theme") as Theme
    if (savedTheme && (savedTheme === "light" || savedTheme === "dark")) {
      setThemeState(savedTheme)
    } else {
      // Check system preference
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      setThemeState(systemPrefersDark ? "dark" : "light")
    }
  }, [])

  useEffect(() => {
    if (!mounted) return

    console.log("[v0] Theme changing to:", theme)

    // Save theme to localStorage and update document class
    localStorage.setItem("tutorial-theme", theme)

    document.documentElement.classList.remove("dark", "light")

    if (theme === "dark") {
      document.documentElement.classList.add("dark")
      document.documentElement.setAttribute("data-theme", "dark")
      console.log("[v0] Applied dark theme classes")
    } else {
      document.documentElement.classList.add("light")
      document.documentElement.setAttribute("data-theme", "light")
      console.log("[v0] Applied light theme classes")
    }

    document.documentElement.style.colorScheme = theme
  }, [theme, mounted])

  const toggleTheme = () => {
    console.log("[v0] Theme toggle clicked, current theme:", theme)
    setThemeState((prev) => (prev === "light" ? "dark" : "light"))
  }

  const setTheme = (newTheme: Theme) => {
    console.log("[v0] Setting theme to:", newTheme)
    setThemeState(newTheme)
  }

  if (!mounted) {
    return (
      <ThemeContext.Provider
        value={{
          theme: "light",
          toggleTheme: () => {},
          setTheme: () => {},
          isDark: false,
        }}
      >
        <div style={{ visibility: "hidden" }}>{children}</div>
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        isDark: theme === "dark",
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
