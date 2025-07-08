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
import { useWeb3 } from "@/contexts/web3-context"
import { supabase, type UserProfile } from "@/lib/supabase"
import { Wallet, CaretDown, User, SignOut, Spinner } from "@phosphor-icons/react"

export function WalletStatus() {
  const { account, isConnected, isConnecting, connectWallet, disconnectWallet } = useWeb3()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)

  // Fetch user profile when wallet connects
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!account || !isConnected) {
        setUserProfile(null)
        return
      }

      setIsLoadingProfile(true)
      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("wallet_address", account.toLowerCase())
          .single()

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
  }, [account, isConnected])

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getDisplayName = () => {
    if (userProfile?.display_name) {
      return userProfile.display_name
    }
    return formatAddress(account!)
  }

  const getAvatarFallback = () => {
    if (userProfile?.display_name) {
      return userProfile.display_name.charAt(0).toUpperCase()
    }
    return account ? account.charAt(2).toUpperCase() : "W"
  }

  const handleConnect = async () => {
    try {
      await connectWallet()
    } catch (error) {
      console.error("Failed to connect wallet:", error)
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
            <Spinner size={18} className="animate-spin" />
            Connecting...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Wallet size={18} />
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
              {isLoadingProfile ? <Spinner size={14} className="animate-spin" /> : getAvatarFallback()}
            </AvatarFallback>
          </Avatar>

          <span className="text-sm font-medium max-w-[120px] truncate">
            {isLoadingProfile ? "Loading..." : getDisplayName()}
          </span>

          <CaretDown size={16} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48 bg-popover text-popover-foreground border-2 p-2">
        <DropdownMenuItem asChild className="hover:bg-accent focus:bg-accent p-3 rounded-md cursor-pointer">
          <a href={`/creator/${account}`} className="flex items-center">
            <User size={18} className="mr-3" />
            View Profile
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border" />

        <DropdownMenuItem
          onClick={disconnectWallet}
          className="hover:bg-accent focus:bg-accent cursor-pointer text-red-500 hover:text-red-600 p-3 rounded-md"
        >
          <SignOut size={18} className="mr-3" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
