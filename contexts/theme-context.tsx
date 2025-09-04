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

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("tutorial-theme") as Theme
      if (savedTheme && (savedTheme === "light" || savedTheme === "dark")) {
        setThemeState(savedTheme)
      } else {
        // Check system preference safely
        if (typeof window !== "undefined" && window.matchMedia) {
          const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
          setThemeState(systemPrefersDark ? "dark" : "light")
        }
      }
    } catch (error) {
      console.warn("Could not access localStorage for theme:", error)
      setThemeState("light")
    }
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (!isLoaded) return

    try {
      localStorage.setItem("tutorial-theme", theme)
    } catch (error) {
      console.warn("Could not save theme to localStorage:", error)
    }

    const root = document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
      root.classList.remove("light")
    } else {
      root.classList.add("light")
      root.classList.remove("dark")
    }
  }, [theme, isLoaded])

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"))
  }

  const setTheme = (newTheme: Theme) => {
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
