"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { SolanaAuth } from "@/lib/solana-auth"
import { Connection, PublicKey } from "@solana/web3.js"

interface SolanaContextType {
  // Wallet connection state
  isConnected: boolean
  isConnecting: boolean
  address: string | null
  publicKey: PublicKey | null

  // Authentication state
  isAuthenticated: boolean
  isAuthenticating: boolean

  connection: Connection | null
  networkStatus: "mainnet" | "devnet" | "failed" | "connecting"

  // Connection methods
  connect: () => Promise<void>
  disconnect: () => Promise<void>

  // Authentication methods
  authenticate: () => Promise<void>

  // Error handling
  error: string | null
  clearError: () => void
}

const SolanaContext = createContext<SolanaContextType | undefined>(undefined)

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connection, setConnection] = useState<Connection | null>(null)
  const [networkStatus, setNetworkStatus] = useState<"mainnet" | "devnet" | "failed" | "connecting">("connecting")

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  useEffect(() => {
    const initConnection = async () => {
      try {
        setNetworkStatus("connecting")

        const customRpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL

        console.log("[v0] Environment variable NEXT_PUBLIC_SOLANA_RPC_URL:", customRpcUrl ? "SET" : "NOT SET")
        if (customRpcUrl) {
          console.log("[v0] Custom RPC URL:", customRpcUrl)
        } else {
          console.log("[v0] No custom RPC URL provided, will use public endpoints")
        }

        if (customRpcUrl) {
          console.log("[v0] Using custom RPC endpoint:", customRpcUrl)
          try {
            const customConnection = new Connection(customRpcUrl, "confirmed")
            // Test the custom connection
            await customConnection.getLatestBlockhash()
            setConnection(customConnection)
            setNetworkStatus("mainnet")
            console.log("[v0] Successfully connected to custom RPC endpoint")
            return
          } catch (error) {
            console.error("[v0] Custom RPC endpoint failed, falling back to public endpoints:", error)
          }
        }

        // Fallback to public endpoints with better error handling
        const publicEndpoints = [
          "https://api.mainnet-beta.solana.com",
          "https://solana-api.projectserum.com",
          "https://rpc.ankr.com/solana",
        ]

        for (const endpoint of publicEndpoints) {
          try {
            console.log("[v0] Testing public RPC endpoint:", endpoint)
            const testConnection = new Connection(endpoint, "confirmed")
            await testConnection.getLatestBlockhash()
            setConnection(testConnection)
            setNetworkStatus("mainnet")
            console.log("[v0] Successfully connected to public RPC endpoint:", endpoint)
            return
          } catch (error) {
            console.error(`[v0] Public RPC endpoint ${endpoint} failed:`, error)
            continue
          }
        }

        // If all endpoints fail, create a fallback connection for transaction signing
        console.warn("[v0] All RPC endpoints failed, creating fallback connection")
        const fallbackConnection = new Connection("https://api.mainnet-beta.solana.com", "confirmed")
        setConnection(fallbackConnection)
        setNetworkStatus("failed")
        setError("RPC connection issues detected. Balance display may be limited, but transactions should still work.")
      } catch (error) {
        console.error("[v0] Failed to initialize Solana connection:", error)
        setNetworkStatus("failed")
        setError("Connection issues detected. Some features may be limited.")
      }
    }

    initConnection()
  }, [])

  const checkWallet = async () => {
    try {
      if (typeof window !== "undefined" && (window as any).solana?.isPhantom) {
        const wallet = (window as any).solana
        if (wallet.isConnected) {
          const publicKeyStr = wallet.publicKey?.toString()
          if (publicKeyStr) {
            setAddress(publicKeyStr)
            setPublicKey(new PublicKey(publicKeyStr))
            setIsConnected(true)
            console.log("[v0] Found existing Phantom wallet connection:", publicKeyStr)
          }
        }
      }
    } catch (error) {
      console.error("[v0] Error checking existing wallet:", error)
    }
  }

  useEffect(() => {
    checkWallet()
  }, [])

  const connect = useCallback(async () => {
    setError(null)
    setIsConnecting(true)

    try {
      console.log("[v0] Attempting to connect Phantom wallet...")

      if (typeof window === "undefined" || !(window as any).solana?.isPhantom) {
        throw new Error("Phantom wallet not found. Please install Phantom wallet.")
      }

      const wallet = (window as any).solana
      const response = await wallet.connect()
      const publicKeyStr = response.publicKey.toString()

      setAddress(publicKeyStr)
      setPublicKey(new PublicKey(publicKeyStr))
      setIsConnected(true)

      console.log("[v0] Phantom wallet connected successfully:", publicKeyStr)

      await authenticateWithAddress(publicKeyStr)
    } catch (error: any) {
      console.error("[v0] Failed to connect wallet:", error)
      let errorMessage = "Failed to connect wallet"

      if (error.message?.includes("User rejected")) {
        errorMessage = "Connection rejected by user"
      } else if (error.message) {
        errorMessage = error.message
      }

      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    try {
      if (typeof window !== "undefined" && (window as any).solana?.isPhantom) {
        await (window as any).solana.disconnect()
      }

      setIsConnected(false)
      setAddress(null)
      setPublicKey(null)
      setIsAuthenticated(false)
      setError(null)

      console.log("[v0] Phantom wallet disconnected")
    } catch (error) {
      console.error("[v0] Error disconnecting wallet:", error)
    }
  }, [])

  const authenticateWithAddress = useCallback(async (walletAddress: string) => {
    setIsAuthenticating(true)
    try {
      console.log("[v0] Starting authentication for:", walletAddress)

      const wallet = (window as any).solana

      const message = `Sign this message to authenticate with your Solana wallet.\n\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}`
      const encodedMessage = new TextEncoder().encode(message)

      const signMessage = async (message: Uint8Array) => {
        const signedMessage = await wallet.signMessage(message, "utf8")
        return signedMessage.signature
      }

      await SolanaAuth.authenticate(signMessage, walletAddress)

      setIsAuthenticated(true)
      console.log("[v0] Phantom wallet authenticated successfully")
    } catch (error: any) {
      console.error("[v0] Authentication failed:", error)
      setError(`Authentication failed: ${error.message}`)
      throw error
    } finally {
      setIsAuthenticating(false)
    }
  }, [])

  const authenticate = useCallback(async () => {
    if (!isConnected || !address) {
      throw new Error("Wallet not connected")
    }
    await authenticateWithAddress(address)
  }, [isConnected, address, authenticateWithAddress])

  const value: SolanaContextType = {
    isConnected,
    isConnecting,
    address,
    publicKey,
    isAuthenticated,
    isAuthenticating,
    connection,
    networkStatus,
    connect,
    disconnect,
    authenticate,
    error,
    clearError,
  }

  return <SolanaContext.Provider value={value}>{children}</SolanaContext.Provider>
}

export function useSolana() {
  const context = useContext(SolanaContext)
  if (context === undefined) {
    throw new Error("useSolana must be used within a SolanaProvider")
  }
  return context
}
