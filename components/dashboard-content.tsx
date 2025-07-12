"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateProfile } from "@/app/actions/profile-actions"
import { deleteCourseAction, getDashboardData, type DashboardData } from "@/app/actions/dashboard-actions"
import { WalletAuth } from "@/lib/wallet-auth"
import { BookOpen, Users, Plus, Edit, Trash2, Eye, Settings, AlertCircle, CheckCircle, User } from "lucide-react"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"

interface DashboardContentProps {
  initialData: DashboardData
}

export default function DashboardContent({ initialData }: DashboardContentProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData>(initialData)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [profileForm, setProfileForm] = useState({
    display_name: initialData.profile?.display_name || "",
    about_me: initialData.profile?.about_me || "",
    website_url: initialData.profile?.website_url || "",
    twitter_handle: initialData.profile?.twitter_handle || "",
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [deletingCourse, setDeletingCourse] = useState<string | null>(null)

  const { profile, courses, stats } = dashboardData

  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileLoading(true)

    try {
      const session = WalletAuth.getSession()
      if (!session) {
        throw new Error("No valid authentication session")
      }

      const formData = new FormData()
      formData.append("display_name", profileForm.display_name)
      formData.append("about_me", profileForm.about_me)
      formData.append("website_url", profileForm.website_url)
      formData.append("twitter_handle", profileForm.twitter_handle)

      await updateProfile(formData, session)

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      })

      setProfileDialogOpen(false)

      // Reload dashboard data
      const data = await getDashboardData(session)
      setDashboardData(data)
    } catch (error: any) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setProfileLoading(false)
    }
  }

  // Handle course deletion
  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${courseTitle}"? This action cannot be undone.`)) {
      return
    }

    setDeletingCourse(courseId)

    try {
      const session = WalletAuth.getSession()
      if (!session) {
        throw new Error("No valid authentication session")
      }

      await deleteCourseAction(courseId, session)

      toast({
        title: "Course Deleted",
        description: `"${courseTitle}" has been deleted successfully.`,
      })

      // Reload dashboard data
      const data = await getDashboardData(session)
      setDashboardData(data)
    } catch (error: any) {
      console.error("Error deleting course:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete course",
        variant: "destructive",
      })
    } finally {
      setDeletingCourse(null)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {profile?.display_name || "Creator"}</p>
        </div>
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
                  <Label htmlFor="about_me">About Me</Label>
                  <Textarea
                    id="about_me"
                    value={profileForm.about_me}
                    onChange={(e) => setProfileForm({ ...profileForm, about_me: e.target.value })}
                    placeholder="Tell us about yourself"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="website_url">Website</Label>
                  <Input
                    id="website_url"
                    type="url"
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
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setProfileDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={profileLoading}>
                    {profileLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Button asChild>
            <Link href="/create-course">
              <Plus className="h-4 w-4 mr-2" />
              Create Course
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCourses}</div>
            <p className="text-xs text-muted-foreground">Courses you've created</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lessons</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLessons}</div>
            <p className="text-xs text-muted-foreground">Lessons across all courses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Status</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {profile ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Complete</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Incomplete</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{profile ? "Profile set up" : "Set up your profile"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Courses Section */}
      <Card>
        <CardHeader>
          <CardTitle>Your Courses</CardTitle>
          <CardDescription>Manage and edit your created courses</CardDescription>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No courses yet</h3>
              <p className="text-muted-foreground mb-4">Create your first course to get started</p>
              <Button asChild>
                <Link href="/create-course">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Course
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <Card key={course.id} className="relative">
                  <CardHeader>
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {course.description || "No description provided"}
                    </CardDescription>
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
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteCourse(course.id, course.title)}
                        disabled={deletingCourse === course.id}
                        className="text-red-600 hover:text-red-700"
                      >
                        {deletingCourse === course.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
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
  )
}
