"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { ethers } from "ethers"

interface Web3ContextType {
  // Wallet connection state
  isConnected: boolean
  isConnecting: boolean
  address: string | null
  account: string | null // Alias for address for backward compatibility
  chainId: number | null

  // Authentication state
  isAuthenticated: boolean
  isAuthenticating: boolean

  // Connection methods
  connect: () => Promise<void>
  disconnect: () => void
  connectWallet: () => Promise<void> // Legacy alias
  disconnectWallet: () => void // Legacy alias

  // Authentication methods
  authenticate: () => Promise<void>

  // Network methods
  switchNetwork: (targetChainId: string) => Promise<void>

  // Provider access
  provider: ethers.BrowserProvider | null
  signer: ethers.JsonRpcSigner | null

  // Error handling
  error: string | null
  clearError: () => void
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined)

export function Web3Provider({ children }: { children: React.ReactNode }) {
  // Connection state
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  // Provider state
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null)

  // Error state
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Check if wallet is available
  const isWalletAvailable = useCallback(() => {
    return typeof window !== "undefined" && window.ethereum
  }, [])

  // Initialize connection on mount
  useEffect(() => {
    const initializeConnection = async () => {
      if (!isWalletAvailable()) return

      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        setProvider(provider)

        // Check if already connected
        const accounts = await provider.listAccounts()
        if (accounts.length > 0) {
          const signer = await provider.getSigner()
          const address = await signer.getAddress()
          const network = await provider.getNetwork()

          setAddress(address)
          setChainId(Number(network.chainId))
          setIsConnected(true)
          setSigner(signer)

          console.log("Auto-connected to wallet:", address)

          // Check authentication status
          const { WalletAuth } = await import("@/lib/wallet-auth")
          const session = WalletAuth.getSession()
          if (session && session.address.toLowerCase() === address.toLowerCase()) {
            setIsAuthenticated(true)
            console.log("Found valid session for:", address)
          }
        }
      } catch (error) {
        console.error("Failed to initialize wallet connection:", error)
      }
    }

    initializeConnection()
  }, [isWalletAvailable])

  // Listen for account changes
  useEffect(() => {
    if (!isWalletAvailable()) return

    const handleAccountsChanged = async (accounts: string[]) => {
      console.log("Accounts changed:", accounts)

      if (accounts.length === 0) {
        // Wallet disconnected
        setIsConnected(false)
        setAddress(null)
        setChainId(null)
        setIsAuthenticated(false)
        setSigner(null)
        setError(null)

        // Clear authentication
        const { WalletAuth } = await import("@/lib/wallet-auth")
        WalletAuth.clearSession()
        console.log("Wallet disconnected")
      } else {
        // Account changed
        try {
          const provider = new ethers.BrowserProvider(window.ethereum)
          const signer = await provider.getSigner()
          const newAddress = await signer.getAddress()
          const network = await provider.getNetwork()

          setAddress(newAddress)
          setChainId(Number(network.chainId))
          setIsConnected(true)
          setSigner(signer)
          setProvider(provider)

          console.log("Account changed to:", newAddress)

          // Clear old authentication when account changes
          setIsAuthenticated(false)
          const { WalletAuth } = await import("@/lib/wallet-auth")
          WalletAuth.clearSession()
        } catch (error) {
          console.error("Error handling account change:", error)
          setError("Failed to handle account change")
        }
      }
    }

    const handleChainChanged = (chainId: string) => {
      const newChainId = Number.parseInt(chainId, 16)
      console.log("Chain changed to:", newChainId)
      setChainId(newChainId)
    }

    window.ethereum?.on("accountsChanged", handleAccountsChanged)
    window.ethereum?.on("chainChanged", handleChainChanged)

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged)
      window.ethereum?.removeListener("chainChanged", handleChainChanged)
    }
  }, [isWalletAvailable])

  // Connect wallet
  const connect = useCallback(async () => {
    if (!isWalletAvailable()) {
      const errorMsg = "No wallet found. Please install MetaMask or another Web3 wallet."
      setError(errorMsg)
      throw new Error(errorMsg)
    }

    setIsConnecting(true)
    setError(null)

    try {
      console.log("Requesting wallet connection...")
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send("eth_requestAccounts", [])

      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      const network = await provider.getNetwork()

      setProvider(provider)
      setSigner(signer)
      setAddress(address)
      setChainId(Number(network.chainId))
      setIsConnected(true)

      console.log("Wallet connected successfully:", address)

      // Automatically authenticate after connection
      try {
        const { WalletAuth } = await import("@/lib/wallet-auth")
        await WalletAuth.authenticate(signer, address)
        setIsAuthenticated(true)
        console.log("Wallet authenticated successfully")
      } catch (authError) {
        console.error("Authentication failed:", authError)
        // Don't throw here - connection succeeded even if auth failed
      }
    } catch (error: any) {
      console.error("Failed to connect wallet:", error)
      let errorMessage = "Failed to connect wallet"

      if (error.code === 4001) {
        errorMessage = "Connection rejected by user"
      } else if (error.code === -32002) {
        errorMessage = "Connection request already pending"
      } else if (error.message) {
        errorMessage = error.message
      }

      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsConnecting(false)
    }
  }, [isWalletAvailable])

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    setIsConnected(false)
    setAddress(null)
    setChainId(null)
    setIsAuthenticated(false)
    setProvider(null)
    setSigner(null)
    setError(null)

    // Clear authentication
    const { WalletAuth } = await import("@/lib/wallet-auth")
    WalletAuth.clearSession()

    console.log("Wallet disconnected")
  }, [])

  // Legacy aliases for backward compatibility
  const connectWallet = connect
  const disconnectWallet = disconnect

  // Authenticate with wallet
  const authenticate = useCallback(async () => {
    if (!isConnected || !address || !signer) {
      throw new Error("Wallet not connected")
    }

    setIsAuthenticating(true)
    try {
      const { WalletAuth } = await import("@/lib/wallet-auth")
      await WalletAuth.authenticate(signer, address)
      setIsAuthenticated(true)
      console.log("Wallet authenticated successfully")
    } catch (error: any) {
      console.error("Authentication failed:", error)
      setError(`Authentication failed: ${error.message}`)
      throw error
    } finally {
      setIsAuthenticating(false)
    }
  }, [isConnected, address, signer])

  // Switch network
  const switchNetwork = useCallback(
    async (targetChainId: string) => {
      if (!isWalletAvailable()) {
        throw new Error("No wallet found")
      }

      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: targetChainId }],
        })
      } catch (error: any) {
        console.error("Failed to switch network:", error)
        setError(`Failed to switch network: ${error.message}`)
        throw error
      }
    },
    [isWalletAvailable],
  )

  const value: Web3ContextType = {
    // Connection state
    isConnected,
    isConnecting,
    address,
    account: address, // Alias for backward compatibility
    chainId,

    // Authentication state
    isAuthenticated,
    isAuthenticating,

    // Methods
    connect,
    disconnect,
    connectWallet,
    disconnectWallet,
    authenticate,
    switchNetwork,

    // Provider access
    provider,
    signer,

    // Error handling
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

// Alias for backward compatibility
export const useWallet = useWeb3

// Type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>
      on: (event: string, callback: (...args: any[]) => void) => void
      removeListener: (event: string, callback: (...args: any[]) => void) => void
      isMetaMask?: boolean
    }
  }
}
