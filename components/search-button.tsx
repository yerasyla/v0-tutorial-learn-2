"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { SearchModal } from "@/components/search-modal"
import { Search } from "lucide-react"

interface SearchButtonProps {
  variant?: "default" | "ghost" | "outline"
  size?: "default" | "sm" | "lg"
  className?: string
  showText?: boolean
}

export function SearchButton({
  variant = "ghost",
  size = "default",
  className = "",
  showText = true,
}: SearchButtonProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Handle global search shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsSearchOpen(true)
      }
      // Escape to close search
      if (e.key === "Escape" && isSearchOpen) {
        setIsSearchOpen(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isSearchOpen])

  // Handle custom search event from navbar
  useEffect(() => {
    const handleOpenSearch = () => setIsSearchOpen(true)
    document.addEventListener("open-search", handleOpenSearch)
    return () => document.removeEventListener("open-search", handleOpenSearch)
  }, [])

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsSearchOpen(true)}
        className={`${className} relative`}
        aria-label="Search courses and lessons"
      >
        <Search size={18} className={showText ? "mr-2" : ""} />
        {showText && (
          <>
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden lg:inline-flex ml-2 pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </>
        )}
      </Button>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  )
}
