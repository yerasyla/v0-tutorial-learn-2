"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { WalletStatus } from "@/components/optimized-wallet-status"
import { SearchButton } from "@/components/search-button"
import { cn } from "@/lib/utils"
import { useWeb3 } from "@/contexts/web3-context"
import { Home, BookOpen, LayoutDashboard, Plus } from "lucide-react"

export default function Navbar() {
  const pathname = usePathname()
  const { isConnected } = useWeb3()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const nav = [
    { href: "/", label: "Home", icon: Home, always: true },
    { href: "/courses", label: "Courses", icon: BookOpen, always: true },
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      wallet: true,
    },
    { href: "/create-course", label: "Create", icon: Plus, wallet: true },
  ]

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href) && href !== "/")

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex h-14 sm:h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <Logo size="lg" showText={false} href="/" variant="circular" />
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-muted rounded animate-pulse"></div>
              <div className="w-24 h-8 bg-muted rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <>
      {/* Desktop/Tablet Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex h-14 sm:h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <Logo size="lg" showText={false} href="/" variant="circular" />

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-1">
                {nav.map((item) => {
                  const shouldShow = item.always || (item.wallet && isConnected)
                  if (!shouldShow) return null

                  return (
                    <Link key={item.href} href={item.href}>
                      <span
                        className={cn(
                          "flex items-center px-3 py-2 text-sm font-medium transition-colors rounded-md",
                          isActive(item.href)
                            ? "text-brand-primary bg-brand-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent",
                        )}
                      >
                        <item.icon size={16} className="mr-2" />
                        {item.label}
                      </span>
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-2">
              {/* Search Button - Hidden on mobile */}
              <div className="hidden sm:block">
                <SearchButton variant="ghost" size="sm" />
              </div>

              <ThemeToggle />
              <WalletStatus />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border">
        <div className="grid grid-cols-5 h-16">
          {nav.map((item) => {
            const shouldShow = item.always || (item.wallet && isConnected)
            const isDisabled = item.wallet && !isConnected

            return (
              <Link
                key={item.href}
                href={shouldShow ? item.href : "#"}
                className={cn(
                  "flex flex-col items-center justify-center space-y-1",
                  isDisabled && "opacity-50 pointer-events-none",
                )}
                onClick={(e) => isDisabled && e.preventDefault()}
              >
                <item.icon
                  size={20}
                  className={cn(isActive(item.href) && !isDisabled ? "text-brand-primary" : "text-muted-foreground")}
                />
                <span
                  className={cn(
                    "text-xs font-medium",
                    isActive(item.href) && !isDisabled ? "text-brand-primary" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}

          {/* Mobile Search Button */}
          <div className="flex flex-col items-center justify-center space-y-1">
            <SearchButton variant="ghost" size="sm" showText={false} className="p-0 h-auto" />
            <span className="text-xs font-medium text-muted-foreground">Search</span>
          </div>
        </div>
      </div>

      {/* Bottom padding for mobile navigation */}
      <div className="md:hidden h-16"></div>
    </>
  )
}
