"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useWeb3 } from "@/contexts/web3-context"
import { getDashboardData } from "@/app/actions/dashboard-actions"
import { updateProfile, type ProfileUpdateData } from "@/app/actions/profile-actions"
import { deleteCourse } from "@/app/actions/secure-course-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { Pencil, Trash2, Eye, Settings, BookOpen, Users, DollarSign } from "lucide-react"
import Link from "next/link"

interface DashboardData {
  courses: any[]
  profile: any
  stats: {
    totalCourses: number
    totalLessons: number
    totalDonations: number
  }
}

export function DashboardContent() {
  const { getAuthSession, account } = useWeb3()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [profileForm, setProfileForm] = useState<ProfileUpdateData>({
    display_name: "",
    avatar_url: "",
    about_me: "",
    website_url: "",
    twitter_handle: "",
  })

  // Load dashboard data
  useEffect(() => {
    const loadData = async () => {
      if (!account) return

      try {
        const session = getAuthSession()
        if (!session) {
          toast({
            title: "Authentication Required",
            description: "Please sign in with your wallet first.",
            variant: "destructive",
          })
          return
        }

        const dashboardData = await getDashboardData(session)
        setData(dashboardData)

        // Initialize profile form
        if (dashboardData.profile) {
          setProfileForm({
            display_name: dashboardData.profile.display_name || "",
            avatar_url: dashboardData.profile.avatar_url || "",
            about_me: dashboardData.profile.about_me || "",
            website_url: dashboardData.profile.website_url || "",
            twitter_handle: dashboardData.profile.twitter_handle || "",
          })
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error)
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [account, getAuthSession])

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${courseTitle}"? This action cannot be undone.`)) {
      return
    }

    try {
      const session = getAuthSession()
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in with your wallet first.",
          variant: "destructive",
        })
        return
      }

      await deleteCourse(courseId, session)

      // Refresh data
      const dashboardData = await getDashboardData(session)
      setData(dashboardData)

      toast({
        title: "Course Deleted",
        description: `"${courseTitle}" has been deleted successfully.`,
      })
    } catch (error) {
      console.error("Failed to delete course:", error)
      toast({
        title: "Error",
        description: "Failed to delete course",
        variant: "destructive",
      })
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!account) return

    try {
      const session = getAuthSession()
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in with your wallet first.",
          variant: "destructive",
        })
        return
      }

      await updateProfile(account, profileForm, session)

      // Refresh data
      const dashboardData = await getDashboardData(session)
      setData(dashboardData)

      setProfileDialogOpen(false)
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      })
    } catch (error) {
      console.error("Failed to update profile:", error)
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading dashboard...</div>
  }

  if (!data) {
    return <div className="text-center py-8">Failed to load dashboard data</div>
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalCourses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lessons</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalLessons}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalDonations.toFixed(4)} BNB</div>
          </CardContent>
        </Card>
      </div>

      {/* Profile Settings */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Your Courses</h2>
        <div className="flex gap-2">
          <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Profile Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Profile Settings</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    value={profileForm.display_name}
                    onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })}
                    placeholder="Your display name"
                  />
                </div>
                <div>
                  <Label htmlFor="avatar_url">Avatar URL</Label>
                  <Input
                    id="avatar_url"
                    value={profileForm.avatar_url}
                    onChange={(e) => setProfileForm({ ...profileForm, avatar_url: e.target.value })}
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
                <div>
                  <Label htmlFor="about_me">About Me</Label>
                  <Textarea
                    id="about_me"
                    value={profileForm.about_me}
                    onChange={(e) => setProfileForm({ ...profileForm, about_me: e.target.value })}
                    placeholder="Tell us about yourself..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="website_url">Website URL</Label>
                  <Input
                    id="website_url"
                    value={profileForm.website_url}
                    onChange={(e) => setProfileForm({ ...profileForm, website_url: e.target.value })}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
                <div>
                  <Label htmlFor="twitter_handle">Twitter Handle</Label>
                  <Input
                    id="twitter_handle"
                    value={profileForm.twitter_handle}
                    onChange={(e) => setProfileForm({ ...profileForm, twitter_handle: e.target.value })}
                    placeholder="@yourusername"
                  />
                </div>
                <Button type="submit" className="w-full">
                  Update Profile
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Button asChild>
            <Link href="/create-course">Create New Course</Link>
          </Button>
        </div>
      </div>

      {/* Courses Grid */}
      {data.courses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
            <p className="text-muted-foreground mb-4">Create your first course to start sharing your knowledge!</p>
            <Button asChild>
              <Link href="/create-course">Create Your First Course</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.courses.map((course) => (
            <Card key={course.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                    <CardDescription className="mt-2 line-clamp-3">
                      {course.description || "No description provided"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="secondary">{course.lessons?.length || 0} lessons</Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(course.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline" className="flex-1 bg-transparent">
                    <Link href={`/courses/${course.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="flex-1 bg-transparent">
                    <Link href={`/dashboard/edit/${course.id}`}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteCourse(course.id, course.title)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
