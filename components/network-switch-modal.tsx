"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useWeb3 } from "@/contexts/web3-context"
import { useState } from "react"
import { Network, Warning, CheckCircle, Spinner } from "@phosphor-icons/react"

interface NetworkOption {
  chainId: string
  name: string
  icon: string
  description: string
  color: string
}

const NETWORK_OPTIONS: NetworkOption[] = [
  {
    chainId: "0x1",
    name: "Ethereum Mainnet",
    icon: "⟠",
    description: "Ethereum Layer 1",
    color: "text-blue-600",
  },
  {
    chainId: "0x38",
    name: "BNB Smart Chain",
    icon: "🟡",
    description: "Binance Smart Chain",
    color: "text-purple-600",
  },
  {
    chainId: "0x89",
    name: "Polygon",
    icon: "🟣",
    description: "Polygon PoS Chain",
    color: "text-purple-600",
  },
  {
    chainId: "0xa4b1",
    name: "Arbitrum One",
    icon: "🔵",
    description: "Arbitrum Layer 2",
    color: "text-blue-500",
  },
]

interface NetworkSwitchModalProps {
  isOpen: boolean
  onClose: () => void
  targetChainId?: string
}

export function NetworkSwitchModal({ isOpen, onClose, targetChainId }: NetworkSwitchModalProps) {
  const { switchNetwork, chainId } = useWeb3()
  const [switching, setSwitching] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleNetworkSwitch = async (networkChainId: string) => {
    setSwitching(networkChainId)
    setError(null)

    try {
      const success = await switchNetwork(networkChainId)
      if (success) {
        onClose()
      } else {
        setError("Failed to switch network. Please try again.")
      }
    } catch (error) {
      console.error("Network switch failed:", error)
      setError("Network switch failed. Please try again.")
    } finally {
      setSwitching(null)
    }
  }

  const getCurrentNetwork = () => {
    return NETWORK_OPTIONS.find((network) => network.chainId === chainId)
  }

  const currentNetwork = getCurrentNetwork()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-2 border-border">
        <DialogHeader className="text-center">
          <DialogTitle className="flex items-center justify-center gap-3 text-2xl text-foreground">
            <Network size={28} className="text-brand-primary" />
            Switch Network
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base leading-relaxed">
            {targetChainId ? "This action requires switching to a different network" : "Choose a network to switch to"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {error && (
            <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
              <Warning size={18} className="text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-800 dark:text-red-200 ml-2">{error}</AlertDescription>
            </Alert>
          )}

          {currentNetwork && (
            <div className="p-3 bg-accent rounded-lg border border-border">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Current Network:</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg">{currentNetwork.icon}</span>
                  <span className="font-medium">{currentNetwork.name}</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {NETWORK_OPTIONS.map((network) => {
              const isCurrent = network.chainId === chainId
              const isSwitching = switching === network.chainId
              const isTarget = targetChainId === network.chainId

              return (
                <div
                  key={network.chainId}
                  className={`border-2 rounded-lg p-4 transition-colors bg-background ${
                    isCurrent
                      ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950"
                      : isTarget
                        ? "border-brand-primary bg-purple-50 dark:bg-purple-950"
                        : "border-border hover:border-brand-primary"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl">{network.icon}</div>
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          {network.name}
                          {isCurrent && <CheckCircle size={16} className="text-green-600" weight="fill" />}
                          {isTarget && !isCurrent && (
                            <span className="text-xs bg-brand-primary text-primary-foreground px-2 py-1 rounded">
                              Required
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{network.description}</div>
                      </div>
                    </div>

                    <div>
                      {isCurrent ? (
                        <Button
                          disabled
                          variant="outline"
                          className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-400 min-w-[100px] bg-transparent"
                        >
                          Connected
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleNetworkSwitch(network.chainId)}
                          disabled={!!switching}
                          className={`min-w-[100px] ${
                            isTarget
                              ? "bg-brand-primary hover:bg-brand-secondary text-primary-foreground"
                              : "bg-brand-primary hover:bg-brand-secondary text-primary-foreground"
                          }`}
                        >
                          {isSwitching ? (
                            <div className="flex items-center gap-2">
                              <Spinner size={16} className="animate-spin" />
                              Switching...
                            </div>
                          ) : (
                            "Switch"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 p-4 bg-accent rounded-lg border border-border">
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Network Information:</p>
              <ul className="space-y-1 text-xs">
                <li>• Each network has different tokens and fees</li>
                <li>• Make sure you have the native token for gas fees</li>
                <li>• Some features may only work on specific networks</li>
                <li>• Your wallet will prompt you to approve the switch</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
