"use client"
import { Suspense } from "react"
import { WalletGuard } from "@/components/wallet-guard"
import { CourseEditor } from "@/components/course-editor"

interface Course {
  id: string
  title: string
  description: string | null
  creator_wallet: string
  lessons: Lesson[]
}

interface Lesson {
  id: string
  title: string
  description: string | null
  youtube_url: string
  order_index: number
  course_id: string
}

interface LessonForm {
  id?: string
  title: string
  description: string
  youtube_url: string
}

interface EditCoursePageProps {
  params: {
    id: string
  }
}

export default function EditCoursePage({ params }: EditCoursePageProps) {
  return (
    <WalletGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Edit Course</h1>

          <Suspense fallback={<div>Loading course editor...</div>}>
            <CourseEditor courseId={params.id} />
          </Suspense>
        </div>
      </div>
    </WalletGuard>
  )
}
