"use client"

import type React from "react"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Plus, GripVertical, ChevronUp, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { updateCourse } from "@/app/actions/secure-course-actions"
import { SolanaAuth } from "@/lib/solana-auth"

interface Lesson {
  id?: string
  title: string
  youtube_url: string
  order_index: number
}

interface Course {
  id: string
  title: string
  description: string
  lessons: Lesson[]
}

interface CourseEditorProps {
  course: Course
}

export default function CourseEditor({ course }: CourseEditorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [courseTitle, setCourseTitle] = useState(course.title)
  const [courseDescription, setCourseDescription] = useState(course.description || "")
  const [lessons, setLessons] = useState<Lesson[]>(
    course.lessons.map((lesson, index) => ({
      ...lesson,
      order_index: index,
    })),
  )

  const addLesson = () => {
    const newLesson: Lesson = {
      title: "",
      youtube_url: "",
      order_index: lessons.length,
    }
    setLessons([...lessons, newLesson])
  }

  const removeLesson = (index: number) => {
    const updatedLessons = lessons.filter((_, i) => i !== index)
    // Reorder the remaining lessons
    const reorderedLessons = updatedLessons.map((lesson, i) => ({
      ...lesson,
      order_index: i,
    }))
    setLessons(reorderedLessons)
  }

  const updateLesson = (index: number, field: keyof Lesson, value: string) => {
    const updatedLessons = lessons.map((lesson, i) => (i === index ? { ...lesson, [field]: value } : lesson))
    setLessons(updatedLessons)
  }

  const moveLessonUp = (index: number) => {
    if (index === 0) return
    const updatedLessons = [...lessons]
    const temp = updatedLessons[index]
    updatedLessons[index] = updatedLessons[index - 1]
    updatedLessons[index - 1] = temp

    // Update order_index
    updatedLessons[index].order_index = index
    updatedLessons[index - 1].order_index = index - 1

    setLessons(updatedLessons)
  }

  const moveLessonDown = (index: number) => {
    if (index === lessons.length - 1) return
    const updatedLessons = [...lessons]
    const temp = updatedLessons[index]
    updatedLessons[index] = updatedLessons[index + 1]
    updatedLessons[index + 1] = temp

    // Update order_index
    updatedLessons[index].order_index = index
    updatedLessons[index + 1].order_index = index + 1

    setLessons(updatedLessons)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!courseTitle.trim()) {
      toast.error("Course title is required")
      return
    }

    // Validate lessons
    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i]
      if (!lesson.title.trim()) {
        toast.error(`Lesson ${i + 1} title is required`)
        return
      }
      if (!lesson.youtube_url.trim()) {
        toast.error(`Lesson ${i + 1} YouTube URL is required`)
        return
      }
    }

    try {
      const session = SolanaAuth.getSession()
      if (!session) {
        toast.error("Please authenticate with your wallet first")
        return
      }

      startTransition(async () => {
        try {
          await updateCourse(
            course.id,
            {
              title: courseTitle.trim(),
              description: courseDescription.trim(),
            },
            lessons.map((lesson, index) => ({
              ...lesson,
              order_index: index,
            })),
            session,
          )

          toast.success("Course updated successfully!")
          router.push("/dashboard")
        } catch (error: any) {
          console.error("Update course error:", error)
          toast.error(error.message || "Failed to update course")
        }
      })
    } catch (error: any) {
      console.error("Update course error:", error)
      toast.error(error.message || "Failed to update course")
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Edit Course</h1>
          <p className="text-muted-foreground">Update your course content and lessons</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Course Details */}
          <Card>
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
              <CardDescription>Basic information about your course</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title *</Label>
                <Input
                  id="title"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="Enter course title"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Course Description</Label>
                <Textarea
                  id="description"
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                  placeholder="Describe what students will learn"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Lessons */}
          <Card>
            <CardHeader>
              <CardTitle>Course Lessons</CardTitle>
              <CardDescription>Add and organize your course lessons</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {lessons.map((lesson, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Lesson {index + 1}</h4>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => moveLessonUp(index)}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => moveLessonDown(index)}
                        disabled={index === lessons.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Button type="button" variant="destructive" size="sm" onClick={() => removeLesson(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`lesson-title-${index}`}>Lesson Title *</Label>
                      <Input
                        id={`lesson-title-${index}`}
                        value={lesson.title}
                        onChange={(e) => updateLesson(index, "title", e.target.value)}
                        placeholder="Enter lesson title"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`lesson-url-${index}`}>YouTube URL *</Label>
                      <Input
                        id={`lesson-url-${index}`}
                        value={lesson.youtube_url}
                        onChange={(e) => updateLesson(index, "youtube_url", e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={addLesson} className="w-full bg-transparent">
                <Plus className="h-4 w-4 mr-2" />
                Add Lesson
              </Button>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? "Updating..." : "Update Course"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard")} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
