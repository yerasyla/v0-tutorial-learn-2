"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ClickUploadAvatar } from "@/components/click-upload-avatar"
import { VerifiedBadge } from "@/components/verified-badge"
import { supabase, type UserProfile, type CourseWithLessons } from "@/lib/supabase"
import { updateProfile } from "@/app/actions/profile-actions"
import { useSolana } from "@/contexts/solana-context"
import { toast } from "@/hooks/use-toast"
import { SolanaAuth } from "@/lib/solana-auth"
import { deleteAvatarFromSupabase } from "@/lib/supabase-storage"

const PencilIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const SaveIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17,21 17,13 7,13 7,21" />
    <polyline points="7,3 7,8 15,8" />
  </svg>
)

const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const GlobeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
)

const TwitterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 23 3z" />
  </svg>
)

const AtIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="4" />
    <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
  </svg>
)

const CaretDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6,9 12,15 18,9" />
  </svg>
)

const CaretUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="18,15 12,9 6,15" />
  </svg>
)

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const BookOpenIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1-3-3h7z" />
  </svg>
)

const PlayIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5,3 19,12 5,21" />
  </svg>
)

const ArrowSquareOutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15,3 21,3 21,9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
)

export default function CreatorProfilePage() {
  const params = useParams()
  const walletAddress = params.wallet as string
  const { address, isConnected } = useSolana()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [courses, setCourses] = useState<CourseWithLessons[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    about: true,
    website: false,
    twitter: false,
  })

  // Edit form state
  const [editForm, setEditForm] = useState({
    display_name: "",
    avatar_url: "",
    about_me: "",
    website_url: "",
    twitter_handle: "",
  })

  const isOwner = isConnected && address === walletAddress

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    if (walletAddress) {
      fetchProfile()
      fetchCreatorCourses()
    }
  }, [walletAddress])

  const fetchProfile = async () => {
    try {
      console.log("Fetching profile for wallet:", walletAddress)

      const { data, error } = await supabase
        .from("user_profiles_sol")
        .select("*")
        .eq("solana_wallet_address", walletAddress)
        .maybeSingle()

      console.log("Profile fetch result:", { data, error })

      if (error && error.code !== "PGRST116") {
        throw error
      }

      if (data) {
        setProfile(data)
        setEditForm({
          display_name: data.display_name || "",
          avatar_url: data.avatar_url || "",
          about_me: data.about_me || "",
          website_url: data.website_url || "",
          twitter_handle: data.twitter_handle || "",
        })
      } else {
        // Create default profile if it doesn't exist
        const defaultProfile = {
          solana_wallet_address: walletAddress,
          display_name: null,
          avatar_url: null,
          about_me: null,
          website_url: null,
          twitter_handle: null,
          is_verified: false,
          verification_date: null,
          verification_notes: null,
        }
        setProfile({
          ...defaultProfile,
          id: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
    }
  }

  const fetchCreatorCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses_sol")
        .select(`
          *,
          lessons_sol (*)
        `)
        .eq("creator_wallet", walletAddress)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      // Sort lessons by order_index for each course
      const coursesWithSortedLessons =
        data?.map((course) => ({
          ...course,
          lessons: course.lessons_sol?.sort((a: any, b: any) => a.order_index - b.order_index) || [],
        })) || []

      setCourses(coursesWithSortedLessons)
    } catch (error) {
      console.error("Error fetching creator courses:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const validateTwitterHandle = (handle: string) => {
    if (!handle) return true // Empty is valid

    // Remove @ if user included it
    const cleanHandle = handle.replace(/^@/, "")

    // Twitter handles: 1-15 characters, alphanumeric and underscores only
    const twitterRegex = /^[A-Za-z0-9_]{1,15}$/
    return twitterRegex.test(cleanHandle)
  }

  const validateWebsiteUrl = (url: string) => {
    if (!url) return true // Empty is valid

    try {
      const urlObj = new URL(url)
      return urlObj.protocol === "http:" || urlObj.protocol === "https:"
    } catch {
      return false
    }
  }

  const handleSaveProfile = async () => {
    if (!isOwner) {
      console.log("Not owner, cannot save")
      toast({
        title: "Unauthorized",
        description: "You can only edit your own profile.",
        variant: "destructive",
      })
      return
    }

    // Validate Twitter handle
    if (editForm.twitter_handle && !validateTwitterHandle(editForm.twitter_handle)) {
      toast({
        title: "Invalid Twitter handle",
        description: "Twitter handles can only contain letters, numbers, and underscores (1-15 characters).",
        variant: "destructive",
      })
      return
    }

    // Validate website URL
    if (editForm.website_url && !validateWebsiteUrl(editForm.website_url)) {
      toast({
        title: "Invalid website URL",
        description: "Please enter a valid website URL starting with http:// or https://",
        variant: "destructive",
      })
      return
    }

    const session = SolanaAuth.getSession()
    if (!session) {
      toast({
        title: "Session expired",
        description: "Please reconnect your wallet.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      console.log("Saving profile with wallet:", address)

      // If avatar was removed, delete the old one from storage
      if (profile?.avatar_url && !editForm.avatar_url && profile.avatar_url.includes("supabase")) {
        try {
          await deleteAvatarFromSupabase(profile.avatar_url)
        } catch (error) {
          console.error("Error deleting old avatar:", error)
          // Don't fail the save if deletion fails
        }
      }

      const result = await updateProfile(walletAddress, editForm, session)

      console.log("Profile update result:", result)

      if (result.success) {
        setProfile(result.profile)
        setIsEditing(false)
        toast({
          title: "Profile updated successfully!",
          description: "Your profile changes have been saved.",
        })
      }
    } catch (error: any) {
      console.error("Error saving profile:", error)
      toast({
        title: "Error saving profile",
        description: error.message || "Failed to save your profile",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    if (profile) {
      setEditForm({
        display_name: profile.display_name || "",
        avatar_url: profile.avatar_url || "",
        about_me: profile.about_me || "",
        website_url: profile.website_url || "",
        twitter_handle: profile.twitter_handle || "",
      })
    }
    setIsEditing(false)
  }

  const handleAvatarChange = (avatarUrl: string) => {
    setEditForm({ ...editForm, avatar_url: avatarUrl })
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const getFirstVideoThumbnail = (lessons: any[]) => {
    if (lessons.length === 0) return "/placeholder.svg?height=200&width=300"

    const firstLesson = lessons[0]
    const match = firstLesson.video_url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    const videoId = match ? match[1] : null

    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : "/placeholder.svg?height=200&width=300"
  }

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatTwitterHandle = (handle: string) => {
    return handle.startsWith("@") ? handle : `@${handle}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
          <div className="animate-pulse">
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 mb-8 md:mb-12">
              <div className="w-24 h-24 md:w-32 md:h-32 bg-muted rounded-full"></div>
              <div className="space-y-4 text-center md:text-left">
                <div className="h-8 md:h-10 bg-muted rounded w-48 md:w-64"></div>
                <div className="h-5 md:h-6 bg-muted rounded w-32 md:w-40"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 md:h-80 bg-muted rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
        {/* Profile Header */}
        <Card className="mb-8 md:mb-12 border-2 border-border bg-card shadow-lg">
          <CardContent className="p-6 md:p-10">
            <div className="flex flex-col lg:flex-row gap-6 md:gap-10">
              {/* Avatar Section */}
              <div className="flex flex-col items-center lg:items-start lg:w-80 xl:w-96">
                {isEditing ? (
                  <div className="w-full">
                    <ClickUploadAvatar
                      currentAvatar={editForm.avatar_url}
                      displayName={editForm.display_name}
                      walletAddress={walletAddress}
                      onAvatarChange={handleAvatarChange}
                      size={isMobile ? "lg" : "xl"}
                      showInstructions={!isMobile}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <Avatar className="w-24 h-24 md:w-32 md:h-32 mb-4 md:mb-6 border-4 border-border">
                        <AvatarImage src={profile?.avatar_url || ""} alt="Profile" className="object-cover" />
                        <AvatarFallback className="text-2xl md:text-4xl font-bold bg-muted text-muted-foreground">
                          {profile?.display_name?.charAt(0)?.toUpperCase() ||
                            formatWalletAddress(walletAddress).charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {isOwner && (
                        <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2">
                          <Button
                            onClick={() => setIsEditing(true)}
                            size="sm"
                            className="rounded-full h-8 w-8 md:h-10 md:w-10 p-0 bg-brand-primary hover:bg-brand-secondary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
                            title="Edit profile"
                          >
                            <PencilIcon />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-6 md:space-y-8">
                    {/* Display Name */}
                    <div className="space-y-2 md:space-y-3">
                      <Label htmlFor="display_name" className="text-sm md:text-base font-medium text-foreground">
                        Display Name
                      </Label>
                      <Input
                        id="display_name"
                        value={editForm.display_name}
                        onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                        placeholder="Your display name"
                        className="h-12 text-base border-2 border-border focus:border-brand-primary bg-background"
                        maxLength={50}
                      />
                    </div>

                    {/* About Me - Collapsible on Mobile */}
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="about_me" className="text-sm md:text-base font-medium text-foreground">
                          About Me
                        </Label>
                        {isMobile && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSection("about")}
                            className="p-1"
                          >
                            {expandedSections.about ? <CaretUpIcon /> : <CaretDownIcon />}
                          </Button>
                        )}
                      </div>
                      {(expandedSections.about || !isMobile) && (
                        <>
                          <Textarea
                            id="about_me"
                            value={editForm.about_me}
                            onChange={(e) => setEditForm({ ...editForm, about_me: e.target.value })}
                            placeholder="Tell us about yourself, your expertise, and what you teach..."
                            rows={isMobile ? 3 : 4}
                            className="text-base border-2 border-border focus:border-brand-primary resize-none bg-background"
                            maxLength={500}
                          />
                          <p className="text-xs text-muted-foreground">{editForm.about_me.length}/500 characters</p>
                        </>
                      )}
                    </div>

                    {/* Website URL - Collapsible on Mobile */}
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="website_url" className="text-sm md:text-base font-medium text-foreground">
                          <GlobeIcon />
                          <span className="ml-2">Website URL</span>
                        </Label>
                        {isMobile && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSection("website")}
                            className="p-1"
                          >
                            {expandedSections.website ? <CaretUpIcon /> : <CaretDownIcon />}
                          </Button>
                        )}
                      </div>
                      {(expandedSections.website || !isMobile) && (
                        <>
                          <Input
                            id="website_url"
                            type="url"
                            value={editForm.website_url}
                            onChange={(e) => setEditForm({ ...editForm, website_url: e.target.value })}
                            placeholder="https://your-website.com"
                            className="h-12 text-base border-2 border-border focus:border-brand-primary bg-background"
                          />
                          <p className="text-xs text-muted-foreground">Your personal or professional website</p>
                        </>
                      )}
                    </div>

                    {/* Twitter Handle - Collapsible on Mobile */}
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="twitter_handle" className="text-sm md:text-base font-medium text-foreground">
                          <TwitterIcon />
                          <span className="ml-2">Twitter Handle</span>
                        </Label>
                        {isMobile && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSection("twitter")}
                            className="p-1"
                          >
                            {expandedSections.twitter ? <CaretUpIcon /> : <CaretDownIcon />}
                          </Button>
                        )}
                      </div>
                      {(expandedSections.twitter || !isMobile) && (
                        <>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <AtIcon />
                            </div>
                            <Input
                              id="twitter_handle"
                              value={editForm.twitter_handle}
                              onChange={(e) => setEditForm({ ...editForm, twitter_handle: e.target.value })}
                              placeholder="username"
                              className="h-12 text-base border-2 border-border focus:border-brand-primary bg-background pl-10"
                              maxLength={15}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Your Twitter username (without the @ symbol)</p>
                        </>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="bg-brand-primary hover:bg-brand-secondary text-primary-foreground px-6 md:px-8 py-3 h-12 font-semibold order-1 sm:order-none"
                      >
                        <SaveIcon />
                        <span className="ml-2">{isSaving ? "Saving..." : "Save Changes"}</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="px-6 md:px-8 py-3 h-12 border-2 border-border bg-transparent hover:bg-accent order-2 sm:order-none"
                      >
                        <XIcon />
                        <span className="ml-2">Cancel</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 md:space-y-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-3 md:mb-4">
                          <h1 className="text-2xl md:text-4xl font-bold text-foreground">
                            {profile?.display_name || formatWalletAddress(walletAddress)}
                          </h1>
                          <VerifiedBadge isVerified={profile?.is_verified || false} size={isMobile ? "md" : "lg"} />
                        </div>
                        <p className="text-muted-foreground flex items-center justify-center md:justify-start text-base md:text-lg mb-2">
                          <UserIcon />
                          <span className="ml-2">{formatWalletAddress(walletAddress)}</span>
                        </p>
                      </div>
                      {isOwner && (
                        <Button
                          onClick={() => setIsEditing(true)}
                          className="bg-brand-primary hover:bg-brand-secondary text-primary-foreground px-4 md:px-6 py-2 md:py-3 h-10 md:h-12 font-semibold text-sm md:text-base"
                        >
                          <PencilIcon />
                          <span className="ml-2">Edit Profile</span>
                        </Button>
                      )}
                    </div>

                    {profile?.about_me && (
                      <div>
                        <h3 className="font-semibold text-foreground mb-2 md:mb-3 text-base md:text-lg">About</h3>
                        <p className="text-muted-foreground leading-relaxed text-sm md:text-base">{profile.about_me}</p>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 md:gap-6 text-sm md:text-base text-muted-foreground">
                      {profile?.website_url && (
                        <a
                          href={profile.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center hover:text-brand-primary transition-colors group min-h-[44px] sm:min-h-0"
                        >
                          <GlobeIcon />
                          <span className="ml-2 group-hover:underline">Website</span>
                          <ArrowSquareOutIcon />
                        </a>
                      )}
                      {profile?.twitter_handle && (
                        <a
                          href={`https://twitter.com/${profile.twitter_handle.replace(/^@/, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center hover:text-brand-primary transition-colors group min-h-[44px] sm:min-h-0"
                        >
                          <TwitterIcon />
                          <span className="ml-2 group-hover:underline">
                            {formatTwitterHandle(profile.twitter_handle)}
                          </span>
                          <ArrowSquareOutIcon />
                        </a>
                      )}
                      <div className="flex items-center min-h-[44px] sm:min-h-0">
                        <CalendarIcon />
                        <span className="ml-2">Joined {new Date(profile?.created_at || "").toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center min-h-[44px] sm:min-h-0">
                        <BookOpenIcon />
                        <span className="ml-2">
                          {courses.length} course{courses.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Courses Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 md:mb-10 gap-4 md:gap-6">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center lg:text-left">
              {isOwner ? "Your Courses" : `${profile?.display_name || "Creator"}'s Courses`}
            </h2>
            {isOwner && (
              <Link href="/create-course">
                <Button
                  size="lg"
                  className="bg-brand-primary hover:bg-brand-secondary text-primary-foreground px-6 md:px-8 py-3 md:py-4 text-base md:text-lg h-12 md:h-14 font-semibold w-full lg:w-auto"
                >
                  <BookOpenIcon />
                  <span className="ml-2 md:ml-3">Create New Course</span>
                </Button>
              </Link>
            )}
          </div>

          {courses.length === 0 ? (
            <Card className="max-w-2xl mx-auto border-2 border-border bg-card shadow-lg">
              <CardContent className="text-center py-12 md:py-16 px-6 md:px-8">
                <BookOpenIcon />
                <h3 className="text-xl md:text-2xl font-semibold text-foreground mb-3 md:mb-4">
                  {isOwner ? "No courses yet" : "No courses available"}
                </h3>
                <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-6 md:mb-8">
                  {isOwner
                    ? "Create your first course to start sharing your knowledge!"
                    : "This creator hasn't published any courses yet."}
                </p>
                {isOwner && (
                  <Link href="/create-course">
                    <Button
                      size="lg"
                      className="bg-brand-primary hover:bg-brand-secondary text-primary-foreground px-6 md:px-8 py-3 md:py-4 text-base md:text-lg h-12 md:h-14 font-semibold w-full sm:w-auto"
                    >
                      <BookOpenIcon />
                      <span className="ml-2 md:ml-3">Create Your First Course</span>
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
              {courses.map((course) => {
                const thumbnailUrl = getFirstVideoThumbnail(course.lessons)

                return (
                  <Card
                    key={course.id}
                    className="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-border hover:border-brand-primary group bg-card"
                  >
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={thumbnailUrl || "/placeholder.svg"}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <PlayIcon size={isMobile ? 40 : 56} />
                      </div>
                      <div className="absolute top-3 md:top-4 right-3 md:right-4">
                        <Badge
                          variant="secondary"
                          className="bg-white/90 text-gray-900 font-medium px-2 md:px-3 py-1 text-xs md:text-sm"
                        >
                          {course.lessons.length} lesson{course.lessons.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      {/* Perfect circular verified badge */}
                      {profile?.is_verified && (
                        <div className="absolute top-3 md:top-4 left-3 md:left-4">
                          <VerifiedBadge isVerified={true} size="md" variant="card" />
                        </div>
                      )}
                    </div>
                    <CardHeader className="p-4 md:p-6 pb-3 md:pb-4">
                      <CardTitle className="line-clamp-2 text-lg md:text-xl leading-tight mb-2 md:mb-3 text-card-foreground">
                        {course.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-3 text-sm md:text-base leading-relaxed text-muted-foreground mb-3 md:mb-4">
                        {course.description}
                      </CardDescription>
                      <div className="text-xs md:text-sm text-muted-foreground font-medium">
                        Created {new Date(course.created_at).toLocaleDateString()}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-0">
                      <div className="flex gap-2 md:gap-3">
                        <Link href={`/courses/${course.id}`} className="flex-1">
                          <Button className="w-full h-11 md:h-12 text-sm md:text-base font-semibold bg-brand-primary hover:bg-brand-secondary text-primary-foreground">
                            <PlayIcon size={16} />
                            <span className="ml-2 md:ml-3">{isOwner ? "View Course" : "Start Course"}</span>
                          </Button>
                        </Link>
                        {isOwner && (
                          <Link href={`/dashboard/edit/${course.id}`}>
                            <Button
                              variant="outline"
                              className="h-11 md:h-12 px-3 md:px-4 border-2 border-border bg-transparent hover:bg-accent"
                            >
                              <PencilIcon />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
