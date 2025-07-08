"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { toast } from "@/hooks/use-toast"

// Wallet types and interfaces
interface WalletProvider {
  isMetaMask?: boolean
  isCoinbaseWallet?: boolean
  isTrustWallet?: boolean
  isTrust?: boolean
  request: (args: { method: string; params?: any[] }) => Promise<any>
  on?: (event: string, handler: (...args: any[]) => void) => void
  removeListener?: (event: string, handler: (...args: any[]) => void) => void
}

interface Web3ContextType {
  account: string | null
  isConnected: boolean
  isConnecting: boolean
  chainId: string | null
  walletType: string | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  switchNetwork: (chainId: string) => Promise<boolean>
  error: string | null
  clearError: () => void
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined)

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [chainId, setChainId] = useState<string | null>(null)
  const [walletType, setWalletType] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Clear error function
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Get wallet provider with mobile support
  const getWalletProvider = useCallback((): WalletProvider | null => {
    if (typeof window === "undefined") return null

    try {
      // Check for mobile wallet apps first
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

      if (isMobile) {
        // Trust Wallet
        if (window.ethereum?.isTrust) return window.ethereum
        // MetaMask Mobile
        if (window.ethereum?.isMetaMask) return window.ethereum
        // Coinbase Wallet
        if (window.ethereum?.isCoinbaseWallet) return window.ethereum
      }

      // Check for any available ethereum provider
      if (window.ethereum) {
        return window.ethereum
      }

      return null
    } catch (error) {
      console.error("Error accessing wallet provider:", error)
      return null
    }
  }, [])

  // Detect wallet type with mobile support
  const detectWalletType = useCallback((provider: WalletProvider): string => {
    if (provider.isTrust || provider.isTrustWallet) return "Trust Wallet"
    if (provider.isMetaMask) return "MetaMask"
    if (provider.isCoinbaseWallet) return "Coinbase Wallet"
    return "Browser Wallet"
  }, [])

  // Switch network function
  const switchNetwork = useCallback(
    async (targetChainId: string): Promise<boolean> => {
      try {
        const provider = getWalletProvider()
        if (!provider) {
          throw new Error("No wallet provider found")
        }

        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: targetChainId }],
        })

        return true
      } catch (error: any) {
        console.error("Network switch failed:", error)

        if (error.code === 4902) {
          // Chain not added to wallet - this should be handled by the calling code
          throw new Error("Network not added to wallet")
        } else if (error.code === 4001) {
          // User rejected
          throw new Error("Network switch rejected by user")
        }

        throw error
      }
    },
    [getWalletProvider],
  )

  // Handle account changes
  const handleAccountsChanged = useCallback(
    (accounts: string[]) => {
      console.log("Accounts changed:", accounts)

      if (accounts.length === 0) {
        // User disconnected
        setAccount(null)
        setIsConnected(false)
        setWalletType(null)
        localStorage.removeItem("wallet-connection")
        toast({
          title: "Wallet Disconnected",
          description: "Your wallet has been disconnected.",
        })
      } else {
        // Account switched
        const newAccount = accounts[0]
        setAccount(newAccount)
        setIsConnected(true)

        // Update stored connection
        const connectionData = {
          account: newAccount,
          walletType: walletType || "Browser Wallet",
          timestamp: Date.now(),
        }
        localStorage.setItem("wallet-connection", JSON.stringify(connectionData))

        toast({
          title: "Account Switched",
          description: `Switched to ${newAccount.slice(0, 6)}...${newAccount.slice(-4)}`,
        })
      }
    },
    [walletType],
  )

  // Handle chain changes
  const handleChainChanged = useCallback((newChainId: string) => {
    console.log("Chain changed:", newChainId)
    setChainId(newChainId)
  }, [])

  // Handle connection errors
  const handleConnectionError = useCallback((error: any) => {
    console.error("Wallet connection error:", error)

    let errorMessage = "Failed to connect wallet"

    if (error.code === 4001) {
      errorMessage = "Connection rejected by user"
    } else if (error.code === -32002) {
      errorMessage = "Connection request already pending"
    } else if (error.code === -32603) {
      errorMessage = "Internal wallet error"
    } else if (error.message) {
      errorMessage = error.message
    }

    setError(errorMessage)
    setIsConnecting(false)

    toast({
      title: "Connection Failed",
      description: errorMessage,
      variant: "destructive",
    })
  }, [])

  // Connect wallet function with mobile support
  const connectWallet = useCallback(async () => {
    if (isConnecting) return

    setIsConnecting(true)
    setError(null)

    try {
      const provider = getWalletProvider()

      if (!provider) {
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

        if (isMobile) {
          throw new Error(
            "No mobile wallet found. Please install MetaMask, Trust Wallet, or Coinbase Wallet from your app store.",
          )
        } else {
          throw new Error("No wallet found. Please install MetaMask or another Web3 wallet.")
        }
      }

      // Request account access
      const accounts = await provider.request({
        method: "eth_requestAccounts",
      })

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts returned from wallet")
      }

      // Get current chain ID
      const currentChainId = await provider.request({
        method: "eth_chainId",
      })

      const connectedAccount = accounts[0]
      const detectedWalletType = detectWalletType(provider)

      // Update state
      setAccount(connectedAccount)
      setIsConnected(true)
      setChainId(currentChainId)
      setWalletType(detectedWalletType)

      // Store connection data
      const connectionData = {
        account: connectedAccount,
        walletType: detectedWalletType,
        timestamp: Date.now(),
      }
      localStorage.setItem("wallet-connection", JSON.stringify(connectionData))

      // Set up event listeners
      if (provider.on) {
        provider.on("accountsChanged", handleAccountsChanged)
        provider.on("chainChanged", handleChainChanged)
      }

      toast({
        title: "Wallet Connected! 🎉",
        description: `Connected to ${detectedWalletType}: ${connectedAccount.slice(0, 6)}...${connectedAccount.slice(-4)}`,
      })

      console.log("Wallet connected successfully:", {
        account: connectedAccount,
        chainId: currentChainId,
        walletType: detectedWalletType,
      })
    } catch (error: any) {
      handleConnectionError(error)
    } finally {
      setIsConnecting(false)
    }
  }, [
    isConnecting,
    getWalletProvider,
    detectWalletType,
    handleAccountsChanged,
    handleChainChanged,
    handleConnectionError,
  ])

  // Disconnect wallet function
  const disconnectWallet = useCallback(() => {
    try {
      const provider = getWalletProvider()

      // Remove event listeners
      if (provider?.removeListener) {
        provider.removeListener("accountsChanged", handleAccountsChanged)
        provider.removeListener("chainChanged", handleChainChanged)
      }

      // Clear state
      setAccount(null)
      setIsConnected(false)
      setChainId(null)
      setWalletType(null)
      setError(null)

      // Clear storage
      localStorage.removeItem("wallet-connection")

      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been disconnected successfully.",
      })

      console.log("Wallet disconnected successfully")
    } catch (error) {
      console.error("Error disconnecting wallet:", error)
    }
  }, [getWalletProvider, handleAccountsChanged, handleChainChanged])

  // Auto-reconnect on page load
  useEffect(() => {
    const autoReconnect = async () => {
      try {
        const stored = localStorage.getItem("wallet-connection")
        if (!stored) return

        const connectionData = JSON.parse(stored)
        const isRecentConnection = Date.now() - connectionData.timestamp < 24 * 60 * 60 * 1000 // 24 hours

        if (!isRecentConnection) {
          localStorage.removeItem("wallet-connection")
          return
        }

        const provider = getWalletProvider()
        if (!provider) return

        // Check if still connected
        const accounts = await provider.request({ method: "eth_accounts" })
        if (accounts && accounts.length > 0 && accounts[0] === connectionData.account) {
          const currentChainId = await provider.request({ method: "eth_chainId" })

          setAccount(accounts[0])
          setIsConnected(true)
          setChainId(currentChainId)
          setWalletType(connectionData.walletType)

          // Set up event listeners
          if (provider.on) {
            provider.on("accountsChanged", handleAccountsChanged)
            provider.on("chainChanged", handleChainChanged)
          }

          console.log("Auto-reconnected to wallet:", {
            account: accounts[0],
            chainId: currentChainId,
            walletType: connectionData.walletType,
          })
        } else {
          // Connection no longer valid
          localStorage.removeItem("wallet-connection")
        }
      } catch (error) {
        console.error("Auto-reconnect failed:", error)
        localStorage.removeItem("wallet-connection")
      }
    }

    autoReconnect()
  }, [getWalletProvider, handleAccountsChanged, handleChainChanged])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const provider = getWalletProvider()
      if (provider?.removeListener) {
        provider.removeListener("accountsChanged", handleAccountsChanged)
        provider.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [getWalletProvider, handleAccountsChanged, handleChainChanged])

  const value: Web3ContextType = {
    account,
    isConnected,
    isConnecting,
    chainId,
    walletType,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    error,
    clearError,
  }

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>
}

export function useWeb3() {
  const context = useContext(Web3Context)
  if (context === undefined) {
    throw new Error("useWeb3 must be used within a Web3Provider")
  }
  return context
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: WalletProvider & {
      isMetaMask?: boolean
      isCoinbaseWallet?: boolean
      isTrustWallet?: boolean
      isTrust?: boolean
    }
  }
}
