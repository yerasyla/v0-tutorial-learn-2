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
import { useSolana } from "@/contexts/solana-context"
import { toast } from "@/hooks/use-toast"
import { SolanaAuth } from "@/lib/solana-auth"
import { Heart, Coins, Play, BookOpen, User, Info, Wallet } from "@phosphor-icons/react"
import { PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from "@solana/web3.js"

const PRESET_AMOUNTS = [0.01, 0.1, 1.0] // SOL amounts

type CourseWithLessons = Course & {
  lessons: Lesson[]
}

type CourseWithCreatorProfile = CourseWithLessons & {
  creator_profile?: UserProfile | null
}

const solToLamports = (sol: number): number => {
  return Math.floor(sol * LAMPORTS_PER_SOL)
}

const lamportsToSol = (lamports: number): number => {
  return lamports / LAMPORTS_PER_SOL
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
  const [solBalance, setSolBalance] = useState<number>(0)
  const [isCheckingBalance, setIsCheckingBalance] = useState(false)
  const { address, isConnected, connection, publicKey } = useSolana()

  useEffect(() => {
    if (courseId) {
      fetchCourse()
      fetchDonations()
    }
  }, [courseId])

  useEffect(() => {
    console.log("[v0] Balance check useEffect triggered:", {
      address,
      isConnected,
      connection: !!connection,
      publicKey: !!publicKey,
    })
    if (address && isConnected && connection) {
      checkSolBalance()
    } else {
      console.log("[v0] Setting balance to 0 - missing requirements:", {
        address: !!address,
        isConnected,
        connection: !!connection,
      })
      setSolBalance(0)
    }
  }, [address, isConnected, connection])

  const fetchCourse = async () => {
    try {
      console.log("📚 Fetching course:", courseId)

      const { data, error } = await supabase
        .from("courses_sol")
        .select(`
          *,
          lessons_sol (*)
        `)
        .eq("id", courseId)
        .single()

      if (error) {
        console.error("❌ Error fetching course:", error)
        throw error
      }

      console.log("✅ Course fetched:", data)

      // Sort lessons by order_index
      if (data.lessons_sol) {
        data.lessons_sol.sort((a: Lesson, b: Lesson) => a.order_index - b.order_index)
      }

      // Then, fetch creator profile separately
      let creatorProfile: UserProfile | null = null
      if (data.creator_wallet) {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from("user_profiles_sol")
            .select("*")
            .eq("solana_wallet_address", data.creator_wallet)
            .single()

          if (profileError && profileError.code !== "PGRST116") {
            console.error("❌ Error fetching creator profile:", profileError)
          } else if (profileData) {
            creatorProfile = profileData
            console.log("✅ Creator profile fetched:", profileData.username)
          }
        } catch (error) {
          console.error("❌ Error fetching creator profile:", error)
        }
      }

      setCourse({
        ...data,
        lessons: data.lessons_sol || [],
        creator_profile: creatorProfile,
      })
    } catch (error) {
      console.error("Error fetching course:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDonations = async () => {
    try {
      console.log("💰 Fetching donations for course:", courseId)

      const response = await fetch(`/api/donations?course_id=${courseId}`)
      const data = await response.json()

      if (response.ok) {
        console.log("✅ Donations fetched:", data.donations?.length || 0)
        setDonations(data.donations || [])
      } else {
        console.error("❌ Error fetching donations:", data.error)
        setDonations([])
      }
    } catch (error) {
      console.error("❌ Error fetching donations:", error)
      setDonations([])
    }
  }

  const checkSolBalance = async () => {
    console.log("[v0] checkSolBalance called with:", {
      address,
      isConnected,
      connection: !!connection,
      publicKey: !!publicKey,
    })

    if (!address || !isConnected || !connection || !publicKey) {
      console.log("[v0] Missing requirements for balance check:", {
        address: !!address,
        isConnected,
        connection: !!connection,
        publicKey: !!publicKey,
      })
      setSolBalance(0)
      return
    }

    setIsCheckingBalance(true)
    try {
      console.log("[v0] Fetching real SOL balance from blockchain...")
      const balance = await connection.getBalance(publicKey)
      const solBalance = lamportsToSol(balance)

      console.log("[v0] Raw balance (lamports):", balance)
      console.log("[v0] Converted balance (SOL):", solBalance)

      setSolBalance(solBalance)
      console.log("✅ SOL balance fetched successfully:", solBalance)
    } catch (error) {
      console.error("[v0] Error checking SOL balance:", error)
      setSolBalance(0)
    } finally {
      setIsCheckingBalance(false)
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
    if (!isConnected || !address || !course) {
      throw new Error("Wallet not connected")
    }

    if (!connection) {
      throw new Error("Solana connection not available")
    }

    if (!donationAmount || Number.parseFloat(donationAmount) <= 0) {
      throw new Error("Please enter a valid donation amount")
    }

    const donationAmountNum = Number.parseFloat(donationAmount)

    if (donationAmountNum > solBalance) {
      throw new Error(`Insufficient SOL balance. You have ${solBalance.toFixed(4)} SOL`)
    }

    if (!course.creator_wallet || course.creator_wallet.length < 32 || course.creator_wallet.length > 50) {
      throw new Error("Invalid creator wallet address")
    }

    return donationAmountNum
  }

  const saveDonationToDatabase = async (txSignature: string, blockHeight: number) => {
    try {
      console.log("💾 Saving SOL donation to database:", { txSignature, donationAmount, courseId, address })

      // Get current session
      const session = SolanaAuth.getSession()

      const response = await fetch("/api/donations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          course_id: courseId,
          donor_wallet_address: address!,
          recipient_wallet: course!.creator_wallet,
          amount_sol: donationAmount,
          amount_lamports: solToLamports(Number.parseFloat(donationAmount)),
          transaction_signature: txSignature,
          block_height: blockHeight,
          session: session,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("❌ Failed to save donation:", data.error)
        throw new Error(data.error || "Failed to save donation")
      } else {
        console.log("✅ Donation saved to database successfully")
        // Refresh donations list
        setTimeout(() => {
          fetchDonations()
        }, 2000) // Wait 2 seconds for blockchain confirmation
      }
    } catch (error) {
      console.error("❌ Error saving donation to database:", error)
      // Don't throw here - the blockchain transaction was successful
      toast({
        title: "Donation successful on blockchain",
        description: "Transaction completed but may not appear in stats immediately",
        variant: "default",
      })
    }
  }

  const handleDonate = async () => {
    setIsDonating(true)

    try {
      // Validate donation
      const donationAmountNum = validateDonation()

      if (!publicKey) {
        throw new Error("Wallet not available")
      }

      // Create recipient public key
      const recipientPubkey = new PublicKey(course!.creator_wallet)

      // Convert SOL to lamports
      const lamports = solToLamports(donationAmountNum)

      console.log("SOL donation transaction details:", {
        from: address,
        to: course!.creator_wallet,
        amount: donationAmount,
        lamports: lamports,
      })

      let recentBlockhash: string
      try {
        if (connection) {
          const { blockhash } = await connection.getLatestBlockhash("confirmed")
          recentBlockhash = blockhash
          console.log("[v0] Got recent blockhash from connection:", blockhash.slice(0, 8) + "...")
        } else {
          throw new Error("No connection available")
        }
      } catch (error) {
        console.log("[v0] Failed to get blockhash from connection, using Phantom's built-in handling")
        // Let Phantom handle the transaction entirely
        const provider = window.solana
        if (!provider) {
          throw new Error("Phantom wallet not found")
        }

        // Use Phantom's sendTransaction method which handles blockhash automatically
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: recipientPubkey,
            lamports: lamports,
          }),
        )

        const { signature } = await provider.signAndSendTransaction(transaction)

        if (!signature) {
          throw new Error("Transaction signing failed")
        }

        console.log("SOL transaction sent successfully:", signature)
        const blockHeight = Date.now() // Use timestamp as placeholder

        // Save donation to database
        await saveDonationToDatabase(signature, blockHeight)

        toast({
          title: "Donation successful! 🎉",
          description: `Successfully donated ${donationAmount} SOL to ${course!.creator_profile?.username || "creator"}`,
        })

        // Reset form
        setDonationAmount("")
        setSelectedPreset(null)

        // Refresh data
        checkSolBalance()
        return
      }

      // Create a proper Solana transaction with blockhash
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubkey,
          lamports: lamports,
        }),
      )

      transaction.recentBlockhash = recentBlockhash
      transaction.feePayer = publicKey

      // Use the correct Phantom wallet API
      const provider = window.solana
      if (!provider) {
        throw new Error("Phantom wallet not found")
      }

      // Sign and send transaction using Phantom's built-in method
      const { signature } = await provider.signAndSendTransaction(transaction)

      if (!signature) {
        throw new Error("Transaction signing failed")
      }

      console.log("SOL transaction sent successfully:", signature)

      const blockHeight = Date.now() // Use timestamp as placeholder

      // Save donation to database
      await saveDonationToDatabase(signature, blockHeight)

      toast({
        title: "Donation successful! 🎉",
        description: `Successfully donated ${donationAmount} SOL to ${course!.creator_profile?.username || "creator"}`,
      })

      // Reset form
      setDonationAmount("")
      setSelectedPreset(null)

      // Refresh data
      checkSolBalance()
    } catch (error: any) {
      console.error("SOL donation error:", error)

      let errorMessage = "Transaction failed. Please try again."

      if (error.message?.includes("User rejected")) {
        errorMessage = "Transaction was rejected by user"
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient SOL for transaction and fees"
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

  const getCreatorDisplayName = () => {
    if (course?.creator_profile?.username) {
      return course.creator_profile.username
    }
    return course ? `${course.creator_wallet.slice(0, 4)}...${course.creator_wallet.slice(-4)}` : ""
  }

  const getCreatorAvatar = () => {
    return course?.creator_profile?.avatar_url || ""
  }

  const getCreatorAvatarFallback = () => {
    if (course?.creator_profile?.username) {
      return course.creator_profile.username.charAt(0).toUpperCase()
    }
    return course ? course.creator_wallet.charAt(0).toUpperCase() : "U"
  }

  const totalDonations = donations.reduce((sum, donation) => {
    // Handle both old TUT donations and new SOL donations
    const amount = donation.amount_sol
      ? Number.parseFloat(donation.amount_sol)
      : Number.parseFloat(donation.amount || "0")
    return sum + amount
  }, 0)

  const hasInsufficientBalance = Number.parseFloat(donationAmount) > solBalance

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
                <CardDescription>Donate SOL to show appreciation for this course</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Connection Status */}
                {!isConnected && (
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <Wallet size={24} className="mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Connect your Solana wallet to support this creator
                    </p>
                    <Button onClick={() => window.location.reload()} variant="outline" size="sm" className="w-full">
                      Connect Solana Wallet
                    </Button>
                  </div>
                )}

                {/* Wrong Chain Warning */}
                {/* {isConnected && !isOnCorrectChain && (
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
                )} */}

                {/* Donation Form */}
                {isConnected && (
                  <>
                    {/* Balance Display */}
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Your SOL Balance:</span>
                        <span className="font-bold">
                          {isCheckingBalance ? "Loading..." : `${solBalance.toFixed(4)} SOL`}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Info size={12} />
                          <span>Balance display limited due to RPC rate limits</span>
                        </div>
                      </div>
                    </div>

                    {/* Custom Amount Input */}
                    <div className="space-y-2">
                      <Label htmlFor="donation-amount" className="text-sm font-medium">
                        Custom Amount (SOL)
                      </Label>
                      <Input
                        id="donation-amount"
                        type="number"
                        step="0.001"
                        min="0"
                        max={solBalance}
                        value={donationAmount}
                        onChange={(e) => handleCustomAmountChange(e.target.value)}
                        placeholder="Enter SOL amount"
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
                      <Label className="text-sm font-medium">Quick Amounts (SOL)</Label>
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
                            {amount} SOL
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
                      {isDonating ? "Processing..." : "Donate SOL"}
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
                        <strong>Network:</strong> Solana
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
                    <span className="font-bold text-lg">{totalDonations.toFixed(4)} SOL</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Supporters:</span>
                    <span className="font-bold text-lg">{donations.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Donations */}
            {donations.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Donations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {(donations || []).slice(0, 10).map((donation) => {
                      const amount = donation.amount_sol ? `${donation.amount_sol} SOL` : `${donation.amount} TUT`
                      const donorWallet = donation.donor_wallet_address || donation.donor_wallet || "Unknown"
                      return (
                        <div key={donation.id} className="flex justify-between items-center p-3 bg-accent rounded-lg">
                          <div className="flex items-center">
                            <User size={16} className="text-muted-foreground mr-2" />
                            <span className="text-sm font-medium">
                              {donorWallet.slice(0, 4)}...{donorWallet.slice(-4)}
                            </span>
                          </div>
                          <span className="font-bold">{amount}</span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Donations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Heart size={32} className="mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground text-sm">No donations yet</p>
                    <p className="text-muted-foreground text-xs mt-1">Be the first to support this creator!</p>
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
