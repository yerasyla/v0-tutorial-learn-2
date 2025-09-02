"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { SolanaAuth } from "@/lib/solana-auth"
import { getCourseForEdit } from "@/app/actions/secure-course-actions"
import CourseEditor from "@/components/course-editor"

export default function EditCoursePage() {
  const params = useParams()
  const router = useRouter()
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadCourse() {
      try {
        const session = SolanaAuth.getSession()
        if (!session) {
          router.push("/")
          return
        }

        const courseData = await getCourseForEdit(params.id as string, session)
        setCourse(courseData)
      } catch (error: any) {
        console.error("Course load error:", error)
        setError(error.message || "Failed to load course")
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadCourse()
    }
  }, [params.id, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Course Not Found</h1>
          <p className="text-muted-foreground">
            The course you're looking for doesn't exist or you don't have permission to edit it.
          </p>
        </div>
      </div>
    )
  }

  return <CourseEditor course={course} />
}
