"use client"

import { useState, useCallback, memo } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { OptimizedCourseCard } from "@/components/optimized-course-card"
import { useOptimizedQuery } from "@/hooks/use-optimized-query"
import { supabase, type Course, type Lesson, type UserProfile } from "@/lib/supabase"

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
      console.log("[v0] Starting course query...")

      const from = (currentPage - 1) * pageSize
      const to = from + pageSize - 1

      console.log("[v0] Fetching course count...")
      const { count } = await supabase.from("courses_sol").select("*", { count: "exact", head: true })
      console.log("[v0] Total courses found:", count)

      console.log("[v0] Fetching courses from", from, "to", to)
      const { data, error } = await supabase
        .from("courses_sol")
        .select(`
          *,
          lessons_sol (*)
        `)
        .order("created_at", { ascending: false })
        .range(from, to)

      if (error) {
        console.error("[v0] Error fetching courses:", error)
        throw error
      }

      console.log("[v0] Raw courses data:", data)
      console.log("[v0] Number of courses fetched:", data?.length || 0)

      const coursesWithProfiles = await Promise.all(
        (data || []).map(async (course) => {
          try {
            console.log("[v0] Fetching profile for creator_wallet:", course.creator_wallet)
            const { data: profileData, error: profileError } = await supabase
              .from("user_profiles_sol")
              .select("*")
              .eq("solana_wallet_address", course.creator_wallet)
              .single()

            if (profileError && profileError.code !== "PGRST116") {
              console.error("Error fetching creator profile:", profileError)
            }

            return {
              ...course,
              lessons: course.lessons_sol || [], // Map lessons_sol to lessons
              user_profiles: profileData ? [profileData] : [], // Map creator_profile to user_profiles array
              creator_profile: profileData || null,
            }
          } catch (error) {
            console.error("[v0] Error in profile fetch for course:", course.id, error)
            return {
              ...course,
              lessons: course.lessons_sol || [], // Map lessons_sol to lessons even on error
              user_profiles: [], // Empty array on error
              creator_profile: null,
            }
          }
        }),
      )

      console.log("[v0] Final courses with profiles:", coursesWithProfiles)
      console.log("[v0] Returning data - courses count:", coursesWithProfiles.length, "total count:", count)

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
    console.log("[v0] No courses to display - error:", error)
    console.log("[v0] coursesData:", coursesData)
    console.log("[v0] courses array:", coursesData?.courses)
    console.log("[v0] courses length:", coursesData?.courses?.length)

    return (
      <Card className="max-w-2xl mx-auto border-2 border-border bg-card shadow-lg">
        <CardContent className="text-center py-16 px-8">
          <svg
            className="w-16 h-16 text-muted-foreground mx-auto mb-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <h3 className="text-2xl font-semibold text-foreground mb-4">No courses yet</h3>
          <p className="text-muted-foreground text-lg leading-relaxed mb-8">
            Be the first to create a course and share your knowledge with the community!
          </p>
          <Link href="/create-course">
            <Button
              size="lg"
              className="bg-brand-primary hover:bg-brand-secondary text-primary-foreground px-8 py-4 text-lg h-14"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              Create First Course
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, coursesData.totalCount)} of{" "}
        {coursesData.totalCount} courses
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {coursesData.courses.map((course) => (
          <OptimizedCourseCard key={course.id} course={course} />
        ))}
      </div>

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
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
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
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      )}
    </div>
  )
})

OptimizedPaginatedCourses.displayName = "OptimizedPaginatedCourses"
