"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { VerifiedBadge } from "@/components/verified-badge"
import { supabase, type Course, type Lesson, type Donation, type UserProfile } from "@/lib/supabase"
import { useWeb3 } from "@/contexts/web3-context"
import { toast } from "@/hooks/use-toast"
import { Heart, Coins, Play, BookOpen, User } from "@phosphor-icons/react"

const TUT_TOKEN_ADDRESS = "0xCAAE2A2F939F51d97CdFa9A86e79e3F085b799f3"
const BNB_CHAIN_ID = "0x38" // BSC Mainnet

// Preset donation amounts
const PRESET_AMOUNTS = [100, 500, 2000, 10000]

type CourseWithLessons = Course & {
  lessons: Lesson[]
}

type CourseWithCreatorProfile = CourseWithLessons & {
  creator_profile?: UserProfile | null
}

export default function CoursePage() {
  const params = useParams()
  const courseId = params.id as string
  const [course, setCourse] = useState<CourseWithCreatorProfile | null>(null)
  const [donations, setDonations] = useState<Donation[]>([])
  const [donationAmount, setDonationAmount] = useState("")
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isDonating, setIsDonating] = useState(false)
  const { account, isConnected } = useWeb3()

  useEffect(() => {
    if (courseId) {
      fetchCourse()
      fetchDonations()
    }
  }, [courseId])

  const fetchCourse = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          lessons (*)
        `)
        .eq("id", courseId)
        .single()

      if (error) {
        throw error
      }

      // Sort lessons by order_index
      if (data.lessons) {
        data.lessons.sort((a: Lesson, b: Lesson) => a.order_index - b.order_index)
      }

      // Fetch creator profile
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("wallet_address", data.creator_wallet.toLowerCase())
          .single()

        if (profileError && profileError.code !== "PGRST116") {
          console.error("Error fetching creator profile:", profileError)
        }

        setCourse({
          ...data,
          creator_profile: profileData || null,
        })
      } catch (error) {
        console.error("Error fetching creator profile:", error)
        setCourse({
          ...data,
          creator_profile: null,
        })
      }
    } catch (error) {
      console.error("Error fetching course:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDonations = async () => {
    try {
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      setDonations(data || [])
    } catch (error) {
      console.error("Error fetching donations:", error)
    }
  }

  const switchToBNBChain = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BNB_CHAIN_ID }],
      })
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: BNB_CHAIN_ID,
                chainName: "BNB Smart Chain",
                nativeCurrency: {
                  name: "BNB",
                  symbol: "BNB",
                  decimals: 18,
                },
                rpcUrls: ["https://bsc-dataseed.binance.org/"],
                blockExplorerUrls: ["https://bscscan.com/"],
              },
            ],
          })
        } catch (addError) {
          console.error("Error adding BNB Chain:", addError)
        }
      }
    }
  }

  const handlePresetSelect = (amount: number) => {
    setSelectedPreset(amount)
    setDonationAmount(amount.toString())
  }

  const handleCustomAmountChange = (value: string) => {
    setDonationAmount(value)
    setSelectedPreset(null)
  }

  const handleDonate = async () => {
    if (!isConnected || !account || !course) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to donate",
        variant: "destructive",
      })
      return
    }

    if (!donationAmount || Number.parseFloat(donationAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid donation amount",
        variant: "destructive",
      })
      return
    }

    setIsDonating(true)

    try {
      await switchToBNBChain()

      const amountInWei = (Number.parseFloat(donationAmount) * Math.pow(10, 18)).toString(16)
      const transferData = `0xa9059cbb000000000000000000000000${course.creator_wallet.slice(2)}${amountInWei.padStart(64, "0")}`

      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: TUT_TOKEN_ADDRESS,
            data: transferData,
          },
        ],
      })

      const { error } = await supabase.from("donations").insert([
        {
          course_id: courseId,
          donor_wallet: account,
          amount: donationAmount,
          tx_hash: txHash,
        },
      ])

      if (error) {
        throw error
      }

      toast({
        title: "Donation successful!",
        description: `Thank you for donating ${donationAmount} TUT tokens!`,
      })

      setDonationAmount("")
      setSelectedPreset(null)
      fetchDonations()
    } catch (error) {
      console.error("Error donating:", error)
      toast({
        title: "Donation failed",
        description: "Please try again later",
        variant: "destructive",
      })
    } finally {
      setIsDonating(false)
    }
  }

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    return match ? `https://www.youtube.com/embed/${match[1]}` : null
  }

  const getCreatorDisplayName = () => {
    if (course?.creator_profile?.display_name) {
      return course.creator_profile.display_name
    }
    return course ? `${course.creator_wallet.slice(0, 6)}...${course.creator_wallet.slice(-4)}` : ""
  }

  const getCreatorAvatar = () => {
    return course?.creator_profile?.avatar_url || ""
  }

  const getCreatorAvatarFallback = () => {
    if (course?.creator_profile?.display_name) {
      return course.creator_profile.display_name.charAt(0).toUpperCase()
    }
    return course ? course.creator_wallet.charAt(2).toUpperCase() : "U"
  }

  const totalDonations = donations.reduce((sum, donation) => sum + Number.parseFloat(donation.amount), 0)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="aspect-video bg-muted rounded-lg mb-6"></div>
            <div className="h-6 bg-muted rounded w-3/4 mb-3"></div>
            <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
            <div className="h-24 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="max-w-2xl mx-auto border border-border bg-card">
            <CardContent className="text-center py-12 px-6">
              <BookOpen size={48} className="text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-3">Course not found</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                The course you're looking for doesn't exist or has been removed.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const currentLesson = course.lessons[currentLessonIndex]
  const embedUrl = currentLesson ? getYouTubeEmbedUrl(currentLesson.youtube_url) : null

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Video Player */}
            <Card className="mb-6 border border-border bg-card shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {embedUrl ? (
                  <iframe src={embedUrl} title={currentLesson.title} className="w-full aspect-video" allowFullScreen />
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <div className="text-center">
                      <Play size={48} className="text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">No lessons available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Course Info */}
            <Card className="mb-6 border border-border bg-card shadow-sm">
              <CardContent className="p-4">
                {currentLesson && (
                  <h2 className="text-sm text-muted-foreground mb-3 font-medium">
                    Lesson {currentLessonIndex + 1}: {currentLesson.title}
                  </h2>
                )}
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-3">
                  <Link
                    href={`/creator/${course.creator_wallet}`}
                    className="flex items-center hover:text-brand-primary transition-colors group"
                  >
                    <Avatar className="h-5 w-5 mr-2">
                      <AvatarImage src={getCreatorAvatar() || "/placeholder.svg"} alt="Creator" />
                      <AvatarFallback className="text-xs bg-muted font-medium">
                        {getCreatorAvatarFallback()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="group-hover:underline font-medium">Creator: {getCreatorDisplayName()}</span>
                    {course.creator_profile?.is_verified && (
                      <VerifiedBadge isVerified={true} size="sm" className="ml-1" />
                    )}
                  </Link>
                  <div className="flex items-center">
                    <BookOpen size={12} className="mr-1" />
                    <span className="font-medium">
                      {course.lessons.length} lesson{course.lessons.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                {course.description && (
                  <p className="text-muted-foreground leading-relaxed mb-3 text-sm">{course.description}</p>
                )}
                {currentLesson?.description && (
                  <div className="bg-accent p-3 rounded-lg border border-border">
                    <h3 className="font-semibold text-foreground mb-2 text-sm">About this lesson:</h3>
                    <p className="text-muted-foreground leading-relaxed text-xs">{currentLesson.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lesson Navigation - Compact Grid */}
            {course.lessons.length > 1 && (
              <Card className="border border-border bg-card shadow-sm">
                <CardHeader className="p-4 pb-3">
                  <CardTitle className="text-lg text-foreground">Course Lessons</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    {course.lessons.length} lessons • Click to jump to any lesson
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="grid gap-2 max-h-96 overflow-y-auto">
                    {course.lessons.map((lesson, index) => (
                      <button
                        key={lesson.id}
                        onClick={() => setCurrentLessonIndex(index)}
                        className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                          index === currentLessonIndex
                            ? "bg-accent border-brand-primary shadow-sm"
                            : "hover:bg-accent border-border hover:border-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                                index === currentLessonIndex
                                  ? "bg-brand-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {index + 1}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-foreground text-sm mb-1 truncate">{lesson.title}</div>
                            {lesson.description && (
                              <div className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                                {lesson.description}
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            <Play
                              size={14}
                              className={`${
                                index === currentLessonIndex ? "text-brand-primary" : "text-muted-foreground"
                              }`}
                              weight="fill"
                            />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Support Creator */}
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="flex items-center text-sm text-foreground">
                  <Heart size={16} className="mr-2 text-red-500" weight="fill" />
                  Support Creator
                  {course.creator_profile?.is_verified && (
                    <VerifiedBadge isVerified={true} size="sm" className="ml-2" />
                  )}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                  Donate TUT tokens to show appreciation
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                {/* Preset Amounts */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-foreground">Quick Amounts (TUT)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_AMOUNTS.map((amount) => (
                      <Button
                        key={amount}
                        type="button"
                        variant={selectedPreset === amount ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePresetSelect(amount)}
                        className={`h-8 text-xs font-semibold ${
                          selectedPreset === amount
                            ? "bg-brand-primary hover:bg-brand-secondary text-primary-foreground"
                            : "border border-border hover:bg-accent"
                        }`}
                      >
                        {amount.toLocaleString()}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom Amount */}
                <div className="space-y-2">
                  <Label htmlFor="custom-amount" className="text-xs font-medium text-foreground">
                    Custom Amount (TUT)
                  </Label>
                  <Input
                    id="custom-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={donationAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    placeholder="Enter amount"
                    className="h-8 text-xs border border-border focus:border-brand-primary bg-background"
                  />
                </div>

                <Button
                  onClick={handleDonate}
                  className="w-full h-8 text-xs font-semibold bg-brand-primary hover:bg-brand-secondary text-primary-foreground"
                  disabled={!isConnected || isDonating}
                >
                  <Coins size={14} className="mr-2" weight="fill" />
                  {isDonating ? "Donating..." : "Donate TUT"}
                </Button>
                {!isConnected && (
                  <p className="text-xs text-muted-foreground text-center leading-relaxed">Connect wallet to donate</p>
                )}
              </CardContent>
            </Card>

            {/* Donation Stats */}
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-sm text-foreground">Donation Stats</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium text-xs">Total Donations:</span>
                    <span className="font-bold text-sm text-foreground">{totalDonations.toFixed(2)} TUT</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium text-xs">Supporters:</span>
                    <span className="font-bold text-sm text-foreground">{donations.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Donations */}
            {donations.length > 0 && (
              <Card className="border border-border bg-card shadow-sm">
                <CardHeader className="p-4 pb-3">
                  <CardTitle className="text-sm text-foreground">Recent Donations</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {donations.slice(0, 10).map((donation) => (
                      <div
                        key={donation.id}
                        className="flex justify-between items-center p-2 bg-accent rounded text-xs"
                      >
                        <div className="flex items-center">
                          <User size={12} className="text-muted-foreground mr-1" />
                          <span className="text-muted-foreground font-medium">
                            {donation.donor_wallet.slice(0, 6)}...{donation.donor_wallet.slice(-4)}
                          </span>
                        </div>
                        <span className="font-bold text-foreground">{donation.amount} TUT</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
