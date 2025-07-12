"use client"

import { memo, useCallback } from "react"
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
import { useOptimizedQuery } from "@/hooks/use-optimized-query"
import { supabase, type UserProfile } from "@/lib/supabase"
import { Wallet, CaretDown, User, SignOut, Spinner } from "@phosphor-icons/react"

const WalletButton = memo(({ onClick, isConnecting }: { onClick: () => void; isConnecting: boolean }) => (
  <Button
    onClick={onClick}
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
))

WalletButton.displayName = "WalletButton"

const ConnectedWallet = memo(
  ({
    account,
    userProfile,
    isLoadingProfile,
    onDisconnect,
  }: {
    account: string
    userProfile: UserProfile | null
    isLoadingProfile: boolean
    onDisconnect: () => void
  }) => {
    const formatAddress = useCallback((address: string) => {
      return `${address.slice(0, 6)}...${address.slice(-4)}`
    }, [])

    const getDisplayName = useCallback(() => {
      if (userProfile?.display_name?.trim()) {
        return userProfile.display_name
      }
      return formatAddress(account)
    }, [userProfile?.display_name, account, formatAddress])

    const getAvatarFallback = useCallback(() => {
      if (userProfile?.display_name?.trim()) {
        return userProfile.display_name.charAt(0).toUpperCase()
      }
      // Remove 0x prefix and get first character
      const cleanAddress = account.replace(/^0x/i, "")
      return cleanAddress.charAt(0).toUpperCase() || "?"
    }, [userProfile?.display_name, account])

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
            onClick={onDisconnect}
            className="hover:bg-accent focus:bg-accent cursor-pointer text-red-500 hover:text-red-600 p-3 rounded-md"
          >
            <SignOut size={18} className="mr-3" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  },
)

ConnectedWallet.displayName = "ConnectedWallet"

export const WalletStatus = memo(() => {
  const { account, isConnected, isConnecting, connectWallet, disconnectWallet, error } = useWeb3()

  const { data: userProfile, isLoading: isLoadingProfile } = useOptimizedQuery<UserProfile | null>({
    queryKey: `user-profile-${account}`,
    queryFn: async () => {
      if (!account) return null

      console.log("Fetching profile for account:", account)

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("wallet_address", account.toLowerCase())
        .single()

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching user profile:", error)
        return null
      }

      console.log("Profile data:", data)
      return data || null
    },
    enabled: !!account && isConnected,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })

  const handleConnect = useCallback(async () => {
    try {
      await connectWallet()
    } catch (error) {
      console.error("Failed to connect wallet:", error)
    }
  }, [connectWallet])

  // Show error if there is one
  if (error) {
    console.error("Wallet error:", error)
  }

  if (!isConnected || !account) {
    return <WalletButton onClick={handleConnect} isConnecting={isConnecting} />
  }

  return (
    <ConnectedWallet
      account={account}
      userProfile={userProfile}
      isLoadingProfile={isLoadingProfile}
      onDisconnect={disconnectWallet}
    />
  )
})

WalletStatus.displayName = "WalletStatus"

// Alias for backward-compatibility with older imports.
export const OptimizedWalletStatus = WalletStatus
