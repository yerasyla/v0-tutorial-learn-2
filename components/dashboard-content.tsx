"use client"

import { useState, useEffect } from "react"
import { useWeb3 } from "@/contexts/web3-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Loader2, User, Edit3, Save, BookOpen, Plus, Settings, MoreHorizontal, Trash2, Eye } from "lucide-react"
import { ClickUploadAvatar } from "@/components/click-upload-avatar"
import { updateProfile, type ProfileUpdateData } from "@/app/actions/profile-actions"
import { getDashboardData, deleteCourseAction, type DashboardData } from "@/app/actions/dashboard-actions"
import { VerifiedBadge } from "@/components/verified-badge"
import { WalletAuth } from "@/lib/wallet-auth"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface UserProfile {
  id: string
  wallet_address: string
  display_name: string | null
  avatar_url: string | null
  about_me: string | null
  website_url: string | null
  twitter_handle: string | null
  created_at: string
  updated_at: string
  is_verified: boolean
  verification_date: string | null
  verification_notes: string | null
}

interface Course {
  id: string
  title: string
  description: string | null
  creator_wallet: string
  created_at: string
  updated_at: string
  lessons: Lesson[]
}

interface Lesson {
  id: string
  title: string
  description: string | null
  youtube_url: string
  order_index: number
  course_id: string
}

export function DashboardContent() {
  const { account, isConnected, isAuthenticated } = useWeb3()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<ProfileUpdateData>({
    display_name: "",
    avatar_url: "",
    about_me: "",
    website_url: "",
    twitter_handle: "",
  })

  // Fetch dashboard data
  useEffect(() => {
    async function fetchDashboardData() {
      if (!account || !isAuthenticated) {
        setIsLoading(false)
        return
      }

      try {
        console.log("Fetching dashboard data for wallet:", account)

        const session = WalletAuth.getSession()
        if (!session) {
          toast({
            title: "Session Expired",
            description: "Please reconnect your wallet to authenticate",
            variant: "destructive",
          })
          setIsLoading(false)
          return
        }

        const data = await getDashboardData(session)
        setDashboardData(data)

        if (data.profile) {
          setFormData({
            display_name: data.profile.display_name || "",
            avatar_url: data.profile.avatar_url || "",
            about_me: data.profile.about_me || "",
            website_url: data.profile.website_url || "",
            twitter_handle: data.profile.twitter_handle || "",
          })
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [account, isAuthenticated])

  const handleInputChange = (field: keyof ProfileUpdateData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleAvatarUpload = (url: string) => {
    setFormData((prev) => ({
      ...prev,
      avatar_url: url,
    }))
  }

  const handleSaveProfile = async () => {
    if (!account || !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please connect and authenticate your wallet first",
        variant: "destructive",
      })
      return
    }

    const session = WalletAuth.getSession()
    if (!session) {
      toast({
        title: "Session Expired",
        description: "Please reconnect your wallet to authenticate",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      const result = await updateProfile(account, formData, session)

      if (result.success) {
        // Update local state
        setDashboardData((prev) =>
          prev
            ? {
                ...prev,
                profile: result.profile,
              }
            : null,
        )

        toast({
          title: "Profile Updated! 🎉",
          description: "Your profile has been saved successfully",
        })
      }
    } catch (error: any) {
      console.error("Error saving profile:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save profile",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    if (!account || !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please connect and authenticate your wallet first",
        variant: "destructive",
      })
      return
    }

    if (!confirm(`Are you sure you want to delete "${courseTitle}"? This action cannot be undone.`)) {
      return
    }

    const session = WalletAuth.getSession()
    if (!session) {
      toast({
        title: "Session Expired",
        description: "Please reconnect your wallet to authenticate",
        variant: "destructive",
      })
      return
    }

    try {
      await deleteCourseAction(courseId, session)

      // Update local state
      setDashboardData((prev) =>
        prev
          ? {
              ...prev,
              courses: prev.courses.filter((course) => course.id !== courseId),
              stats: {
                ...prev.stats,
                totalCourses: prev.stats.totalCourses - 1,
                totalLessons:
                  prev.stats.totalLessons - (prev.courses.find((c) => c.id === courseId)?.lessons.length || 0),
              },
            }
          : null,
      )

      toast({
        title: "Course Deleted",
        description: `"${courseTitle}" has been deleted successfully`,
      })
    } catch (error: any) {
      console.error("Error deleting course:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete course",
        variant: "destructive",
      })
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="p-6">
              <div className="text-center mb-4">
                <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <CardTitle className="text-xl text-foreground mb-3">Connect Your Wallet</CardTitle>
                <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                  Please connect your wallet to access your dashboard
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="p-6">
              <div className="text-center mb-4">
                <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <CardTitle className="text-xl text-foreground mb-3">Authentication Required</CardTitle>
                <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                  Please sign the authentication message to access your dashboard
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Loading dashboard...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p>Failed to load dashboard data</p>
          </div>
        </div>
      </div>
    )
  }

  const { profile, courses, stats } = dashboardData

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2 leading-tight flex items-center gap-2">
              Dashboard
              {profile?.is_verified && <VerifiedBadge />}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">Manage your courses and profile</p>
          </div>
          <div className="flex gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border border-border bg-transparent hover:bg-accent">
                  <Settings className="w-4 h-4 mr-2" />
                  Profile Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Profile Settings</DialogTitle>
                  <DialogDescription>Update your creator profile information</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Avatar Upload */}
                  <div className="space-y-2">
                    <Label>Profile Picture</Label>
                    <ClickUploadAvatar
                      currentAvatarUrl={formData.avatar_url}
                      walletAddress={account || ""}
                      onUploadComplete={handleAvatarUpload}
                    />
                  </div>

                  {/* Display Name */}
                  <div className="space-y-2">
                    <Label htmlFor="display_name">Display Name</Label>
                    <Input
                      id="display_name"
                      value={formData.display_name}
                      onChange={(e) => handleInputChange("display_name", e.target.value)}
                      placeholder="Your display name"
                      className="border border-border focus:border-brand-primary bg-background"
                    />
                  </div>

                  {/* About Me */}
                  <div className="space-y-2">
                    <Label htmlFor="about_me">About Me</Label>
                    <Textarea
                      id="about_me"
                      value={formData.about_me}
                      onChange={(e) => handleInputChange("about_me", e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={4}
                      className="border border-border focus:border-brand-primary resize-none bg-background"
                    />
                  </div>

                  {/* Website URL */}
                  <div className="space-y-2">
                    <Label htmlFor="website_url">Website</Label>
                    <Input
                      id="website_url"
                      type="url"
                      value={formData.website_url}
                      onChange={(e) => handleInputChange("website_url", e.target.value)}
                      placeholder="https://your-website.com"
                      className="border border-border focus:border-brand-primary bg-background"
                    />
                  </div>

                  {/* Twitter Handle */}
                  <div className="space-y-2">
                    <Label htmlFor="twitter_handle">Twitter Handle</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                        @
                      </span>
                      <Input
                        id="twitter_handle"
                        value={formData.twitter_handle}
                        onChange={(e) => handleInputChange("twitter_handle", e.target.value)}
                        placeholder="username"
                        className="pl-8 border border-border focus:border-brand-primary bg-background"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="bg-brand-primary hover:bg-brand-secondary text-primary-foreground"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button asChild className="bg-brand-primary hover:bg-brand-secondary text-primary-foreground">
              <Link href="/create-course">
                <Plus className="w-4 h-4 mr-2" />
                Create Course
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCourses}</div>
              <p className="text-xs text-muted-foreground">Courses created</p>
            </CardContent>
          </Card>
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Lessons</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLessons}</div>
              <p className="text-xs text-muted-foreground">Lessons created</p>
            </CardContent>
          </Card>
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
              <p className="text-xs text-muted-foreground">Students enrolled</p>
            </CardContent>
          </Card>
        </div>

        {/* Courses Section */}
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  My Courses
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  {courses.length} course{courses.length !== 1 ? "s" : ""} created
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {courses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium text-foreground mb-2">No courses yet</h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Create your first course to start sharing your knowledge with the Web3 community.
                </p>
                <Button asChild className="bg-brand-primary hover:bg-brand-secondary text-primary-foreground">
                  <Link href="/create-course">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Course
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => (
                  <Card key={course.id} className="border border-border bg-background shadow-sm">
                    <CardHeader className="p-4 pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-semibold text-foreground line-clamp-2 leading-tight">
                            {course.title}
                          </CardTitle>
                          {course.description && (
                            <CardDescription className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                              {course.description}
                            </CardDescription>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-accent">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/edit/${course.id}`} className="cursor-pointer">
                                <Edit3 className="h-4 w-4 mr-2" />
                                Edit Course
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/courses/${course.id}`} className="cursor-pointer">
                                <Eye className="h-4 w-4 mr-2" />
                                View Course
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 cursor-pointer"
                              onClick={() => handleDeleteCourse(course.id, course.title)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Course
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                        <span>
                          {course.lessons.length} lesson{course.lessons.length !== 1 ? "s" : ""}
                        </span>
                        <span>Created {new Date(course.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          asChild
                          size="sm"
                          className="flex-1 h-8 text-xs bg-brand-primary hover:bg-brand-secondary text-primary-foreground"
                        >
                          <Link href={`/dashboard/edit/${course.id}`}>
                            <Edit3 className="h-3 w-3 mr-1" />
                            Edit
                          </Link>
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs border border-border bg-transparent hover:bg-accent"
                        >
                          <Link href={`/courses/${course.id}`}>
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
