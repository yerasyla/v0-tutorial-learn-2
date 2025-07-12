import { Suspense } from "react"
import { WalletGuard } from "@/components/wallet-guard"
import { DashboardContent } from "@/components/dashboard-content"

export default async function DashboardPage() {
  return (
    <WalletGuard>
      <Suspense fallback={<div>Loading dashboard...</div>}>
        <DashboardContent />
      </Suspense>
    </WalletGuard>
  )
}
