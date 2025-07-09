"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase, type Course, type Lesson } from "@/lib/supabase"
import { VerifiedBadge } from "@/components/verified-badge"

type CourseWithLessons = Course & {
  lessons: Lesson[]
}

export function FeaturedCourses() {
  const [courses, setCourses] = useState<CourseWithLessons[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchFeaturedCourses()
  }, [])

  const fetchFeaturedCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          lessons (*),
          user_profiles (
            display_name,
            is_verified
          )
        `)
        .order("created_at", { ascending: false })
        .limit(8)

      if (error) {
        throw error
      }

      // Sort lessons by order_index for each course
      const coursesWithSortedLessons =
        data?.map((course) => ({
          ...course,
          lessons: course.lessons?.sort((a: Lesson, b: Lesson) => a.order_index - b.order_index) || [],
        })) || []

      setCourses(coursesWithSortedLessons)
    } catch (error) {
      console.error("Error fetching featured courses:", error)
    } finally {
      setIsLoading(false)
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

  const getCreatorDisplayName = (course: any) => {
    if (course.user_profiles && course.user_profiles.length > 0) {
      return (
        course.user_profiles[0].display_name ||
        `${course.creator_wallet.slice(0, 6)}...${course.creator_wallet.slice(-4)}`
      )
    }
    return `${course.creator_wallet.slice(0, 6)}...${course.creator_wallet.slice(-4)}`
  }

  const isCreatorVerified = (course: any) => {
    return course.user_profiles && course.user_profiles.length > 0 && course.user_profiles[0].is_verified
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="overflow-hidden animate-pulse">
            <div className="aspect-video bg-muted"></div>
            <CardHeader className="p-4 pb-2">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No courses available yet.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {courses.map((course) => {
        const thumbnailUrl = getFirstVideoThumbnail(course.lessons)
        const creatorName = getCreatorDisplayName(course)
        const isVerified = isCreatorVerified(course)

        return (
          <Link key={course.id} href={`/courses/${course.id}`}>
            <Card className="overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-all duration-200 group h-full cursor-pointer">
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
                <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                  <span>by {creatorName}</span>
                  {isVerified && <VerifiedBadge size="sm" />}
                </div>
              </CardHeader>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
