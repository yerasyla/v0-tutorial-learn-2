"use client"

import { useState, useCallback, memo } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { VerifiedBadge } from "@/components/verified-badge"
import { LazyImage } from "@/components/lazy-image"
import { useOptimizedQuery } from "@/hooks/use-optimized-query"
import { supabase, type Course, type Lesson, type UserProfile } from "@/lib/supabase"
import { Play, BookOpen, ArrowLeft, ArrowRight } from "@phosphor-icons/react"

type CourseWithLessons = Course & {
  lessons: Lesson[]
}

type CourseWithCreatorProfile = CourseWithLessons & {
  creator_profile?: UserProfile | null
}

interface PaginatedCoursesProps {
  pageSize?: number
}

const CourseCard = memo(({ course }: { course: CourseWithCreatorProfile }) => {
  const getFirstVideoThumbnail = useCallback((lessons: Lesson[]) => {
    if (lessons.length === 0) return "/placeholder.svg?height=200&width=300"

    const firstLesson = lessons.sort((a, b) => a.order_index - b.order_index)[0]
    const match = firstLesson.youtube_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    const videoId = match ? match[1] : null

    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : "/placeholder.svg?height=200&width=300"
  }, [])

  const getCreatorDisplayName = useCallback((course: CourseWithCreatorProfile) => {
    if (course.creator_profile?.display_name) {
      return course.creator_profile.display_name
    }
    return `${course.creator_wallet.slice(0, 6)}...${course.creator_wallet.slice(-4)}`
  }, [])

  const getCreatorAvatarFallback = useCallback((course: CourseWithCreatorProfile) => {
    if (course.creator_profile?.display_name) {
      return course.creator_profile.display_name.charAt(0).toUpperCase()
    }
    return course.creator_wallet.charAt(2).toUpperCase()
  }, [])

  const thumbnailUrl = getFirstVideoThumbnail(course.lessons)

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-border hover:border-brand-primary group bg-card">
      <div className="aspect-video relative overflow-hidden">
        <LazyImage
          src={thumbnailUrl}
          alt={course.title}
          className="w-full h-full group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Play size={56} className="text-white" weight="fill" />
        </div>
        {course.creator_profile?.is_verified && (
          <div className="absolute top-4 left-4">
            <VerifiedBadge isVerified={true} size="md" variant="card" />
          </div>
        )}
      </div>
      <CardHeader className="p-6 pb-4">
        <CardTitle className="line-clamp-2 text-xl leading-tight mb-3 text-card-foreground">{course.title}</CardTitle>
        <CardDescription className="line-clamp-3 text-base leading-relaxed text-muted-foreground mb-4">
          {course.description}
        </CardDescription>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <Link
            href={`/creator/${course.creator_wallet}`}
            className="flex items-center hover:text-brand-primary transition-colors group/creator"
          >
            <Avatar className="h-6 w-6 mr-3">
              <AvatarImage src={course.creator_profile?.avatar_url || "/placeholder.svg"} alt="Creator" />
              <AvatarFallback className="text-xs bg-muted font-medium text-muted-foreground">
                {getCreatorAvatarFallback(course)}
              </AvatarFallback>
            </Avatar>
            <span className="group-hover/creator:underline font-medium">{getCreatorDisplayName(course)}</span>
            {course.creator_profile?.is_verified && <VerifiedBadge isVerified={true} size="sm" className="ml-2" />}
          </Link>
          <div className="flex items-center">
            <BookOpen size={16} className="mr-2" />
            <span className="font-medium">
              {course.lessons.length} lesson{course.lessons.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <Link href={`/courses/${course.id}`}>
          <Button className="w-full h-12 text-base font-semibold bg-brand-primary hover:bg-brand-secondary text-primary-foreground">
            <Play size={18} className="mr-3" weight="fill" />
            Start Course
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
})

CourseCard.displayName = "CourseCard"

export const PaginatedCourses = memo(({ pageSize = 9 }: PaginatedCoursesProps) => {
  const [currentPage, setCurrentPage] = useState(1)

  const {
    data: coursesData,
    isLoading,
    error,
  } = useOptimizedQuery<{
    courses: CourseWithCreatorProfile[]
    totalCount: number
  }>({
    queryKey: `courses-page-${currentPage}-${pageSize}`,
    queryFn: async () => {
      const from = (currentPage - 1) * pageSize
      const to = from + pageSize - 1

      // Get total count
      const { count } = await supabase.from("courses").select("*", { count: "exact", head: true })

      // Get paginated courses
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          lessons (*)
        `)
        .order("created_at", { ascending: false })
        .range(from, to)

      if (error) throw error

      // Fetch creator profiles
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
            return {
              ...course,
              creator_profile: null,
            }
          }
        }),
      )

      return {
        courses: coursesWithProfiles,
        totalCount: count || 0,
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
  })

  const totalPages = Math.ceil((coursesData?.totalCount || 0) / pageSize)

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...Array(pageSize)].map((_, i) => (
          <Card key={i} className="animate-pulse overflow-hidden bg-card border-border">
            <div className="aspect-video bg-muted"></div>
            <CardHeader className="p-6">
              <div className="h-6 bg-muted rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="h-10 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !coursesData?.courses || coursesData.courses.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto border-2 border-border bg-card shadow-lg">
        <CardContent className="text-center py-16 px-8">
          <BookOpen size={64} className="text-muted-foreground mx-auto mb-6" />
          <h3 className="text-2xl font-semibold text-foreground mb-4">No courses yet</h3>
          <p className="text-muted-foreground text-lg leading-relaxed mb-8">
            Be the first to create a course and share your knowledge with the community!
          </p>
          <Link href="/create-course">
            <Button
              size="lg"
              className="bg-brand-primary hover:bg-brand-secondary text-primary-foreground px-8 py-4 text-lg h-14"
            >
              <BookOpen size={20} className="mr-3" />
              Create First Course
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {coursesData.courses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="border-2 border-border hover:bg-accent"
          >
            <ArrowLeft size={16} className="mr-1" />
            Previous
          </Button>

          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                  className={
                    currentPage === pageNum
                      ? "bg-brand-primary hover:bg-brand-secondary text-primary-foreground"
                      : "border-2 border-border hover:bg-accent"
                  }
                >
                  {pageNum}
                </Button>
              )
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="border-2 border-border hover:bg-accent"
          >
            Next
            <ArrowRight size={16} className="ml-1" />
          </Button>
        </div>
      )}

      {/* Results info */}
      <div className="text-center text-sm text-muted-foreground">
        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, coursesData.totalCount)} of{" "}
        {coursesData.totalCount} courses
      </div>
    </div>
  )
})

PaginatedCourses.displayName = "PaginatedCourses"
