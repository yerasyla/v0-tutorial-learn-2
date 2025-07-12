import { Suspense } from "react"
import { WalletGuard } from "@/components/wallet-guard"
import { CourseEditor } from "@/components/course-editor"

interface EditCoursePageProps {
  params: {
    id: string
  }
}

export default async function EditCoursePage({ params }: EditCoursePageProps) {
  return (
    <WalletGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Edit Course</h1>
            <p className="text-muted-foreground">Update your course content and lessons</p>
          </div>

          <Suspense fallback={<div>Loading course editor...</div>}>
            <CourseEditor courseId={params.id} />
          </Suspense>
        </div>
      </div>
    </WalletGuard>
  )
}
