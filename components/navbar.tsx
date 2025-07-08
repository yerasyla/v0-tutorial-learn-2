"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, Home, BookOpen, LayoutDashboard, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useWeb3 } from "@/contexts/web3-context"
import { WalletStatus } from "@/components/optimized-wallet-status"
import { ThemeToggle } from "@/components/theme-toggle"
import { SearchButton } from "@/components/search-button"
import { Logo } from "@/components/logo"

const navigationItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Courses", href: "/courses", icon: BookOpen },
]

const walletRequiredItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Create Course", href: "/create-course", icon: Plus },
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const { isConnected } = useWeb3()

  useEffect(() => {
    setMounted(true)
  }, [])

  const allItems = [...navigationItems, ...(isConnected ? walletRequiredItems : [])]

  if (!mounted) {
    return (
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-9 w-20 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left side - Logo */}
            <div className="flex items-center">
              <Logo variant="circular" size="lg" showText={false} />
            </div>

            {/* Center - Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              {allItems.map((item) => {
                const isActive = pathname === item.href
                const isDisabled = walletRequiredItems.includes(item) && !isConnected

                return (
                  <Link
                    key={item.name}
                    href={isDisabled ? "#" : item.href}
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      isActive
                        ? "text-primary"
                        : isDisabled
                          ? "text-muted-foreground/50 cursor-not-allowed"
                          : "text-muted-foreground"
                    }`}
                    onClick={(e) => {
                      if (isDisabled) {
                        e.preventDefault()
                      }
                    }}
                  >
                    {item.name}
                  </Link>
                )
              })}
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center space-x-3">
              <div className="hidden sm:block">
                <SearchButton />
              </div>
              <ThemeToggle />
              <WalletStatus />

              {/* Mobile Menu Button */}
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <div className="flex flex-col space-y-4 mt-4">
                    {allItems.map((item) => {
                      const isActive = pathname === item.href
                      const isDisabled = walletRequiredItems.includes(item) && !isConnected
                      const Icon = item.icon

                      return (
                        <Link
                          key={item.name}
                          href={isDisabled ? "#" : item.href}
                          className={`flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary p-2 rounded-md ${
                            isActive
                              ? "text-primary bg-primary/10"
                              : isDisabled
                                ? "text-muted-foreground/50 cursor-not-allowed"
                                : "text-muted-foreground hover:bg-muted"
                          }`}
                          onClick={(e) => {
                            if (isDisabled) {
                              e.preventDefault()
                            } else {
                              setIsOpen(false)
                            }
                          }}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden">
        <div className="flex items-center justify-around py-2 px-4">
          {allItems.slice(0, 4).map((item) => {
            const isActive = pathname === item.href
            const isDisabled = walletRequiredItems.includes(item) && !isConnected
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={isDisabled ? "#" : item.href}
                className={`flex flex-col items-center space-y-1 p-2 rounded-md transition-colors min-w-0 ${
                  isActive
                    ? "text-primary"
                    : isDisabled
                      ? "text-muted-foreground/50 cursor-not-allowed"
                      : "text-muted-foreground hover:text-primary"
                }`}
                onClick={(e) => {
                  if (isDisabled) {
                    e.preventDefault()
                  }
                }}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs truncate">{item.name}</span>
              </Link>
            )
          })}
          <div className="flex flex-col items-center space-y-1 p-2 min-w-0">
            <SearchButton variant="ghost" size="sm" className="p-0 h-auto">
              <Search className="h-5 w-5" />
            </SearchButton>
            <span className="text-xs text-muted-foreground">Search</span>
          </div>
        </div>
      </div>

      {/* Mobile bottom navigation spacer */}
      <div className="h-16 md:hidden" />
    </>
  )
}
