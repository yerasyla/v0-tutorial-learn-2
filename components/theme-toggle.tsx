"use client"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/contexts/theme-context"
import { Sun, Moon } from "@phosphor-icons/react"

export function ThemeToggle() {
  const { theme, toggleTheme, isDark } = useTheme()

  return (
    <Button
      onClick={toggleTheme}
      variant="ghost"
      size="sm"
      className="h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {isDark ? (
        <Sun size={20} className="text-gray-600 dark:text-gray-400" />
      ) : (
        <Moon size={20} className="text-gray-600 dark:text-gray-400" />
      )}
    </Button>
  )
}
