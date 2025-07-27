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
import { WalletAuth } from "@/lib/wallet-auth"
import { Heart, Coins, Play, BookOpen, User, Info, Wallet } from "@phosphor-icons/react"

const TUT_TOKEN_ADDRESS = "0xCAAE2A2F939F51d97CdFa9A86e79e3F085b799f3"
const BNB_CHAIN_ID = "0x38" // BSC Mainnet
const BNB_CHAIN_ID_DECIMAL = 56

// Preset donation amounts
const PRESET_AMOUNTS = [100, 1000, 10000]

type CourseWithLessons = Course & {
  lessons: Lesson[]
}

type CourseWithCreatorProfile = CourseWithLessons & {
  creator_profile?: UserProfile | null
}

// Helper function to convert token amount to wei safely
const tokenToWei = (tokenAmount: string): bigint => {
  // Remove any non-numeric characters except decimal point
  const cleanAmount = tokenAmount.replace(/[^0-9.]/g, "")

  // Split by decimal point
  const [integerPart = "0", decimalPart = ""] = cleanAmount.split(".")

  // Pad or truncate decimal part to 18 digits
  const paddedDecimal = decimalPart.padEnd(18, "0").slice(0, 18)

  // Combine and convert to BigInt
  const weiString = integerPart + paddedDecimal

  return BigInt(weiString)
}

// Helper function to convert wei to token amount safely
const weiToToken = (weiAmount: bigint): string => {
  const weiString = weiAmount.toString()
  const paddedWei = weiString.padStart(19, "0") // Ensure at least 19 digits for proper decimal placement

  const integerPart = paddedWei.slice(0, -18) || "0"
  const decimalPart = paddedWei.slice(-18)

  // Remove trailing zeros from decimal part
  const trimmedDecimal = decimalPart.replace(/0+$/, "")

  if (trimmedDecimal === "") {
    return integerPart
  }

  return `${integerPart}.${trimmedDecimal}`
}

// Helper function to check if we're on BNB Chain
const isBNBChain = (chainId: number | string | null): boolean => {
  if (!chainId) return false

  // Handle both hex string and decimal number formats
  if (typeof chainId === "string") {
    // If it's a hex string, convert to decimal
    const decimal = chainId.startsWith("0x") ? Number.parseInt(chainId, 16) : Number.parseInt(chainId, 10)
    return decimal === BNB_CHAIN_ID_DECIMAL
  }

  // If it's already a number, compare directly
  return chainId === BNB_CHAIN_ID_DECIMAL
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
  const [tutBalance, setTutBalance] = useState<string>("0")
  const [isCheckingBalance, setIsCheckingBalance] = useState(false)
  const { account, isConnected, chainId } = useWeb3()

  // Detect mobile device and screen size
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768
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

  // Check TUT balance when account or chain changes
  useEffect(() => {
    if (account && isConnected && isBNBChain(chainId)) {
      checkTutBalance()
    } else {
      setTutBalance("0")
    }
  }, [account, isConnected, chainId])

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
    return window.ethereum
  }

  const checkTutBalance = async () => {
    if (!account || !isConnected || !isBNBChain(chainId)) {
      setTutBalance("0")
      return
    }

    setIsCheckingBalance(true)
    try {
      const provider = getWalletProvider()
      if (!provider) {
        throw new Error("No wallet provider found")
      }

      // ERC-20 balanceOf function signature: balanceOf(address)
      const balanceOfData = `0x70a08231000000000000000000000000${account.slice(2).toLowerCase().padStart(40, "0")}`

      const result = await provider.request({
        method: "eth_call",
        params: [
          {
            to: TUT_TOKEN_ADDRESS,
            data: balanceOfData,
          },
          "latest",
        ],
      })

      // Convert hex result to decimal and then to tokens (18 decimals)
      const balanceWei = BigInt(result as string)
      const balanceTokens = weiToToken(balanceWei)
      setTutBalance(balanceTokens)
    } catch (error) {
      console.error("Error checking TUT balance:", error)
      setTutBalance("0")
    } finally {
      setIsCheckingBalance(false)
    }
  }

  const switchToBNBChain = async () => {
    try {
      const provider = getWalletProvider()
      if (!provider) {
        throw new Error("No wallet provider found")
      }

      // Check if already on BNB Chain
      if (isBNBChain(chainId)) {
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
                  rpcUrls: ["https://bsc-dataseed1.binance.org/", "https://bsc-dataseed2.binance.org/"],
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

  const validateDonation = () => {
    if (!isConnected || !account || !course) {
      throw new Error("Wallet not connected")
    }

    if (!isBNBChain(chainId)) {
      throw new Error("Please switch to BNB Smart Chain")
    }

    if (!donationAmount || Number.parseFloat(donationAmount) <= 0) {
      throw new Error("Please enter a valid donation amount")
    }

    const donationAmountNum = Number.parseFloat(donationAmount)
    const balanceNum = Number.parseFloat(tutBalance)

    if (donationAmountNum > balanceNum) {
      throw new Error(`Insufficient TUT balance. You have ${tutBalance} TUT`)
    }

    if (!course.creator_wallet || course.creator_wallet.length !== 42) {
      throw new Error("Invalid creator wallet address")
    }

    return donationAmountNum
  }

  const saveDonationToDatabase = async (txHash: string) => {
    try {
      // Get current session
      const session = WalletAuth.getSession()
      if (!session) {
        console.warn("No session found, donation saved to blockchain but not database")
        return
      }

      // Create donation record using server action
      const response = await fetch("/api/donations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          course_id: courseId,
          donor_wallet: account!.toLowerCase(),
          amount: donationAmount,
          tx_hash: txHash,
          session: session,
        }),
      })

      if (!response.ok) {
        console.error("Failed to save donation to database:", await response.text())
      } else {
        console.log("Donation saved to database successfully")
        // Refresh donations list
        fetchDonations()
      }
    } catch (error) {
      console.error("Error saving donation to database:", error)
    }
  }

  const handleDonate = async () => {
    setIsDonating(true)

    try {
      // Validate donation
      const donationAmountNum = validateDonation()

      const provider = getWalletProvider()
      if (!provider) {
        throw new Error("No wallet provider found. Please install a Web3 wallet.")
      }

      // Ensure we're on BNB Chain
      await switchToBNBChain()

      // Wait for chain switch to complete
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Verify we're on the correct chain after switch
      const currentChainId = await provider.request({ method: "eth_chainId" })
      if (!isBNBChain(currentChainId)) {
        throw new Error("Failed to switch to BNB Smart Chain")
      }

      // Calculate amount in wei with proper precision using our helper function
      const amountInWei = tokenToWei(donationAmount)

      // Prepare transfer data - FIXED: Proper address encoding
      const recipientAddress = course!.creator_wallet.toLowerCase()

      // Validate recipient address format
      if (!recipientAddress.startsWith("0x") || recipientAddress.length !== 42) {
        throw new Error("Invalid recipient address format")
      }

      // Remove 0x prefix and ensure it's exactly 40 characters (20 bytes)
      const recipientAddressClean = recipientAddress.slice(2).toLowerCase()
      if (recipientAddressClean.length !== 40) {
        throw new Error("Invalid recipient address length")
      }

      // Pad recipient address to 32 bytes (64 hex characters) for ABI encoding
      const recipientHex = recipientAddressClean.padStart(64, "0")

      // Convert amount to hex and pad to 32 bytes (64 hex characters)
      const amountHex = amountInWei.toString(16).padStart(64, "0")

      // ERC-20 transfer function signature: transfer(address,uint256)
      // Function selector: 0xa9059cbb
      const transferData = `0xa9059cbb${recipientHex}${amountHex}`

      console.log("Donation transaction details:", {
        from: account,
        to: TUT_TOKEN_ADDRESS,
        amount: donationAmount,
        amountInWei: amountInWei.toString(),
        recipient: recipientAddress,
        recipientHex: recipientHex,
        amountHex: amountHex,
        data: transferData,
      })

      // Verify the encoded recipient address
      const decodedRecipient = "0x" + recipientHex.slice(-40)
      console.log("Decoded recipient address:", decodedRecipient)
      console.log("Original recipient address:", recipientAddress)

      if (decodedRecipient.toLowerCase() !== recipientAddress.toLowerCase()) {
        throw new Error("Address encoding verification failed")
      }

      // Send transaction
      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: TUT_TOKEN_ADDRESS,
            data: transferData,
            // leave gas undefined – wallet will estimate
          },
        ],
      })

      console.log("Transaction sent successfully:", txHash)

      // Save donation to database
      await saveDonationToDatabase(txHash)

      toast({
        title: "Donation successful! 🎉",
        description: `Successfully donated ${donationAmount} TUT tokens to ${course!.creator_profile?.display_name || "creator"}`,
      })

      // Reset form
      setDonationAmount("")
      setSelectedPreset(null)
      setShowDonationForm(false)

      // Refresh data
      checkTutBalance()
    } catch (error: any) {
      console.error("Donation error:", error)

      let errorMessage = "Transaction failed. Please try again."

      if (error.code === 4001) {
        errorMessage = "Transaction was rejected by user"
      } else if (error.code === -32603) {
        errorMessage = "Internal wallet error. Please try again."
      } else if (error.code === -32000) {
        errorMessage = "Insufficient funds for gas fee"
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient TUT tokens or BNB for gas"
      } else if (error.message?.includes("execution reverted")) {
        errorMessage = "Transaction failed. Check your TUT balance and try again."
      } else if (error.message?.includes("No wallet provider")) {
        errorMessage = "Please install a Web3 wallet like MetaMask"
      } else if (error.message?.includes("switch to BNB")) {
        errorMessage = "Please switch to BNB Smart Chain network"
      } else if (error.message?.includes("Invalid recipient")) {
        errorMessage = "Invalid creator wallet address"
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
    // Match regular YouTube videos
    let match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`
    }

    // Match YouTube Shorts
    match = url.match(/youtube\.com\/shorts\/([^&\n?#]+)/)
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`
    }

    return null
  }

  const getYouTubeThumbnail = (url: string) => {
    // Match regular YouTube videos
    let match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    if (match) {
      // Try maxresdefault first, fallback to hqdefault if not available
      return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
    }

    // Match YouTube Shorts
    match = url.match(/youtube\.com\/shorts\/([^&\n?#]+)/)
    if (match) {
      // For Shorts, use hqdefault as maxresdefault often doesn't exist
      return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
    }

    return "/placeholder.svg?height=180&width=320"
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
  const isOnCorrectChain = isBNBChain(chainId)
  const hasInsufficientBalance = Number.parseFloat(donationAmount) > Number.parseFloat(tutBalance)

  // Debug logging
  console.log("Chain ID from context:", chainId, typeof chainId)
  console.log("Is on correct chain:", isOnCorrectChain)
  console.log("BNB Chain ID (hex):", BNB_CHAIN_ID)
  console.log("BNB Chain ID (decimal):", BNB_CHAIN_ID_DECIMAL)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
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
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="text-center py-12">
              <BookOpen size={48} className="text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3">Course not found</h3>
              <p className="text-muted-foreground">The course you're looking for doesn't exist or has been removed.</p>
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
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Video Player */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {embedUrl ? (
                  <iframe src={embedUrl} title={currentLesson.title} className="w-full aspect-video" allowFullScreen />
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <div className="text-center">
                      <Play size={48} className="text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No lessons available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Course Info */}
            <Card>
              <CardContent className="p-6">
                <h1 className="text-2xl font-bold mb-4">{course.title}</h1>

                {currentLesson && (
                  <div className="mb-4">
                    <Badge variant="secondary" className="mb-2">
                      Lesson {currentLessonIndex + 1} of {course.lessons.length}
                    </Badge>
                    <h2 className="text-lg font-semibold">{currentLesson.title}</h2>
                  </div>
                )}

                {/* Creator Info */}
                <Link
                  href={`/creator/${course.creator_wallet}`}
                  className="flex items-center hover:text-brand-primary transition-colors group mb-4"
                >
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={getCreatorAvatar() || "/placeholder.svg"} alt="Creator" />
                    <AvatarFallback className="bg-muted font-medium">{getCreatorAvatarFallback()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <span className="font-medium group-hover:underline block">{getCreatorDisplayName()}</span>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <BookOpen size={14} className="mr-1" />
                      <span>
                        {course.lessons.length} lesson{course.lessons.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  {course.creator_profile?.is_verified && (
                    <VerifiedBadge isVerified={true} size="sm" className="ml-2" />
                  )}
                </Link>

                {/* Course Description */}
                {course.description && (
                  <p className="text-muted-foreground leading-relaxed mb-4">{course.description}</p>
                )}

                {/* Current Lesson Description */}
                {currentLesson?.description && (
                  <div className="bg-accent p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">About this lesson:</h3>
                    <p className="text-muted-foreground leading-relaxed text-sm">{currentLesson.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lesson Navigation */}
            {course.lessons.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Course Lessons</CardTitle>
                  <CardDescription>{course.lessons.length} lessons • Click to jump to any lesson</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {course.lessons.map((lesson, index) => (
                      <button
                        key={lesson.id}
                        onClick={() => setCurrentLessonIndex(index)}
                        className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${
                          index === currentLessonIndex
                            ? "bg-accent border-brand-primary shadow-sm"
                            : "hover:bg-accent border-border hover:border-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                                index === currentLessonIndex
                                  ? "bg-brand-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {index + 1}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold mb-1 truncate">{lesson.title}</div>
                            {lesson.description && (
                              <div className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                {lesson.description}
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            <Play
                              size={20}
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
          <div className="space-y-6">
            {/* Support Creator Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Heart size={20} className="mr-2 text-red-500" weight="fill" />
                  Support Creator
                  {course.creator_profile?.is_verified && (
                    <VerifiedBadge isVerified={true} size="sm" className="ml-2" />
                  )}
                </CardTitle>
                <CardDescription>Donate TUT tokens to show appreciation for this course</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Connection Status */}
                {!isConnected && (
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <Wallet size={24} className="mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-3">Connect your wallet to support this creator</p>
                    <Button onClick={() => window.location.reload()} variant="outline" size="sm" className="w-full">
                      Connect Wallet
                    </Button>
                  </div>
                )}

                {/* Wrong Chain Warning */}
                {isConnected && !isOnCorrectChain && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                      Please switch to BNB Smart Chain to donate
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                      Current chain: {chainId} (Expected: {BNB_CHAIN_ID_DECIMAL})
                    </p>
                    <Button onClick={switchToBNBChain} variant="outline" size="sm" className="w-full bg-transparent">
                      Switch to BNB Chain
                    </Button>
                  </div>
                )}

                {/* Donation Form */}
                {isConnected && isOnCorrectChain && (
                  <>
                    {/* Balance Display */}
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Your TUT Balance:</span>
                        <span className="font-bold">
                          {isCheckingBalance ? "Loading..." : `${Number.parseFloat(tutBalance).toFixed(5)} TUT`}
                        </span>
                      </div>
                    </div>

                    {/* Custom Amount Input */}
                    <div className="space-y-2">
                      <Label htmlFor="donation-amount" className="text-sm font-medium">
                        Custom Amount (TUT)
                      </Label>
                      <Input
                        id="donation-amount"
                        type="number"
                        step="0.00001"
                        min="0"
                        max={tutBalance}
                        value={donationAmount}
                        onChange={(e) => handleCustomAmountChange(e.target.value)}
                        placeholder="Enter amount"
                        className={`${
                          hasInsufficientBalance && donationAmount ? "border-red-500 focus:border-red-500" : ""
                        }`}
                      />
                      {hasInsufficientBalance && donationAmount && (
                        <p className="text-sm text-red-500">Insufficient balance</p>
                      )}
                    </div>

                    {/* Preset Amount Buttons */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Quick Amounts (TUT)</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {PRESET_AMOUNTS.map((amount) => (
                          <Button
                            key={amount}
                            type="button"
                            variant={selectedPreset === amount ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePresetSelect(amount)}
                            className={`${
                              selectedPreset === amount
                                ? "bg-brand-primary hover:bg-brand-secondary text-primary-foreground"
                                : ""
                            }`}
                          >
                            {amount.toLocaleString()}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Donate Button */}
                    <Button
                      onClick={handleDonate}
                      className="w-full bg-brand-primary hover:bg-brand-secondary text-primary-foreground"
                      disabled={
                        isDonating ||
                        !donationAmount ||
                        Number.parseFloat(donationAmount) <= 0 ||
                        hasInsufficientBalance
                      }
                    >
                      <Coins size={16} className="mr-2" weight="fill" />
                      {isDonating ? "Processing..." : "Donate TUT"}
                    </Button>

                    {/* Transaction Info */}
                    <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
                      <div className="flex items-center gap-2 mb-2">
                        <Info size={14} />
                        <span className="font-medium">Transaction Details</span>
                      </div>
                      <p className="mb-1">
                        <strong>Recipient:</strong> {course.creator_wallet.slice(0, 8)}...
                        {course.creator_wallet.slice(-6)}
                      </p>
                      <p>
                        <strong>Network:</strong> BNB Smart Chain (BSC)
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Donation Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Donation Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Total Donations:</span>
                    <span className="font-bold text-lg">{totalDonations.toFixed(2)} TUT</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Supporters:</span>
                    <span className="font-bold text-lg">{donations.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Donations */}
            {donations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Donations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {donations.slice(0, 10).map((donation) => (
                      <div key={donation.id} className="flex justify-between items-center p-3 bg-accent rounded-lg">
                        <div className="flex items-center">
                          <User size={16} className="text-muted-foreground mr-2" />
                          <span className="text-sm font-medium">
                            {donation.donor_wallet.slice(0, 6)}...{donation.donor_wallet.slice(-4)}
                          </span>
                        </div>
                        <span className="font-bold">{donation.amount} TUT</span>
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
