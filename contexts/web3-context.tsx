"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { BrowserProvider, type JsonRpcSigner } from "ethers"

interface Web3ContextType {
  account: string | null
  isConnected: boolean
  isAuthenticated: boolean
  provider: BrowserProvider | null
  signer: JsonRpcSigner | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  switchNetwork: (chainId: string) => Promise<void>
  error: string | null
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined)

interface Web3ProviderProps {
  children: ReactNode
}

export function Web3Provider({ children }: Web3ProviderProps) {
  const [account, setAccount] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check if wallet is already connected
  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    try {
      if (typeof window !== "undefined" && window.ethereum) {
        const provider = new BrowserProvider(window.ethereum)
        const accounts = await provider.listAccounts()

        if (accounts.length > 0) {
          const signer = await provider.getSigner()
          const address = await signer.getAddress()

          setAccount(address)
          setProvider(provider)
          setSigner(signer)
          setIsConnected(true)

          // Check if user is authenticated (has valid session)
          const session = localStorage.getItem("wallet_session")
          if (session) {
            try {
              const parsedSession = JSON.parse(session)
              if (parsedSession.address?.toLowerCase() === address.toLowerCase()) {
                setIsAuthenticated(true)
              }
            } catch (e) {
              console.error("Error parsing session:", e)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error checking connection:", error)
    }
  }

  const connectWallet = async () => {
    try {
      setError(null)

      if (!window.ethereum) {
        throw new Error("MetaMask is not installed")
      }

      const provider = new BrowserProvider(window.ethereum)
      await provider.send("eth_requestAccounts", [])

      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      setAccount(address)
      setProvider(provider)
      setSigner(signer)
      setIsConnected(true)
    } catch (error: any) {
      console.error("Error connecting wallet:", error)
      setError(error.message || "Failed to connect wallet")
    }
  }

  const disconnectWallet = () => {
    setAccount(null)
    setProvider(null)
    setSigner(null)
    setIsConnected(false)
    setIsAuthenticated(false)
    localStorage.removeItem("wallet_session")
  }

  const switchNetwork = async (chainId: string) => {
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed")
      }

      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId }],
      })
    } catch (error: any) {
      console.error("Error switching network:", error)
      setError(error.message || "Failed to switch network")
    }
  }

  const value: Web3ContextType = {
    account,
    isConnected,
    isAuthenticated,
    provider,
    signer,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    error,
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

// Export useWallet as an alias for backward compatibility
export const useWallet = useWeb3

declare global {
  interface Window {
    ethereum?: any
  }
}
