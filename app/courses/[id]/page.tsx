"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { VerifiedBadge } from "@/components/verified-badge"
import { supabase, type Course, type Lesson, type Donation, type UserProfile } from "@/lib/supabase"
import { useWeb3 } from "@/contexts/web3-context"
import { toast } from "@/hooks/use-toast"
import {
  Heart,
  Coins,
  Play,
  BookOpen,
  User,
  Warning,
  CheckCircle,
  CaretDown,
  CaretUp,
  List,
  SquaresFour,
} from "@phosphor-icons/react"

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
  const [isMobile, setIsMobile] = useState(false)
  const [showLessonList, setShowLessonList] = useState(false)
  const [showDonationForm, setShowDonationForm] = useState(false)
  const [lessonListView, setLessonListView] = useState<"list" | "grid">("list")
  const { account, isConnected, chainId } = useWeb3()

  // Detect mobile device and screen size
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice =
        window.innerWidth < 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      setIsMobile(isMobileDevice)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

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

  const getWalletProvider = () => {
    if (typeof window === "undefined") return null

    // Check for mobile wallet apps
    if (isMobile) {
      // Trust Wallet
      if (window.ethereum?.isTrust) return window.ethereum
      // MetaMask Mobile
      if (window.ethereum?.isMetaMask) return window.ethereum
      // Coinbase Wallet
      if (window.ethereum?.isCoinbaseWallet) return window.ethereum
      // Generic mobile wallet
      if (window.ethereum) return window.ethereum
    }

    // Desktop wallets
    return window.ethereum
  }

  const switchToBNBChain = async () => {
    try {
      const provider = getWalletProvider()
      if (!provider) {
        throw new Error("No wallet provider found")
      }

      // Check if already on BNB Chain
      if (chainId === BNB_CHAIN_ID) {
        return true
      }

      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: BNB_CHAIN_ID }],
        })
        return true
      } catch (switchError: any) {
        // Chain not added to wallet
        if (switchError.code === 4902) {
          try {
            await provider.request({
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
            return true
          } catch (addError) {
            console.error("Error adding BNB Chain:", addError)
            throw new Error("Failed to add BNB Smart Chain to wallet")
          }
        }
        throw switchError
      }
    } catch (error) {
      console.error("Error switching to BNB Chain:", error)
      throw error
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
      const provider = getWalletProvider()
      if (!provider) {
        throw new Error("No wallet provider found. Please install a Web3 wallet.")
      }

      // Switch to BNB Chain
      await switchToBNBChain()

      // Wait a moment for chain switch to complete
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Calculate amount in wei (TUT has 18 decimals)
      const amountInTokens = Number.parseFloat(donationAmount)
      const amountInWei = BigInt(Math.floor(amountInTokens * Math.pow(10, 18)))

      // Convert to hex string
      const amountHex = "0x" + amountInWei.toString(16).padStart(64, "0")
      const recipientHex = course.creator_wallet.slice(2).toLowerCase().padStart(64, "0")

      // ERC-20 transfer function signature: transfer(address,uint256)
      const transferData = `0xa9059cbb000000000000000000000000${recipientHex}${amountHex.slice(2)}`

      console.log("Donation details:", {
        amount: donationAmount,
        amountInWei: amountInWei.toString(),
        recipient: course.creator_wallet,
        data: transferData,
      })

      // Send transaction
      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: TUT_TOKEN_ADDRESS,
            data: transferData,
            gas: "0x15F90", // 90000 gas limit
          },
        ],
      })

      console.log("Transaction sent:", txHash)

      // Save donation to database
      const { error } = await supabase.from("donations").insert([
        {
          course_id: courseId,
          donor_wallet: account.toLowerCase(),
          amount: donationAmount,
          tx_hash: txHash,
        },
      ])

      if (error) {
        console.error("Database error:", error)
        // Don't throw here, transaction was successful
      }

      toast({
        title: "Donation successful!",
        description: `Thank you for donating ${donationAmount} TUT tokens!`,
      })

      setDonationAmount("")
      setSelectedPreset(null)
      setShowDonationForm(false)
      fetchDonations()
    } catch (error: any) {
      console.error("Error donating:", error)

      let errorMessage = "Please try again later"

      if (error.code === 4001) {
        errorMessage = "Transaction was rejected by user"
      } else if (error.code === -32603) {
        errorMessage = "Internal wallet error. Please try again."
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for transaction"
      } else if (error.message?.includes("No wallet provider")) {
        errorMessage = "Please install a Web3 wallet like MetaMask"
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "Donation failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsDonating(false)
    }
  }

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    return match ? `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1` : null
  }

  const getYouTubeThumbnail = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    return match ? `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg` : "/placeholder.svg?height=180&width=320"
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
  const isOnCorrectChain = chainId === BNB_CHAIN_ID

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="animate-pulse space-y-4">
            <div className="aspect-video bg-muted rounded-lg"></div>
            <div className="h-6 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          <Card className="max-w-2xl mx-auto border border-border bg-card">
            <CardContent className="text-center py-8 sm:py-12 px-4 sm:px-6">
              <BookOpen size={isMobile ? 40 : 48} className="text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Course not found</h3>
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
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Mobile Layout */}
        {isMobile ? (
          <div className="space-y-4">
            {/* Video Player - Full Width on Mobile */}
            <Card className="border border-border bg-card shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {embedUrl ? (
                  <div className="relative">
                    <iframe
                      src={embedUrl}
                      title={currentLesson.title}
                      className="w-full aspect-video"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <div className="text-center">
                      <Play size={40} className="text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">No lessons available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Course Title and Info - Mobile Optimized */}
            <Card className="border border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <h1 className="text-lg font-bold text-foreground mb-2 line-clamp-2">{course.title}</h1>

                {currentLesson && (
                  <div className="mb-3">
                    <Badge variant="secondary" className="text-xs">
                      Lesson {currentLessonIndex + 1} of {course.lessons.length}
                    </Badge>
                    <h2 className="text-sm font-medium text-foreground mt-1 line-clamp-1">{currentLesson.title}</h2>
                  </div>
                )}

                {/* Creator Info - Mobile Optimized */}
                <Link
                  href={`/creator/${course.creator_wallet}`}
                  className="flex items-center hover:text-brand-primary transition-colors group mb-3"
                >
                  <Avatar className="h-8 w-8 mr-3">
                    <AvatarImage src={getCreatorAvatar() || "/placeholder.svg"} alt="Creator" />
                    <AvatarFallback className="text-xs bg-muted font-medium">
                      {getCreatorAvatarFallback()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium group-hover:underline block truncate">
                      {getCreatorDisplayName()}
                    </span>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <BookOpen size={10} className="mr-1" />
                      <span>
                        {course.lessons.length} lesson{course.lessons.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  {course.creator_profile?.is_verified && (
                    <VerifiedBadge isVerified={true} size="sm" className="ml-2" />
                  )}
                </Link>

                {/* Course Description - Collapsible on Mobile */}
                {course.description && (
                  <div className="mb-3">
                    <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">{course.description}</p>
                  </div>
                )}

                {/* Current Lesson Description */}
                {currentLesson?.description && (
                  <div className="bg-accent p-3 rounded-lg border border-border">
                    <h3 className="font-semibold text-foreground mb-2 text-sm">About this lesson:</h3>
                    <p className="text-muted-foreground leading-relaxed text-xs line-clamp-3">
                      {currentLesson.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mobile Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              {/* Lesson List Toggle */}
              {course.lessons.length > 1 && (
                <Button
                  onClick={() => setShowLessonList(!showLessonList)}
                  variant="outline"
                  className="h-12 text-sm font-medium"
                >
                  <List size={16} className="mr-2" />
                  Lessons ({course.lessons.length})
                  {showLessonList ? <CaretUp size={16} className="ml-2" /> : <CaretDown size={16} className="ml-2" />}
                </Button>
              )}

              {/* Donation Toggle */}
              <Button
                onClick={() => setShowDonationForm(!showDonationForm)}
                variant="outline"
                className="h-12 text-sm font-medium"
              >
                <Heart size={16} className="mr-2 text-red-500" weight="fill" />
                Support
                {showDonationForm ? <CaretUp size={16} className="ml-2" /> : <CaretDown size={16} className="ml-2" />}
              </Button>
            </div>

            {/* Expandable Lesson List - Mobile */}
            {showLessonList && course.lessons.length > 1 && (
              <Card className="border border-border bg-card shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-foreground">Course Lessons</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLessonListView("list")}
                        className={lessonListView === "list" ? "bg-accent" : ""}
                      >
                        <List size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLessonListView("grid")}
                        className={lessonListView === "grid" ? "bg-accent" : ""}
                      >
                        <SquaresFour size={14} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className={lessonListView === "grid" ? "grid grid-cols-2 gap-2" : "space-y-2"}>
                    {course.lessons.map((lesson, index) => (
                      <button
                        key={lesson.id}
                        onClick={() => {
                          setCurrentLessonIndex(index)
                          setShowLessonList(false)
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                          index === currentLessonIndex
                            ? "bg-accent border-brand-primary shadow-sm"
                            : "hover:bg-accent border-border hover:border-muted-foreground"
                        }`}
                      >
                        {lessonListView === "grid" ? (
                          <div className="space-y-2">
                            <div className="aspect-video bg-muted rounded overflow-hidden">
                              <img
                                src={getYouTubeThumbnail(lesson.youtube_url) || "/placeholder.svg"}
                                alt={lesson.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-foreground line-clamp-2">
                                {index + 1}. {lesson.title}
                              </div>
                              <Play
                                size={12}
                                className={`${
                                  index === currentLessonIndex ? "text-brand-primary" : "text-muted-foreground"
                                }`}
                                weight="fill"
                              />
                            </div>
                          </div>
                        ) : (
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
                              <div className="font-semibold text-foreground text-sm mb-1 line-clamp-1">
                                {lesson.title}
                              </div>
                              {lesson.description && (
                                <div className="text-xs text-muted-foreground line-clamp-1">{lesson.description}</div>
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
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Expandable Donation Form - Mobile */}
            {showDonationForm && (
              <Card className="border border-border bg-card shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="flex items-center text-base text-foreground">
                    <Heart size={16} className="mr-2 text-red-500" weight="fill" />
                    Support Creator
                    {course.creator_profile?.is_verified && (
                      <VerifiedBadge isVerified={true} size="sm" className="ml-2" />
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Donate TUT tokens to show appreciation
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-4">
                  {/* Network Status */}
                  {isConnected && !isOnCorrectChain && (
                    <div className="p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                        <Warning size={16} />
                        <span className="text-xs font-medium">Switch to BNB Smart Chain</span>
                      </div>
                      <p className="text-xs text-orange-600 dark:text-orange-300 mt-1">
                        Donations require BNB Smart Chain network
                      </p>
                    </div>
                  )}

                  {isConnected && isOnCorrectChain && (
                    <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                        <CheckCircle size={16} weight="fill" />
                        <span className="text-xs font-medium">Ready to donate</span>
                      </div>
                    </div>
                  )}

                  {/* Mobile Wallet Info */}
                  {!isConnected && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                        <Warning size={16} />
                        <span className="text-xs font-medium">Mobile Wallet Required</span>
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                        Install MetaMask, Trust Wallet, or Coinbase Wallet
                      </p>
                    </div>
                  )}

                  {/* Preset Amounts - Mobile Grid */}
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
                          disabled={!isConnected}
                          className={`h-10 text-sm font-semibold ${
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

                  {/* Custom Amount - Mobile Optimized */}
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
                      disabled={!isConnected}
                      className="h-10 text-sm border border-border focus:border-brand-primary bg-background"
                    />
                  </div>

                  <Button
                    onClick={handleDonate}
                    className="w-full h-12 text-sm font-semibold bg-brand-primary hover:bg-brand-secondary text-primary-foreground"
                    disabled={!isConnected || isDonating || !donationAmount || Number.parseFloat(donationAmount) <= 0}
                  >
                    <Coins size={16} className="mr-2" weight="fill" />
                    {isDonating ? "Processing..." : "Donate TUT"}
                  </Button>

                  {!isConnected && (
                    <p className="text-xs text-muted-foreground text-center">Connect mobile wallet to donate</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Donation Stats - Mobile */}
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base text-foreground">Donation Stats</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground">{totalDonations.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">Total TUT</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground">{donations.length}</div>
                    <div className="text-xs text-muted-foreground">Supporters</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Donations - Mobile */}
            {donations.length > 0 && (
              <Card className="border border-border bg-card shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base text-foreground">Recent Donations</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {donations.slice(0, 5).map((donation) => (
                      <div
                        key={donation.id}
                        className="flex justify-between items-center p-2 bg-accent rounded text-xs"
                      >
                        <div className="flex items-center">
                          <User size={12} className="text-muted-foreground mr-2" />
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
        ) : (
          /* Desktop Layout - Unchanged */
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Video Player */}
              <Card className="mb-6 border border-border bg-card shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  {embedUrl ? (
                    <iframe
                      src={embedUrl}
                      title={currentLesson.title}
                      className="w-full aspect-video"
                      allowFullScreen
                    />
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

              {/* Lesson Navigation - Desktop */}
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

            {/* Desktop Sidebar */}
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
                  {/* Network Status */}
                  {isConnected && !isOnCorrectChain && (
                    <div className="p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                        <Warning size={16} />
                        <span className="text-xs font-medium">Switch to BNB Smart Chain</span>
                      </div>
                      <p className="text-xs text-orange-600 dark:text-orange-300 mt-1">
                        Donations require BNB Smart Chain network
                      </p>
                    </div>
                  )}

                  {isConnected && isOnCorrectChain && (
                    <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                        <CheckCircle size={16} weight="fill" />
                        <span className="text-xs font-medium">Ready to donate</span>
                      </div>
                      <p className="text-xs text-green-600 dark:text-green-300 mt-1">Connected to BNB Smart Chain</p>
                    </div>
                  )}

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
                          disabled={!isConnected}
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
                      disabled={!isConnected}
                      className="h-8 text-xs border border-border focus:border-brand-primary bg-background"
                    />
                  </div>

                  <Button
                    onClick={handleDonate}
                    className="w-full h-8 text-xs font-semibold bg-brand-primary hover:bg-brand-secondary text-primary-foreground"
                    disabled={!isConnected || isDonating || !donationAmount || Number.parseFloat(donationAmount) <= 0}
                  >
                    <Coins size={14} className="mr-2" weight="fill" />
                    {isDonating ? "Processing..." : "Donate TUT"}
                  </Button>

                  {!isConnected && (
                    <p className="text-xs text-muted-foreground text-center leading-relaxed">
                      Connect wallet to donate
                    </p>
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
        )}
      </div>
    </div>
  )
}
