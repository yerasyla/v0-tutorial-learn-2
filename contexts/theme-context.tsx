"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

type Theme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  isDark: boolean
  isLoaded: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light")
  const [isLoaded, setIsLoaded] = useState(false)

  const applyTheme = (newTheme: Theme) => {
    console.log("[v0] Applying theme:", newTheme)
    const root = document.documentElement

    // Remove both classes first
    root.classList.remove("light", "dark")

    // Add the new theme class
    root.classList.add(newTheme)

    root.style.colorScheme = newTheme

    console.log("[v0] Theme applied, current classes:", root.className)
  }

  useEffect(() => {
    console.log("[v0] Theme provider initializing...")

    const initialTheme = "light"
    applyTheme(initialTheme)

    try {
      const savedTheme = localStorage.getItem("tutorial-theme") as Theme
      console.log("[v0] Saved theme from localStorage:", savedTheme)

      if (savedTheme && (savedTheme === "light" || savedTheme === "dark")) {
        setThemeState(savedTheme)
        applyTheme(savedTheme)
      } else {
        // Check system preference safely
        if (typeof window !== "undefined" && window.matchMedia) {
          const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
          const systemTheme = systemPrefersDark ? "dark" : "light"
          console.log("[v0] System prefers:", systemTheme)
          setThemeState(systemTheme)
          applyTheme(systemTheme)
        }
      }
    } catch (error) {
      console.warn("Could not access localStorage for theme:", error)
      setThemeState("light")
      applyTheme("light")
    }

    setIsLoaded(true)
    console.log("[v0] Theme provider loaded")
  }, [])

  useEffect(() => {
    if (!isLoaded) return

    console.log("[v0] Theme changed to:", theme)

    try {
      localStorage.setItem("tutorial-theme", theme)
      console.log("[v0] Theme saved to localStorage")
    } catch (error) {
      console.warn("Could not save theme to localStorage:", error)
    }

    applyTheme(theme)
  }, [theme, isLoaded])

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    console.log("[v0] Toggling theme from", theme, "to", newTheme)
    setThemeState(newTheme)
  }

  const setTheme = (newTheme: Theme) => {
    console.log("[v0] Setting theme to:", newTheme)
    setThemeState(newTheme)
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        isDark: theme === "dark",
        isLoaded,
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
