"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSolana } from "@/contexts/solana-context"
import { supabase, type UserProfile } from "@/lib/supabase"

const WalletIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
  </svg>
)

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6,9 12,15 18,9"></polyline>
  </svg>
)

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
)

const LogOutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16,17 21,12 16,7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
)

const LoaderIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="animate-spin"
  >
    <path d="M21 12a9 9 0 11-6.219-8.56" />
  </svg>
)

const SmallLoaderIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="animate-spin"
  >
    <path d="M21 12a9 9 0 11-6.219-8.56" />
  </svg>
)

export function SolanaWalletStatus() {
  const { address, isConnected, isConnecting, connect, disconnect } = useSolana()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)

  // Fetch user profile when wallet connects
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!address || !isConnected) {
        setUserProfile(null)
        return
      }

      setIsLoadingProfile(true)
      try {
        const { data, error } = await supabase.from("user_profiles").select("*").eq("wallet_address", address).single()

        if (error && error.code !== "PGRST116") {
          console.error("Error fetching user profile:", error)
          return
        }

        setUserProfile(data || null)
      } catch (error) {
        console.error("Error fetching user profile:", error)
      } finally {
        setIsLoadingProfile(false)
      }
    }

    fetchUserProfile()
  }, [address, isConnected])

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  const getDisplayName = () => {
    if (userProfile?.username) {
      return userProfile.username
    }
    return formatAddress(address!)
  }

  const getAvatarFallback = () => {
    if (userProfile?.username) {
      return userProfile.username.charAt(0).toUpperCase()
    }
    return address ? address.charAt(0).toUpperCase() : "S"
  }

  const handleConnect = async () => {
    try {
      await connect()
    } catch (error) {
      console.error("Failed to connect Solana wallet:", error)
    }
  }

  const handleDisconnect = async () => {
    try {
      await disconnect()
    } catch (error) {
      console.error("Failed to disconnect Solana wallet:", error)
    }
  }

  if (!isConnected) {
    return (
      <Button
        onClick={handleConnect}
        disabled={isConnecting}
        className="bg-brand-primary hover:bg-brand-secondary text-primary-foreground font-semibold px-6 py-3 h-12"
      >
        {isConnecting ? (
          <div className="flex items-center gap-2">
            <LoaderIcon />
            Connecting...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <WalletIcon />
            Connect Wallet
          </div>
        )}
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center space-x-3 px-4 py-3 border-2 bg-card text-card-foreground hover:bg-accent h-12"
        >
          <Avatar className="h-7 w-7">
            <AvatarImage src={userProfile?.avatar_url || ""} alt="Profile" className="object-cover" />
            <AvatarFallback className="text-sm bg-brand-primary text-primary-foreground font-semibold">
              {isLoadingProfile ? <SmallLoaderIcon /> : getAvatarFallback()}
            </AvatarFallback>
          </Avatar>

          <span className="text-sm font-medium max-w-[120px] truncate">
            {isLoadingProfile ? "Loading..." : getDisplayName()}
          </span>

          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48 bg-popover text-popover-foreground border-2 p-2">
        <DropdownMenuItem asChild className="hover:bg-accent focus:bg-accent p-3 rounded-md cursor-pointer">
          <a href={`/creator/${address}`} className="flex items-center">
            <UserIcon />
            <span className="ml-3">View Profile</span>
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border" />

        <DropdownMenuItem
          onClick={handleDisconnect}
          className="hover:bg-accent focus:bg-accent cursor-pointer text-red-500 hover:text-red-600 p-3 rounded-md"
        >
          <LogOutIcon />
          <span className="ml-3">Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
