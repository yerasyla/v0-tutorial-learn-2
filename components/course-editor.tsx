"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWeb3 } from "@/contexts/web3-context"
import { getCourseForEdit, updateCourse, type LessonUpdateData } from "@/app/actions/secure-course-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { Trash2, Plus, GripVertical, ChevronUp, ChevronDown } from "lucide-react"

interface CourseEditorProps {
  courseId: string
}

interface CourseData {
  id: string
  title: string
  description: string | null
  lessons: any[]
}

export function CourseEditor({ courseId }: CourseEditorProps) {
  const router = useRouter()
  const { getAuthSession } = useWeb3()
  const [course, setCourse] = useState<CourseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [courseTitle, setCourseTitle] = useState("")
  const [courseDescription, setCourseDescription] = useState("")
  const [lessons, setLessons] = useState<LessonUpdateData[]>([])

  // Load course data
  useEffect(() => {
    const loadCourse = async () => {
      try {
        const session = getAuthSession()
        if (!session) {
          toast({
            title: "Authentication Required",
            description: "Please sign in with your wallet first.",
            variant: "destructive",
          })
          router.push("/dashboard")
          return
        }

        const courseData = await getCourseForEdit(courseId, session)
        setCourse(courseData)
        setCourseTitle(courseData.title)
        setCourseDescription(courseData.description || "")

        // Convert lessons to the format expected by the form
        const formattedLessons = courseData.lessons.map((lesson: any) => ({
          id: lesson.id,
          title: lesson.title,
          youtube_url: lesson.youtube_url,
          order_index: lesson.order_index,
        }))
        setLessons(formattedLessons)
      } catch (error) {
        console.error("Failed to load course:", error)
        toast({
          title: "Error",
          description: "Failed to load course data",
          variant: "destructive",
        })
        router.push("/dashboard")
      } finally {
        setLoading(false)
      }
    }

    loadCourse()
  }, [courseId, getAuthSession, router])

  const addLesson = () => {
    const newLesson: LessonUpdateData = {
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

  const updateLesson = (index: number, field: keyof LessonUpdateData, value: string | number) => {
    const updatedLessons = [...lessons]
    updatedLessons[index] = { ...updatedLessons[index], [field]: value }
    setLessons(updatedLessons)
  }

  const moveLessonUp = (index: number) => {
    if (index === 0) return
    const updatedLessons = [...lessons]
    const temp = updatedLessons[index]
    updatedLessons[index] = updatedLessons[index - 1]
    updatedLessons[index - 1] = temp

    // Update order indices
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

    // Update order indices
    updatedLessons[index].order_index = index
    updatedLessons[index + 1].order_index = index + 1

    setLessons(updatedLessons)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!courseTitle.trim()) {
      toast({
        title: "Validation Error",
        description: "Course title is required",
        variant: "destructive",
      })
      return
    }

    // Validate lessons
    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i]
      if (!lesson.title.trim()) {
        toast({
          title: "Validation Error",
          description: `Lesson ${i + 1} title is required`,
          variant: "destructive",
        })
        return
      }
      if (!lesson.youtube_url.trim()) {
        toast({
          title: "Validation Error",
          description: `Lesson ${i + 1} YouTube URL is required`,
          variant: "destructive",
        })
        return
      }
    }

    setSaving(true)

    try {
      const session = getAuthSession()
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in with your wallet first.",
          variant: "destructive",
        })
        return
      }

      await updateCourse(
        courseId,
        {
          title: courseTitle.trim(),
          description: courseDescription.trim(),
        },
        lessons,
        session,
      )

      toast({
        title: "Course Updated",
        description: "Your course has been updated successfully!",
      })

      router.push("/dashboard")
    } catch (error) {
      console.error("Failed to update course:", error)
      toast({
        title: "Error",
        description: "Failed to update course",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading course editor...</div>
  }

  if (!course) {
    return <div className="text-center py-8">Course not found</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Course Details */}
      <Card>
        <CardHeader>
          <CardTitle>Course Details</CardTitle>
          <CardDescription>Basic information about your course</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Course Title *</Label>
            <Input
              id="title"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              placeholder="Enter course title"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Course Description</Label>
            <Textarea
              id="description"
              value={courseDescription}
              onChange={(e) => setCourseDescription(e.target.value)}
              placeholder="Describe what students will learn in this course"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lessons */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Course Lessons</CardTitle>
              <CardDescription>Add and organize your course lessons</CardDescription>
            </div>
            <Button type="button" onClick={addLesson} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Lesson
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {lessons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No lessons yet. Click "Add Lesson" to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {lessons.map((lesson, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Lesson {index + 1}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveLessonUp(index)}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveLessonDown(index)}
                          disabled={index === lessons.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLesson(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label htmlFor={`lesson-title-${index}`}>Lesson Title *</Label>
                      <Input
                        id={`lesson-title-${index}`}
                        value={lesson.title}
                        onChange={(e) => updateLesson(index, "title", e.target.value)}
                        placeholder="Enter lesson title"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor={`lesson-url-${index}`}>YouTube URL *</Label>
                      <Input
                        id={`lesson-url-${index}`}
                        value={lesson.youtube_url}
                        onChange={(e) => updateLesson(index, "youtube_url", e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        required
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Updating..." : "Update Course"}
        </Button>
      </div>
    </form>
  )
}
