import { Suspense } from "react"
import { WalletGuard } from "@/components/wallet-guard"
import { DashboardContent } from "@/components/dashboard-content"

export default async function DashboardPage() {
  return (
    <WalletGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Creator Dashboard</h1>
        </div>

        <Suspense fallback={<div>Loading dashboard...</div>}>
          <DashboardContent />
        </Suspense>
      </div>
    </WalletGuard>
  )
}
