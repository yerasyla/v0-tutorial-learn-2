"use client"

import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSolana } from "@/contexts/solana-context"
import { Wallet, Spinner } from "@phosphor-icons/react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"

interface SolanaWalletGuardProps {
  children: React.ReactNode
  requireConnection?: boolean
  requireAuthentication?: boolean
  fallback?: React.ReactNode
}

export function SolanaWalletGuard({
  children,
  requireConnection = false,
  requireAuthentication = false,
  fallback,
}: SolanaWalletGuardProps) {
  const { isConnected, isConnecting, isAuthenticated, isAuthenticating, connect, authenticate } = useSolana()

  const handleConnect = async () => {
    try {
      await connect()
    } catch (error) {
      console.error("Failed to connect Solana wallet:", error)
    }
  }

  const handleAuthenticate = async () => {
    try {
      await authenticate()
    } catch (error) {
      console.error("Failed to authenticate Solana wallet:", error)
    }
  }

  // Check if wallet connection is required but not connected
  if (requireConnection && !isConnected) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto border-2 border-border bg-card">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-3 text-xl text-foreground">
              <Wallet size={24} className="text-brand-primary" />
              Connect Solana Wallet
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">This page requires a Solana wallet connection to continue.</p>

            <div className="flex flex-col gap-3">
              <WalletMultiButton className="!bg-brand-primary hover:!bg-brand-secondary !text-primary-foreground !font-semibold !px-8 !py-3 !h-12" />

              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                variant="outline"
                className="border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-primary-foreground bg-transparent"
              >
                {isConnecting ? (
                  <div className="flex items-center gap-2">
                    <Spinner size={16} className="animate-spin" />
                    Connecting...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Wallet size={18} />
                    Connect Manually
                  </div>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if authentication is required but not authenticated
  if (requireAuthentication && isConnected && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto border-2 border-border bg-card">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-3 text-xl text-foreground">
              <Wallet size={24} className="text-brand-primary" />
              Authenticate Wallet
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">Please sign a message to authenticate your wallet.</p>

            <Button
              onClick={handleAuthenticate}
              disabled={isAuthenticating}
              className="bg-brand-primary hover:bg-brand-secondary text-primary-foreground px-8 py-3 h-12"
            >
              {isAuthenticating ? (
                <div className="flex items-center gap-2">
                  <Spinner size={16} className="animate-spin" />
                  Authenticating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Wallet size={18} />
                  Sign Message
                </div>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
