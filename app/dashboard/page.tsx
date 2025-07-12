"use client"

import { useEffect, useState } from "react"
import { useWallet } from "@/contexts/web3-context"
import { WalletAuth } from "@/lib/wallet-auth"
import { getDashboardData, type DashboardData } from "@/app/actions/dashboard-actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import DashboardContent from "@/components/dashboard-content"

export default function DashboardPage() {
  const { address, isConnected } = useWallet()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!isConnected || !address) {
        setError("Please connect your wallet to access the dashboard")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Get current session
        const session = WalletAuth.getSession()
        if (!session) {
          setError("No valid authentication session. Please reconnect your wallet.")
          setLoading(false)
          return
        }

        console.log("Loading dashboard data with session:", session.address)
        const data = await getDashboardData(session)
        setDashboardData(data)
      } catch (error: any) {
        console.error("Error loading dashboard data:", error)
        setError(error.message || "Failed to load dashboard data")
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [isConnected, address])

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please connect your wallet to access the dashboard.</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No dashboard data available.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return <DashboardContent initialData={dashboardData} />
}
