"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trash2, Edit, Eye, Settings, BookOpen, Users, GraduationCap } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { updateProfile } from "@/app/actions/profile-actions"
import { deleteCourseAction } from "@/app/actions/dashboard-actions"
import { WalletAuth } from "@/lib/wallet-auth"
import type { DashboardData } from "@/app/actions/dashboard-actions"

interface DashboardContentProps {
  initialData: DashboardData
}

export default function DashboardContent({ initialData }: DashboardContentProps) {
  const [data, setData] = useState(initialData)
  const [isPending, startTransition] = useTransition()
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)

  const handleDeleteCourse = async (courseId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return
    }

    try {
      const session = WalletAuth.getSession()
      if (!session) {
        toast.error("Please authenticate with your wallet first")
        return
      }

      startTransition(async () => {
        try {
          await deleteCourseAction(courseId, session)

          // Update local state
          setData((prev) => ({
            ...prev,
            courses: prev.courses.filter((course) => course.id !== courseId),
            stats: {
              ...prev.stats,
              totalCourses: prev.stats.totalCourses - 1,
              totalLessons:
                prev.stats.totalLessons - (prev.courses.find((c) => c.id === courseId)?.lessons?.length || 0),
            },
          }))

          toast.success(`Course "${title}" deleted successfully`)
        } catch (error: any) {
          console.error("Delete course error:", error)
          toast.error(error.message || "Failed to delete course")
        }
      })
    } catch (error: any) {
      console.error("Delete course error:", error)
      toast.error(error.message || "Failed to delete course")
    }
  }

  const handleProfileUpdate = async (formData: FormData) => {
    try {
      const session = WalletAuth.getSession()
      if (!session) {
        toast.error("Please authenticate with your wallet first")
        return
      }

      startTransition(async () => {
        try {
          const result = await updateProfile(formData, session)
          if (result.success) {
            // Update local state
            setData((prev) => ({
              ...prev,
              profile: result.profile,
            }))
            setProfileDialogOpen(false)
            toast.success("Profile updated successfully")
          }
        } catch (error: any) {
          console.error("Profile update error:", error)
          toast.error(error.message || "Failed to update profile")
        }
      })
    } catch (error: any) {
      console.error("Profile update error:", error)
      toast.error(error.message || "Failed to update profile")
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Manage your courses and profile</p>
        </div>

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
            <form action={handleProfileUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input id="name" name="name" defaultValue={data.profile?.name || ""} placeholder="Your display name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  defaultValue={data.profile?.bio || ""}
                  placeholder="Tell us about yourself"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter_handle">Twitter Handle</Label>
                <Input
                  id="twitter_handle"
                  name="twitter_handle"
                  defaultValue={data.profile?.twitter_handle || ""}
                  placeholder="@username"
                />
              </div>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Updating..." : "Update Profile"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalLessons}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>
      </div>

      {/* Profile Section */}
      {data.profile && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={data.profile.avatar_url || "/placeholder.svg"} />
                <AvatarFallback>{data.profile.name?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold">{data.profile.name || "Anonymous"}</h3>
                <p className="text-muted-foreground">{data.profile.bio}</p>
                {data.profile.twitter_handle && <p className="text-sm text-blue-600">@{data.profile.twitter_handle}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Courses Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Your Courses</h2>
          <Button asChild>
            <Link href="/create-course">Create New Course</Link>
          </Button>
        </div>

        {data.courses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first course to start sharing your knowledge
              </p>
              <Button asChild>
                <Link href="/create-course">Create Your First Course</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.courses.map((course) => (
              <Card key={course.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                  <CardDescription className="line-clamp-3">
                    {course.description || "No description provided"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
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
                      variant="destructive"
                      onClick={() => handleDeleteCourse(course.id, course.title)}
                      disabled={isPending}
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
    </div>
  )
}
