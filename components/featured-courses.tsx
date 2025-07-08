"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { VerifiedBadge } from "@/components/verified-badge"
import { supabase, type Course, type Lesson, type UserProfile } from "@/lib/supabase"
import { Play, BookOpen } from "@phosphor-icons/react"

type CourseWithLessons = Course & {
  lessons: Lesson[]
}

type CourseWithCreatorProfile = CourseWithLessons & {
  creator_profile?: UserProfile | null
}

export function FeaturedCourses() {
  const [courses, setCourses] = useState<CourseWithCreatorProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchFeaturedCourses()
  }, [])

  const fetchFeaturedCourses = async () => {
    try {
      // Fetch the latest 6 courses with lessons
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          lessons (*)
        `)
        .order("created_at", { ascending: false })
        .limit(6)

      if (error) {
        console.error("Error fetching featured courses:", error)
        return
      }

      // Fetch creator profiles for all courses
      const coursesWithProfiles = await Promise.all(
        (data || []).map(async (course) => {
          try {
            const { data: profileData, error: profileError } = await supabase
              .from("user_profiles")
              .select("*")
              .eq("wallet_address", course.creator_wallet.toLowerCase())
              .single()

            if (profileError && profileError.code !== "PGRST116") {
              console.error("Error fetching creator profile:", profileError)
            }

            return {
              ...course,
              creator_profile: profileData || null,
            }
          } catch (error) {
            console.error("Error fetching creator profile for course:", course.id, error)
            return {
              ...course,
              creator_profile: null,
            }
          }
        }),
      )

      setCourses(coursesWithProfiles)
    } catch (error) {
      console.error("Error fetching featured courses:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getFirstVideoThumbnail = (lessons: Lesson[]) => {
    if (lessons.length === 0) return "/placeholder.svg?height=200&width=350"

    const firstLesson = lessons.sort((a, b) => a.order_index - b.order_index)[0]
    const match = firstLesson.youtube_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    const videoId = match ? match[1] : null

    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : "/placeholder.svg?height=200&width=350"
  }

  const getCreatorDisplayName = (course: CourseWithCreatorProfile) => {
    if (course.creator_profile?.display_name) {
      return course.creator_profile.display_name
    }
    return `${course.creator_wallet.slice(0, 6)}...${course.creator_wallet.slice(-4)}`
  }

  const getCreatorAvatar = (course: CourseWithCreatorProfile) => {
    return course.creator_profile?.avatar_url || ""
  }

  const getCreatorAvatarFallback = (course: CourseWithCreatorProfile) => {
    if (course.creator_profile?.display_name) {
      return course.creator_profile.display_name.charAt(0).toUpperCase()
    }
    return course.creator_wallet.charAt(2).toUpperCase()
  }

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="bg-card border-2 border-border overflow-hidden animate-pulse">
            <div className="aspect-video bg-muted"></div>
            <div className="p-6">
              <div className="h-6 bg-muted rounded mb-3"></div>
              <div className="h-4 bg-muted rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-20">
        <BookOpen size={64} className="text-muted-foreground mx-auto mb-6" />
        <h3 className="text-2xl font-bold text-foreground mb-4">No courses available yet</h3>
        <p className="text-muted-foreground text-lg mb-8">Be the first to create a course and share your knowledge!</p>
        <Link href="/create-course">
          <button className="bg-brand-primary hover:bg-brand-secondary text-primary-foreground font-semibold px-8 py-4 rounded-lg text-lg transition-colors">
            Create First Course
          </button>
        </Link>
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
      {courses.map((course) => {
        const thumbnailUrl = getFirstVideoThumbnail(course.lessons)

        return (
          <Link key={course.id} href={`/courses/${course.id}`}>
            <Card className="bg-card border-2 border-border hover:border-brand-primary transition-all duration-300 group overflow-hidden cursor-pointer">
              <div className="aspect-video relative overflow-hidden">
                <img
                  src={thumbnailUrl || "/placeholder.svg"}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Play size={48} className="text-white" weight="fill" />
                </div>

                {/* Perfect circular verified badge */}
                {course.creator_profile?.is_verified && (
                  <div className="absolute top-4 left-4">
                    <VerifiedBadge isVerified={true} size="md" variant="overlay" />
                  </div>
                )}

                {/* Course info overlay */}
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="text-white mb-3">
                    <h3 className="text-lg font-semibold mb-2 line-clamp-2 leading-tight">{course.title}</h3>
                    <div className="flex items-center justify-between text-sm opacity-90">
                      <div className="flex items-center">
                        <Avatar className="h-5 w-5 mr-2">
                          <AvatarImage src={getCreatorAvatar(course) || "/placeholder.svg"} alt="Creator" />
                          <AvatarFallback className="text-xs bg-gray-100 text-gray-900">
                            {getCreatorAvatarFallback(course)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{getCreatorDisplayName(course)}</span>
                        {course.creator_profile?.is_verified && (
                          <VerifiedBadge isVerified={true} size="sm" className="ml-1" />
                        )}
                      </div>
                      <div className="flex items-center">
                        <BookOpen size={14} className="mr-1" />
                        <span>
                          {course.lessons.length} lesson{course.lessons.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
