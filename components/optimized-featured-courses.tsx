"use client"

import { memo } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { OptimizedCourseCard } from "@/components/optimized-course-card"
import { useOptimizedQuery } from "@/hooks/use-optimized-query"
import { supabase, type Course, type Lesson, type UserProfile } from "@/lib/supabase"

const BookOpen = ({ size = 24, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className}
  >
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
)

type CourseWithLessons = Course & {
  lessons: Lesson[]
}

type CourseWithCreatorProfile = CourseWithLessons & {
  creator_profile?: UserProfile | null
}

export const OptimizedFeaturedCourses = memo(() => {
  const {
    data: courses,
    isLoading,
    error,
  } = useOptimizedQuery<CourseWithCreatorProfile[]>({
    queryKey: "featured-courses-optimized",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses_sol")
        .select(`
          *,
          lessons_sol (*)
        `)
        .order("created_at", { ascending: false })
        .limit(8) // Show more courses in featured section

      if (error) throw error

      const coursesWithProfiles = await Promise.all(
        (data || []).map(async (course) => {
          try {
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
              lessons: course.lessons_sol || [],
              creator_profile: profileData || null,
            }
          } catch (error) {
            return {
              ...course,
              lessons: course.lessons_sol || [],
              creator_profile: null,
            }
          }
        }),
      )

      return coursesWithProfiles
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-16">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="bg-card border border-border overflow-hidden animate-pulse h-full">
            <div className="aspect-video bg-muted"></div>
            <div className="p-4">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded w-2/3 mb-3"></div>
              <div className="h-8 bg-muted rounded"></div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !courses || courses.length === 0) {
    return (
      <div className="text-center py-16">
        <BookOpen size={64} className="text-muted-foreground mx-auto mb-6" />
        <h3 className="text-2xl font-bold text-foreground mb-4">No courses available yet</h3>
        <p className="text-muted-foreground text-lg mb-8">Be the first to create a course and share your knowledge!</p>
        <Link href="/create-course">
          <Button className="bg-brand-primary hover:bg-brand-secondary text-primary-foreground font-semibold px-8 py-4 rounded-lg text-lg transition-colors">
            Create First Course
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-16">
      {courses.map((course) => (
        <OptimizedCourseCard key={course.id} course={course} />
      ))}
    </div>
  )
})

OptimizedFeaturedCourses.displayName = "OptimizedFeaturedCourses"
