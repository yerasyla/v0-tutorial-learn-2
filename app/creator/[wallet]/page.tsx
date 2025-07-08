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
import { useWeb3 } from "@/contexts/web3-context"
import { toast } from "@/hooks/use-toast"
import { deleteAvatarFromSupabase } from "@/lib/supabase-storage"
import {
  PencilSimple,
  FloppyDisk,
  X,
  Globe,
  BookOpen,
  Play,
  User,
  Calendar,
  ArrowSquareOut,
  TwitterLogo,
  At,
} from "@phosphor-icons/react"

export default function CreatorProfilePage() {
  const params = useParams()
  const walletAddress = params.wallet as string
  const { account, isConnected } = useWeb3()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [courses, setCourses] = useState<CourseWithLessons[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Edit form state
  const [editForm, setEditForm] = useState({
    display_name: "",
    avatar_url: "",
    about_me: "",
    website_url: "",
    twitter_handle: "",
  })

  const isOwner = isConnected && account?.toLowerCase() === walletAddress.toLowerCase()

  useEffect(() => {
    if (walletAddress) {
      fetchProfile()
      fetchCreatorCourses()
    }
  }, [walletAddress])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("wallet_address", walletAddress.toLowerCase())
        .single()

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
          wallet_address: walletAddress.toLowerCase(),
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
        .from("courses")
        .select(`
          *,
          lessons (*)
        `)
        .eq("creator_wallet", walletAddress.toLowerCase())
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      // Sort lessons by order_index for each course
      const coursesWithSortedLessons =
        data?.map((course) => ({
          ...course,
          lessons: course.lessons?.sort((a: any, b: any) => a.order_index - b.order_index) || [],
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
    if (!isOwner) return

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

    setIsSaving(true)

    try {
      // Clean Twitter handle (remove @ if present)
      const cleanTwitterHandle = editForm.twitter_handle.replace(/^@/, "")

      const profileData = {
        wallet_address: walletAddress.toLowerCase(),
        display_name: editForm.display_name.trim() || null,
        avatar_url: editForm.avatar_url.trim() || null,
        about_me: editForm.about_me.trim() || null,
        website_url: editForm.website_url.trim() || null,
        twitter_handle: cleanTwitterHandle.trim() || null,
      }

      // If avatar was removed, delete the old one from storage
      if (profile?.avatar_url && !editForm.avatar_url && profile.avatar_url.includes("supabase")) {
        try {
          await deleteAvatarFromSupabase(profile.avatar_url)
        } catch (error) {
          console.error("Error deleting old avatar:", error)
          // Don't fail the save if deletion fails
        }
      }

      if (profile?.id) {
        // Update existing profile
        const { data, error } = await supabase
          .from("user_profiles")
          .update(profileData)
          .eq("wallet_address", walletAddress.toLowerCase())
          .select()
          .single()

        if (error) throw error
        setProfile(data)
      } else {
        // Create new profile
        const { data, error } = await supabase.from("user_profiles").insert([profileData]).select().single()

        if (error) throw error
        setProfile(data)
      }

      setIsEditing(false)
      toast({
        title: "Profile updated successfully!",
        description: "Your profile changes have been saved.",
      })
    } catch (error) {
      console.error("Error saving profile:", error)
      toast({
        title: "Error saving profile",
        description: "Failed to save your profile. Please try again.",
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

  const getFirstVideoThumbnail = (lessons: any[]) => {
    if (lessons.length === 0) return "/placeholder.svg?height=200&width=300"

    const firstLesson = lessons[0]
    const match = firstLesson.youtube_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
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
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="animate-pulse">
            <div className="flex items-center gap-8 mb-12">
              <div className="w-32 h-32 bg-muted rounded-full"></div>
              <div className="space-y-4">
                <div className="h-10 bg-muted rounded w-64"></div>
                <div className="h-6 bg-muted rounded w-40"></div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-80 bg-muted rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Profile Header */}
        <Card className="mb-12 border-2 border-border bg-card shadow-lg">
          <CardContent className="p-10">
            <div className="flex flex-col lg:flex-row gap-10">
              {/* Avatar Section */}
              <div className="flex flex-col items-center lg:items-start lg:w-96">
                {isEditing ? (
                  <div className="w-full">
                    <ClickUploadAvatar
                      currentAvatar={editForm.avatar_url}
                      displayName={editForm.display_name}
                      walletAddress={walletAddress}
                      onAvatarChange={handleAvatarChange}
                      size="xl"
                      showInstructions={true}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <Avatar className="w-32 h-32 mb-6 border-4 border-border">
                        <AvatarImage src={profile?.avatar_url || ""} alt="Profile" className="object-cover" />
                        <AvatarFallback className="text-4xl font-bold bg-muted text-muted-foreground">
                          {profile?.display_name?.charAt(0)?.toUpperCase() ||
                            formatWalletAddress(walletAddress).charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {isOwner && (
                        <div className="absolute -bottom-2 -right-2">
                          <Button
                            onClick={() => setIsEditing(true)}
                            size="sm"
                            className="rounded-full h-10 w-10 p-0 bg-brand-primary hover:bg-brand-secondary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
                            title="Edit profile"
                          >
                            <PencilSimple size={16} />
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
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <Label htmlFor="display_name" className="text-base font-medium text-foreground">
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

                    <div className="space-y-3">
                      <Label htmlFor="about_me" className="text-base font-medium text-foreground">
                        About Me
                      </Label>
                      <Textarea
                        id="about_me"
                        value={editForm.about_me}
                        onChange={(e) => setEditForm({ ...editForm, about_me: e.target.value })}
                        placeholder="Tell us about yourself, your expertise, and what you teach..."
                        rows={4}
                        className="text-base border-2 border-border focus:border-brand-primary resize-none bg-background"
                        maxLength={500}
                      />
                      <p className="text-xs text-muted-foreground">{editForm.about_me.length}/500 characters</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="website_url" className="text-base font-medium text-foreground">
                          <Globe size={16} className="inline mr-2" />
                          Website URL
                        </Label>
                        <Input
                          id="website_url"
                          type="url"
                          value={editForm.website_url}
                          onChange={(e) => setEditForm({ ...editForm, website_url: e.target.value })}
                          placeholder="https://your-website.com"
                          className="h-12 text-base border-2 border-border focus:border-brand-primary bg-background"
                        />
                        <p className="text-xs text-muted-foreground">Your personal or professional website</p>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="twitter_handle" className="text-base font-medium text-foreground">
                          <TwitterLogo size={16} className="inline mr-2" />
                          Twitter Handle
                        </Label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <At size={18} className="text-muted-foreground" />
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
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="bg-brand-primary hover:bg-brand-secondary text-primary-foreground px-8 py-3 h-12 font-semibold"
                      >
                        <FloppyDisk size={18} className="mr-2" />
                        {isSaving ? "Saving Changes..." : "Save Changes"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="px-8 py-3 h-12 border-2 border-border bg-transparent hover:bg-accent"
                      >
                        <X size={18} className="mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                          <h1 className="text-4xl font-bold text-foreground">
                            {profile?.display_name || formatWalletAddress(walletAddress)}
                          </h1>
                          <VerifiedBadge isVerified={profile?.is_verified || false} size="lg" />
                        </div>
                        <p className="text-muted-foreground flex items-center text-lg mb-2">
                          <User size={20} className="mr-2" />
                          {formatWalletAddress(walletAddress)}
                        </p>
                      </div>
                      {isOwner && (
                        <Button
                          onClick={() => setIsEditing(true)}
                          className="bg-brand-primary hover:bg-brand-secondary text-primary-foreground px-6 py-3 h-12 font-semibold"
                        >
                          <PencilSimple size={18} className="mr-2" />
                          Edit Profile
                        </Button>
                      )}
                    </div>

                    {profile?.about_me && (
                      <div>
                        <h3 className="font-semibold text-foreground mb-3 text-lg">About</h3>
                        <p className="text-muted-foreground leading-relaxed text-base">{profile.about_me}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-6 text-base text-muted-foreground">
                      {profile?.website_url && (
                        <a
                          href={profile.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center hover:text-brand-primary transition-colors group"
                        >
                          <Globe size={18} className="mr-2" />
                          <span className="group-hover:underline">Website</span>
                          <ArrowSquareOut size={16} className="ml-2" />
                        </a>
                      )}
                      {profile?.twitter_handle && (
                        <a
                          href={`https://twitter.com/${profile.twitter_handle.replace(/^@/, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center hover:text-brand-primary transition-colors group"
                        >
                          <TwitterLogo size={18} className="mr-2" />
                          <span className="group-hover:underline">{formatTwitterHandle(profile.twitter_handle)}</span>
                          <ArrowSquareOut size={16} className="ml-2" />
                        </a>
                      )}
                      <div className="flex items-center">
                        <Calendar size={18} className="mr-2" />
                        Joined {new Date(profile?.created_at || "").toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <BookOpen size={18} className="mr-2" />
                        {courses.length} course{courses.length !== 1 ? "s" : ""}
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
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-10 gap-6">
            <h2 className="text-3xl font-bold text-foreground">
              {isOwner ? "Your Courses" : `${profile?.display_name || "Creator"}'s Courses`}
            </h2>
            {isOwner && (
              <Link href="/create-course">
                <Button
                  size="lg"
                  className="bg-brand-primary hover:bg-brand-secondary text-primary-foreground px-8 py-4 text-lg h-14 font-semibold"
                >
                  <BookOpen size={20} className="mr-3" />
                  Create New Course
                </Button>
              </Link>
            )}
          </div>

          {courses.length === 0 ? (
            <Card className="max-w-2xl mx-auto border-2 border-border bg-card shadow-lg">
              <CardContent className="text-center py-16 px-8">
                <BookOpen size={64} className="text-muted-foreground mx-auto mb-6" />
                <h3 className="text-2xl font-semibold text-foreground mb-4">
                  {isOwner ? "No courses yet" : "No courses available"}
                </h3>
                <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                  {isOwner
                    ? "Create your first course to start sharing your knowledge!"
                    : "This creator hasn't published any courses yet."}
                </p>
                {isOwner && (
                  <Link href="/create-course">
                    <Button
                      size="lg"
                      className="bg-brand-primary hover:bg-brand-secondary text-primary-foreground px-8 py-4 text-lg h-14 font-semibold"
                    >
                      <BookOpen size={20} className="mr-3" />
                      Create Your First Course
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Play size={56} className="text-white" weight="fill" />
                      </div>
                      <div className="absolute top-4 right-4">
                        <Badge variant="secondary" className="bg-white/90 text-gray-900 font-medium px-3 py-1">
                          {course.lessons.length} lesson{course.lessons.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      {/* Perfect circular verified badge */}
                      {profile?.is_verified && (
                        <div className="absolute top-4 left-4">
                          <VerifiedBadge isVerified={true} size="md" variant="card" />
                        </div>
                      )}
                    </div>
                    <CardHeader className="p-6 pb-4">
                      <CardTitle className="line-clamp-2 text-xl leading-tight mb-3 text-card-foreground">
                        {course.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-3 text-base leading-relaxed text-muted-foreground mb-4">
                        {course.description}
                      </CardDescription>
                      <div className="text-sm text-muted-foreground font-medium">
                        Created {new Date(course.created_at).toLocaleDateString()}
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                      <div className="flex gap-3">
                        <Link href={`/courses/${course.id}`} className="flex-1">
                          <Button className="w-full h-12 text-base font-semibold bg-brand-primary hover:bg-brand-secondary text-primary-foreground">
                            <Play size={18} className="mr-3" weight="fill" />
                            {isOwner ? "View Course" : "Start Course"}
                          </Button>
                        </Link>
                        {isOwner && (
                          <Link href={`/dashboard/edit/${course.id}`}>
                            <Button
                              variant="outline"
                              className="h-12 px-4 border-2 border-border bg-transparent hover:bg-accent"
                            >
                              <PencilSimple size={18} />
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
