"use client"

import { WalletAuth } from "@/lib/wallet-auth"
import { getDashboardData } from "@/app/actions/dashboard-actions"
import DashboardContent from "@/components/dashboard-content"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const session = WalletAuth.getSession()
        if (!session) {
          router.push("/")
          return
        }

        // Server Action call ─ this runs on the server securely
        const dashboardData = await getDashboardData(session)
        setData(dashboardData)
      } catch (err: any) {
        console.error("Dashboard load error:", err)
        setError(err.message || "Failed to load dashboard")
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Error</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardContent initialData={data} />
    </div>
  )
}
