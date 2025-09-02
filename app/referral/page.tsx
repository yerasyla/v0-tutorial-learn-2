"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSolana } from "@/contexts/solana-context"
import { toast } from "@/hooks/use-toast"
import { Copy, Users, Gift, TrendingUp } from "lucide-react"
import { useState } from "react"

export default function ReferralPage() {
  const { address, isConnected } = useSolana()
  const [copied, setCopied] = useState(false)

  const referralLink = address ? `${window.location.origin}?ref=${address}` : ""

  const copyReferralLink = async () => {
    if (!referralLink) return

    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      })
    }
  }

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Connect Your Solana Wallet</CardTitle>
            <CardDescription>You need to connect your Solana wallet to access the referral program</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Please connect your Solana wallet to start earning referral rewards.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Referral Program</h1>
        <p className="text-gray-600">Earn SOL rewards by inviting friends to join Tutorial Platform</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-600" />
              Total Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
            <p className="text-sm text-gray-600">Friends referred</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0 SOL</div>
            <p className="text-sm text-gray-600">SOL earned</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Gift className="h-5 w-5 mr-2 text-purple-600" />
            Your Referral Link
          </CardTitle>
          <CardDescription>Share this link with friends to earn SOL rewards when they join</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="referral-link">Referral Link</Label>
            <div className="flex gap-2">
              <Input id="referral-link" value={referralLink} readOnly className="flex-1" />
              <Button onClick={copyReferralLink} variant="outline">
                <Copy className="h-4 w-4 mr-2" />
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            When someone signs up using your referral link and creates their first course, you'll earn 0.01 SOL!
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <div>
                <h4 className="font-semibold">Share Your Link</h4>
                <p className="text-gray-600">Copy and share your unique referral link with friends</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <div>
                <h4 className="font-semibold">Friend Joins</h4>
                <p className="text-gray-600">Your friend connects their Solana wallet and creates an account</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <div>
                <h4 className="font-semibold">Earn SOL Rewards</h4>
                <p className="text-gray-600">Get 0.01 SOL when they create their first course</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
