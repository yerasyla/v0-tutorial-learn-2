"use client"

import { useState, useCallback, memo } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { OptimizedCourseCard } from "@/components/optimized-course-card"
import { useOptimizedQuery } from "@/hooks/use-optimized-query"
import { supabase, type Course, type Lesson, type UserProfile } from "@/lib/supabase"
import { ArrowLeft, ArrowRight, BookOpen } from "@phosphor-icons/react"

type CourseWithLessons = Course & {
  lessons: Lesson[]
}

type CourseWithCreatorProfile = CourseWithLessons & {
  creator_profile?: UserProfile | null
}

interface OptimizedPaginatedCoursesProps {
  pageSize?: number
}

export const OptimizedPaginatedCourses = memo(({ pageSize = 15 }: OptimizedPaginatedCoursesProps) => {
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
      <div className="space-y-6">
        <div className="text-sm text-muted-foreground">Loading courses...</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {[...Array(pageSize)].map((_, i) => (
            <Card key={i} className="animate-pulse overflow-hidden bg-card border-border h-full">
              <div className="aspect-video bg-muted"></div>
              <div className="p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2 mb-3"></div>
                <div className="h-8 bg-muted rounded"></div>
              </div>
            </Card>
          ))}
        </div>
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
    <div className="space-y-6">
      {/* Course count info */}
      <div className="text-sm text-muted-foreground">
        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, coursesData.totalCount)} of{" "}
        {coursesData.totalCount} courses
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {coursesData.courses.map((course) => (
          <OptimizedCourseCard key={course.id} course={course} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="flex items-center space-x-2">
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
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 7) {
                  pageNum = i + 1
                } else if (currentPage <= 4) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 3) {
                  pageNum = totalPages - 6 + i
                } else {
                  pageNum = currentPage - 3 + i
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className={
                      currentPage === pageNum
                        ? "bg-brand-primary hover:bg-brand-secondary text-primary-foreground min-w-[2.5rem]"
                        : "border-2 border-border hover:bg-accent min-w-[2.5rem]"
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

          {/* Page info for mobile */}
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      )}
    </div>
  )
})

OptimizedPaginatedCourses.displayName = "OptimizedPaginatedCourses"
