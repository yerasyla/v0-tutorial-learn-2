"use client"

import type React from "react"

import { useWalletGuard } from "@/hooks/use-wallet-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSolana } from "@/contexts/solana-context"
import { Wallet, Spinner } from "@phosphor-icons/react"

interface WalletGuardProps {
  children: React.ReactNode
  requireConnection?: boolean
  fallback?: React.ReactNode
}

export function WalletGuard({ children, requireConnection = false, fallback }: WalletGuardProps) {
  const { isReady, isConnected } = useWalletGuard({
    requireConnection,
  })
  const { connect, isConnecting } = useSolana()

  const handleConnect = async () => {
    try {
      await connect()
    } catch (error) {
      console.error("Failed to connect Solana wallet:", error)
    }
  }

  // Show loading state while checking requirements
  if (requireConnection && !isReady && !isConnected) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto border-2 border-border bg-card">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-3 text-xl text-foreground">
              <Wallet size={24} className="text-brand-primary" />
              Solana Wallet Required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">This page requires a Solana wallet connection to continue.</p>

            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="bg-brand-primary hover:bg-brand-secondary text-primary-foreground px-8 py-3 h-12"
            >
              {isConnecting ? (
                <div className="flex items-center gap-2">
                  <Spinner size={16} className="animate-spin" />
                  Connecting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Wallet size={18} />
                  Connect Solana Wallet
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
