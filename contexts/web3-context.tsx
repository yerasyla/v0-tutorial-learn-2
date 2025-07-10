"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { ethers } from "ethers"
import { WalletAuth, type WalletSession } from "@/lib/wallet-auth"
import { toast } from "@/hooks/use-toast"

interface Web3ContextType {
  // Connection state
  account: string | null
  chainId: string | null
  isConnected: boolean
  isConnecting: boolean
  walletType: string | null

  // Authentication state
  isAuthenticated: boolean
  authSession: WalletSession | null

  // Methods
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  switchNetwork: (chainId: string) => Promise<void>
  getAuthSession: () => WalletSession | null
  error: string | null
  clearError: () => void
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined)

const SUPPORTED_CHAINS = {
  "0x38": {
    chainId: "0x38",
    chainName: "BNB Smart Chain",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    rpcUrls: ["https://bsc-dataseed.binance.org/"],
    blockExplorerUrls: ["https://bscscan.com/"],
  },
  "0x1": {
    chainId: "0x1",
    chainName: "Ethereum Mainnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://mainnet.infura.io/v3/"],
    blockExplorerUrls: ["https://etherscan.io/"],
  },
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null)
  const [chainId, setChainId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [walletType, setWalletType] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authSession, setAuthSession] = useState<WalletSession | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Check for existing session on mount
  useEffect(() => {
    const session = WalletAuth.getSession()
    if (session && WalletAuth.verifySession(session)) {
      setAuthSession(session)
      setIsAuthenticated(true)
      console.log("Found valid existing session for:", session.address)
    }
  }, [])

  // Auto-connect on page load
  useEffect(() => {
    const autoConnect = async () => {
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" })
          if (accounts.length > 0) {
            const chainId = await window.ethereum.request({ method: "eth_chainId" })
            setAccount(accounts[0])
            setChainId(chainId)
            setIsConnected(true)
            setWalletType("MetaMask")

            // Check if we have a valid session for this account
            const session = WalletAuth.getSession()
            if (
              session &&
              session.address.toLowerCase() === accounts[0].toLowerCase() &&
              WalletAuth.verifySession(session)
            ) {
              setAuthSession(session)
              setIsAuthenticated(true)
              console.log("Auto-reconnected to wallet:", {
                account: accounts[0],
                chainId,
                walletType: "MetaMask",
                authenticated: true,
              })
            } else {
              console.log("Auto-reconnected to wallet:", {
                account: accounts[0],
                chainId,
                walletType: "MetaMask",
                authenticated: false,
              })
            }
          }
        } catch (error) {
          console.error("Auto-connect failed:", error)
        }
      }
    }

    autoConnect()
  }, [])

  // Listen for account changes
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet()
        } else if (accounts[0] !== account) {
          setAccount(accounts[0])
          // Clear authentication when account changes
          WalletAuth.clearSession()
          setAuthSession(null)
          setIsAuthenticated(false)
          console.log("Account changed, cleared authentication")

          toast({
            title: "Account Changed",
            description: `Switched to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}. Please sign in again.`,
          })
        }
      }

      const handleChainChanged = (chainId: string) => {
        setChainId(chainId)
        console.log("Chain changed to:", chainId)
      }

      window.ethereum.on("accountsChanged", handleAccountsChanged)
      window.ethereum.on("chainChanged", handleChainChanged)

      return () => {
        window.ethereum?.removeListener("accountsChanged", handleAccountsChanged)
        window.ethereum?.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [account])

  const connectWallet = async () => {
    if (!window.ethereum) {
      const errorMsg = "MetaMask is not installed. Please install MetaMask to continue."
      setError(errorMsg)
      toast({
        title: "Wallet Not Found",
        description: errorMsg,
        variant: "destructive",
      })
      throw new Error(errorMsg)
    }

    setIsConnecting(true)
    setError(null)

    try {
      // Request account access - FIXED: correct method name
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts returned from wallet")
      }

      const chainId = await window.ethereum.request({ method: "eth_chainId" })

      setAccount(accounts[0])
      setChainId(chainId)
      setIsConnected(true)
      setWalletType("MetaMask")

      // Create authentication session
      console.log("Creating new authentication session")
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      const session = await WalletAuth.createSession(signer)
      setAuthSession(session)
      setIsAuthenticated(true)

      toast({
        title: "Wallet Connected! 🎉",
        description: `Connected to MetaMask: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
      })

      console.log("Wallet connected successfully:", {
        account: accounts[0],
        chainId,
        walletType: "MetaMask",
        authenticated: true,
      })
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

      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      })

      throw new Error(errorMessage)
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = useCallback(() => {
    setAccount(null)
    setChainId(null)
    setIsConnected(false)
    setWalletType(null)
    setIsAuthenticated(false)
    setAuthSession(null)
    setError(null)
    WalletAuth.clearSession()

    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected successfully.",
    })

    console.log("Wallet disconnected")
  }, [])

  const switchNetwork = async (targetChainId: string) => {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed")
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetChainId }],
      })
    } catch (error: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (error.code === 4902) {
        const chainConfig = SUPPORTED_CHAINS[targetChainId as keyof typeof SUPPORTED_CHAINS]
        if (chainConfig) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [chainConfig],
          })
        }
      } else {
        throw error
      }
    }
  }

  const getAuthSession = useCallback((): WalletSession | null => {
    const session = WalletAuth.getSession()
    if (session && WalletAuth.verifySession(session)) {
      console.log("Retrieved valid auth session for:", session.address)
      return session
    }
    console.log("No valid auth session found")
    return null
  }, [])

  const value: Web3ContextType = {
    account,
    chainId,
    isConnected,
    isConnecting,
    walletType,
    isAuthenticated,
    authSession,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    getAuthSession,
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
    ethereum?: any
  }
}
