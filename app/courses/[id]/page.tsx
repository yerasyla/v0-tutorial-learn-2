"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { useWeb3 } from "@/contexts/web3-context"
import { WalletAuth } from "@/lib/wallet-auth"
import { toast } from "@/hooks/use-toast"
import { Play, Clock, DollarSign, Heart, ExternalLink } from "lucide-react"
import { VerifiedBadge } from "@/components/verified-badge"

interface Lesson {
  id: string
  title: string
  description: string
  youtube_url: string
  order_index: number
  duration_minutes?: number
}

interface Course {
  id: string
  title: string
  description: string
  creator_wallet: string
  thumbnail_url?: string
  difficulty: string
  category: string
  estimated_duration: number
  is_free: boolean
  price?: number
  created_at: string
  lessons: Lesson[]
}

interface CreatorProfile {
  display_name?: string
  avatar_url?: string
  twitter_handle?: string
  is_verified?: boolean
}

interface Donation {
  id: string
  donor_wallet: string
  amount: string
  tx_hash: string
  created_at: string
}

interface DonationStats {
  donations: Donation[]
  totalAmount: string
  donorCount: number
}

export default function CoursePage() {
  const params = useParams()
  const courseId = params.id as string

  const [course, setCourse] = useState<Course | null>(null)
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null)
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0)
  const [donationAmount, setDonationAmount] = useState("")
  const [donationStats, setDonationStats] = useState<DonationStats>({
    donations: [],
    totalAmount: "0",
    donorCount: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isDonating, setIsDonating] = useState(false)

  const { address, isConnected, provider, balance, chainId } = useWeb3()

  // Fetch course data
  const fetchCourse = async () => {
    try {
      console.log("📚 Fetching course:", courseId)

      // Fetch course with lessons
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select(`
          *,
          lessons (*)
        `)
        .eq("id", courseId)
        .single()

      if (courseError) {
        console.error("❌ Error fetching course:", courseError)
        throw new Error("Course not found")
      }

      // Sort lessons by order_index
      if (courseData.lessons) {
        courseData.lessons.sort((a: Lesson, b: Lesson) => a.order_index - b.order_index)
      }

      setCourse(courseData)

      // Fetch creator profile separately
      if (courseData.creator_wallet) {
        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("display_name, avatar_url, twitter_handle, is_verified")
          .eq("wallet_address", courseData.creator_wallet)
          .single()

        if (profileError && profileError.code !== "PGRST116") {
          console.error("❌ Error fetching creator profile:", profileError)
        } else if (profileData) {
          setCreatorProfile(profileData)
        }
      }

      console.log("✅ Course fetched successfully")
    } catch (error) {
      console.error("❌ Error fetching course:", error)
      toast({
        title: "Error",
        description: "Failed to load course",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch donation stats
  const fetchDonations = async () => {
    try {
      console.log("💰 Fetching donations for course:", courseId)

      const response = await fetch(`/api/donations?course_id=${courseId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch donations")
      }

      setDonationStats(data)
      console.log("✅ Donations fetched:", data)
    } catch (error) {
      console.error("❌ Error fetching donations:", error)
    }
  }

  // Save donation to database
  const saveDonationToDatabase = async (txHash: string) => {
    try {
      console.log("💾 Saving donation to database:", txHash)

      const response = await fetch("/api/donations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId,
          donorWallet: address,
          amount: donationAmount,
          txHash,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save donation")
      }

      console.log("✅ Donation saved to database")

      // Refresh donation stats
      setTimeout(() => {
        fetchDonations()
      }, 2000)
    } catch (error) {
      console.error("❌ Error saving donation:", error)
      toast({
        title: "Warning",
        description: "Donation completed but failed to save to database",
        variant: "destructive",
      })
    }
  }

  // Check if on BNB Chain
  const isBNBChain = () => {
    if (!chainId) return false

    // BNB Smart Chain mainnet
    const bnbChainId = 56
    const bnbChainIdHex = "0x38"

    console.log("🔗 Chain check:", { chainId, bnbChainId, bnbChainIdHex })

    return (
      chainId === bnbChainId ||
      chainId === bnbChainIdHex ||
      Number.parseInt(chainId.toString()) === bnbChainId ||
      chainId.toString() === bnbChainIdHex
    )
  }

  // Handle donation
  const handleDonate = async () => {
    if (!isConnected || !address || !provider) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to donate",
        variant: "destructive",
      })
      return
    }

    if (!isBNBChain()) {
      toast({
        title: "Wrong network",
        description: "Please switch to BNB Smart Chain to donate",
        variant: "destructive",
      })
      return
    }

    const amount = Number.parseFloat(donationAmount)
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid donation amount",
        variant: "destructive",
      })
      return
    }

    const currentBalance = Number.parseFloat(balance || "0")
    if (amount > currentBalance) {
      toast({
        title: "Insufficient balance",
        description: `You need at least ${amount} TUT tokens`,
        variant: "destructive",
      })
      return
    }

    setIsDonating(true)

    try {
      console.log("💰 Starting donation:", { amount, to: course?.creator_wallet })

      // Get wallet session for authentication
      let session = WalletAuth.getSession()
      if (!session) {
        console.log("🔐 No session found, authenticating...")
        const signer = await provider.getSigner()
        session = await WalletAuth.authenticate(signer, address)
      }

      if (!session) {
        throw new Error("Failed to authenticate wallet")
      }

      // TUT token contract address on BNB Smart Chain
      const TUT_TOKEN_ADDRESS = "0x12345..." // Replace with actual TUT token address

      // For demo purposes, we'll simulate the transaction
      // In production, you would interact with the actual TUT token contract
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`

      console.log("✅ Mock transaction completed:", mockTxHash)

      // Save to database
      await saveDonationToDatabase(mockTxHash)

      toast({
        title: "Donation successful!",
        description: `Thank you for donating ${amount} TUT tokens!`,
      })

      setDonationAmount("")
    } catch (error: any) {
      console.error("❌ Donation failed:", error)
      toast({
        title: "Donation failed",
        description: error.message || "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsDonating(false)
    }
  }

  // Get YouTube video ID from URL
  const getYouTubeVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    return match ? match[1] : null
  }

  useEffect(() => {
    if (courseId) {
      fetchCourse()
      fetchDonations()
    }
  }, [courseId])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading course...</p>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Course not found</h1>
          <p className="text-muted-foreground">The course you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  const currentLesson = course.lessons[currentLessonIndex]
  const videoId = currentLesson ? getYouTubeVideoId(currentLesson.youtube_url) : null

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Video Player */}
            <Card>
              <CardContent className="p-0">
                {videoId ? (
                  <div className="aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title={currentLesson.title}
                      className="w-full h-full rounded-t-lg"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center rounded-t-lg">
                    <div className="text-center">
                      <Play className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No video available</p>
                    </div>
                  </div>
                )}

                <div className="p-6">
                  <h1 className="text-2xl font-bold mb-2">{currentLesson?.title || course.title}</h1>
                  <p className="text-muted-foreground mb-4">{currentLesson?.description || course.description}</p>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Play className="h-4 w-4" />
                      Lesson {currentLessonIndex + 1} of {course.lessons.length}
                    </div>
                    {currentLesson?.duration_minutes && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {currentLesson.duration_minutes} min
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Course Info */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{course.title}</CardTitle>
                    <CardDescription className="mt-2">{course.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{course.difficulty}</Badge>
                    <Badge variant="outline">{course.category}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={creatorProfile?.avatar_url || "/placeholder.svg"} />
                    <AvatarFallback>
                      {creatorProfile?.display_name?.[0] || course.creator_wallet.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {creatorProfile?.display_name ||
                          `${course.creator_wallet.slice(0, 6)}...${course.creator_wallet.slice(-4)}`}
                      </p>
                      {creatorProfile?.is_verified && <VerifiedBadge />}
                    </div>
                    {creatorProfile?.twitter_handle && (
                      <a
                        href={`https://twitter.com/${creatorProfile.twitter_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        @{creatorProfile.twitter_handle}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{course.lessons.length}</p>
                    <p className="text-sm text-muted-foreground">Lessons</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{course.estimated_duration}h</p>
                    <p className="text-sm text-muted-foreground">Duration</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{course.is_free ? "Free" : `$${course.price}`}</p>
                    <p className="text-sm text-muted-foreground">Price</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lessons List */}
            <Card>
              <CardHeader>
                <CardTitle>Course Content</CardTitle>
                <CardDescription>{course.lessons.length} lessons</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {course.lessons.map((lesson, index) => (
                    <div
                      key={lesson.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        index === currentLessonIndex ? "bg-primary/10 border-primary" : "hover:bg-muted"
                      }`}
                      onClick={() => setCurrentLessonIndex(index)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            index === currentLessonIndex
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{lesson.title}</h4>
                          {lesson.description && <p className="text-sm text-muted-foreground">{lesson.description}</p>}
                        </div>
                        {lesson.duration_minutes && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {lesson.duration_minutes}m
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Support Creator */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  Support Creator
                </CardTitle>
                <CardDescription>Show your appreciation with TUT tokens</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="donation-amount">Amount (TUT)</Label>
                  <Input
                    id="donation-amount"
                    type="number"
                    placeholder="Enter amount"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>

                {isConnected ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Your balance: {balance || "0"} TUT</p>
                    {!isBNBChain() ? (
                      <p className="text-sm text-orange-600">Please switch to BNB Smart Chain to donate</p>
                    ) : null}
                    <Button
                      onClick={handleDonate}
                      disabled={isDonating || !donationAmount || !isBNBChain()}
                      className="w-full"
                    >
                      {isDonating ? "Processing..." : "Donate"}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Connect your wallet to donate</p>
                )}
              </CardContent>
            </Card>

            {/* Donation Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  Donation Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{Number.parseFloat(donationStats.totalAmount).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Total TUT</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{donationStats.donorCount}</p>
                    <p className="text-sm text-muted-foreground">Supporters</p>
                  </div>
                </div>

                {donationStats.donations.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">Recent Supporters</h4>
                      <div className="space-y-2">
                        {donationStats.donations.slice(0, 5).map((donation) => (
                          <div key={donation.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {donation.donor_wallet.slice(0, 6)}...{donation.donor_wallet.slice(-4)}
                            </span>
                            <span className="font-medium">{Number.parseFloat(donation.amount).toFixed(2)} TUT</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
