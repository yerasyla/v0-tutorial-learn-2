"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase, type Course, type Lesson } from "@/lib/supabase"
import { useWeb3 } from "@/contexts/web3-context"
import { toast } from "@/hooks/use-toast"
import { Plus, PencilSimple, Trash, Eye, BookOpen, WarningCircle, TrendUp, Play } from "@phosphor-icons/react"
import { deleteCourseSecure } from "@/app/actions/course-actions"

type CourseWithLessons = Course & {
  lessons: Lesson[]
}

export default function CreatorDashboard() {
  const [courses, setCourses] = useState<CourseWithLessons[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalLessons: 0,
    totalDonations: 0,
  })
  const { account, isConnected } = useWeb3()

  useEffect(() => {
    if (isConnected && account) {
      fetchCreatorData()
    } else {
      setIsLoading(false)
    }
  }, [isConnected, account])

  const fetchCreatorData = async () => {
    if (!account) return

    try {
      // Fetch courses with lessons - with proper authorization
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select(`
          *,
          lessons (*)
        `)
        .eq("creator_wallet", account.toLowerCase())
        .order("created_at", { ascending: false })

      if (coursesError) {
        throw coursesError
      }

      // Sort lessons by order_index for each course
      const coursesWithSortedLessons =
        coursesData?.map((course) => ({
          ...course,
          lessons: course.lessons?.sort((a: Lesson, b: Lesson) => a.order_index - b.order_index) || [],
        })) || []

      setCourses(coursesWithSortedLessons)

      // Calculate course and lesson stats
      const totalLessons = coursesWithSortedLessons.reduce((sum, course) => sum + course.lessons.length, 0)

      // Fetch donations for all creator's courses
      let totalDonationsAmount = 0

      if (coursesWithSortedLessons.length > 0) {
        const courseIds = coursesWithSortedLessons.map((course) => course.id)

        const { data: donationsData, error: donationsError } = await supabase
          .from("donations")
          .select("amount")
          .in("course_id", courseIds)

        if (donationsError) {
          console.error("Error fetching donations:", donationsError)
          // Don't throw error, just log it and continue with 0 donations
        } else if (donationsData) {
          // Calculate total donations by summing all amounts
          totalDonationsAmount = donationsData.reduce((sum, donation) => {
            const amount = Number.parseFloat(donation.amount) || 0
            return sum + amount
          }, 0)
        }
      }

      // Update stats
      setStats({
        totalCourses: coursesWithSortedLessons.length,
        totalLessons,
        totalDonations: totalDonationsAmount,
      })

      console.log("Dashboard stats calculated:", {
        totalCourses: coursesWithSortedLessons.length,
        totalLessons,
        totalDonations: totalDonationsAmount,
      })
    } catch (error) {
      console.error("Error fetching creator data:", error)
      toast({
        title: "Error loading dashboard",
        description: "Failed to load your dashboard data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const deleteCourse = async (courseId: string) => {
    if (!confirm("Are you sure you want to delete this course? This action cannot be undone.")) {
      return
    }

    if (!account) {
      toast({
        title: "Authentication error",
        description: "Please ensure your wallet is connected.",
        variant: "destructive",
      })
      return
    }

    try {
      const result = await deleteCourseSecure(courseId, account)

      if (!result.success) {
        toast({
          title: "Error deleting course",
          description: result.error || "Failed to delete the course. Please try again.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Course deleted",
        description: "Your course has been successfully deleted.",
      })

      // Refresh data after deletion
      fetchCreatorData()
    } catch (error) {
      console.error("Error deleting course:", error)
      toast({
        title: "Error deleting course",
        description: "Failed to delete the course. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getFirstVideoThumbnail = (lessons: Lesson[]) => {
    if (lessons.length === 0) return "/placeholder.svg?height=160&width=280"

    const firstLesson = lessons[0]

    // Match regular YouTube videos
    let match = firstLesson.youtube_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
    }

    // Match YouTube Shorts
    match = firstLesson.youtube_url.match(/youtube\.com\/shorts\/([^&\n?#]+)/)
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
    }

    return "/placeholder.svg?height=160&width=280"
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Alert className="border-2 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
            <WarningCircle size={18} className="text-orange-600 dark:text-orange-400" />
            <AlertDescription className="text-orange-800 dark:text-orange-200 text-sm leading-relaxed ml-2">
              Please connect your wallet to access the creator dashboard.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse">
            <div className="flex justify-between items-center mb-8">
              <div>
                <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
              <div className="h-10 bg-muted rounded w-32"></div>
            </div>
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded-lg"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-64 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2 leading-tight">Creator Dashboard</h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              Manage your courses and track your progress
            </p>
          </div>
          <Link href="/create-course">
            <Button
              size="sm"
              className="bg-brand-primary hover:bg-brand-secondary text-primary-foreground px-6 py-2 text-sm h-10 font-semibold"
            >
              <Plus size={16} className="mr-2" />
              Create Course
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Courses</CardTitle>
              <BookOpen size={18} className="text-brand-primary" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-foreground">{stats.totalCourses}</div>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Lessons</CardTitle>
              <Play size={18} className="text-green-600" weight="fill" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-foreground">{stats.totalLessons}</div>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Donations</CardTitle>
              <TrendUp size={18} className="text-purple-600" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-foreground">{stats.totalDonations.toFixed(2)} TUT</div>
              <p className="text-xs text-muted-foreground mt-1">Across all courses</p>
            </CardContent>
          </Card>
        </div>

        {/* Courses Grid */}
        {courses.length === 0 ? (
          <Card className="max-w-xl mx-auto border border-border bg-card shadow-sm">
            <CardContent className="text-center py-12 px-6">
              <BookOpen size={48} className="text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-3">No courses yet</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Create your first course to start sharing your knowledge!
              </p>
              <Link href="/create-course">
                <Button
                  size="sm"
                  className="bg-brand-primary hover:bg-brand-secondary text-primary-foreground px-6 py-2 text-sm h-10 font-semibold"
                >
                  <Plus size={16} className="mr-2" />
                  Create Your First Course
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {courses.map((course) => {
              const thumbnailUrl = getFirstVideoThumbnail(course.lessons)

              return (
                <Card
                  key={course.id}
                  className="overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-all duration-200 group h-full"
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={thumbnailUrl || "/placeholder.svg"}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="bg-white/90 text-gray-900 font-medium text-xs px-2 py-1">
                        {course.lessons.length} lesson{course.lessons.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </div>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="line-clamp-2 text-sm font-semibold leading-tight mb-2 text-card-foreground">
                      {course.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-xs leading-relaxed text-muted-foreground mb-2">
                      {course.description}
                    </CardDescription>
                    <div className="text-xs text-muted-foreground font-medium">
                      {new Date(course.created_at).toLocaleDateString()}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex gap-2">
                      <Link href={`/courses/${course.id}`} className="flex-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-8 text-xs border border-border bg-transparent hover:bg-accent"
                        >
                          <Eye size={12} className="mr-1" />
                          View
                        </Button>
                      </Link>
                      <Link href={`/dashboard/edit/${course.id}`} className="flex-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-8 text-xs border border-border bg-transparent hover:bg-accent"
                        >
                          <PencilSimple size={12} className="mr-1" />
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteCourse(course.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 h-8 px-2"
                      >
                        <Trash size={12} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
