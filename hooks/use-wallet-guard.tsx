"use client"

import { useEffect, useState } from "react"
import { useWeb3 } from "@/contexts/web3-context"

interface UseWalletGuardOptions {
  requireConnection?: boolean
  redirectTo?: string
}

export function useWalletGuard(options: UseWalletGuardOptions = {}) {
  const { isConnected, isConnecting, connectWallet } = useWeb3()

  const [isReady, setIsReady] = useState(false)

  const { requireConnection = false } = options

  useEffect(() => {
    const checkRequirements = () => {
      // If connection is required but not connected, try to connect automatically
      if (requireConnection && !isConnected && !isConnecting) {
        setIsReady(false)
        return
      }

      // All requirements met
      setIsReady(true)
    }

    checkRequirements()
  }, [isConnected, isConnecting, requireConnection])

  const requireWalletConnection = async () => {
    if (!isConnected) {
      try {
        await connectWallet()
        return true
      } catch (error) {
        console.error("Failed to connect wallet:", error)
        return false
      }
    }
    return true
  }

  return {
    isReady,
    isConnected,
    requireWalletConnection,
  }
}
