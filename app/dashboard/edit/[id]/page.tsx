"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useWeb3 } from "@/contexts/web3-context"
import { toast } from "@/hooks/use-toast"
import { AlertCircle, Plus, Trash2, GripVertical, Save, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { updateCourse, getCourseForEdit, deleteLessonSecure, type LessonUpdateData } from "@/app/actions/course-actions"

interface LessonForm {
  id: string
  title: string
  description: string
  youtube_url: string
  order_index: number
  isNew?: boolean
}

interface CourseData {
  id: string
  title: string
  description: string | null
  creator_wallet: string
  created_at: string
  updated_at: string
  lessons: Array<{
    id: string
    title: string
    description: string | null
    youtube_url: string
    order_index: number
    created_at: string
    updated_at: string
  }>
}

export default function EditCoursePage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string
  const [course, setCourse] = useState<CourseData | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [lessons, setLessons] = useState<LessonForm[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)
  const { account, isConnected } = useWeb3()

  useEffect(() => {
    if (courseId && isConnected && account) {
      fetchCourse()
    }
  }, [courseId, isConnected, account])

  const fetchCourse = async () => {
    if (!account) return

    try {
      const result = await getCourseForEdit(courseId, account)

      if (!result.success) {
        setAccessDenied(true)
        toast({
          title: "Access denied",
          description: result.error || "You can only edit your own courses.",
          variant: "destructive",
        })
        return
      }

      const data = result.course!
      setCourse(data)
      setTitle(data.title)
      setDescription(data.description || "")

      // Convert lessons to form format
      const lessonForms: LessonForm[] = data.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description || "",
        youtube_url: lesson.youtube_url,
        order_index: lesson.order_index,
      }))

      setLessons(
        lessonForms.length > 0
          ? lessonForms
          : [
              {
                id: "new-1",
                title: "",
                description: "",
                youtube_url: "",
                order_index: 0,
                isNew: true,
              },
            ],
      )
    } catch (error) {
      console.error("Error fetching course:", error)
      setAccessDenied(true)
      toast({
        title: "Error loading course",
        description: "Failed to load course data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addLesson = () => {
    const newLesson: LessonForm = {
      id: `new-${Date.now()}`,
      title: "",
      description: "",
      youtube_url: "",
      order_index: lessons.length,
      isNew: true,
    }
    setLessons([...lessons, newLesson])
  }

  const removeLesson = async (id: string) => {
    const lesson = lessons.find((l) => l.id === id)

    if (!lesson?.isNew && account) {
      // Delete from database if it's an existing lesson
      try {
        const result = await deleteLessonSecure(id, account)

        if (!result.success) {
          toast({
            title: "Error deleting lesson",
            description: result.error || "Failed to delete the lesson. Please try again.",
            variant: "destructive",
          })
          return
        }

        toast({
          title: "Lesson deleted",
          description: "The lesson has been removed from your course.",
        })
      } catch (error) {
        console.error("Error deleting lesson:", error)
        toast({
          title: "Error deleting lesson",
          description: "Failed to delete the lesson. Please try again.",
          variant: "destructive",
        })
        return
      }
    }

    // Remove from local state
    const updatedLessons = lessons.filter((lesson) => lesson.id !== id)
    // Reorder remaining lessons
    const reorderedLessons = updatedLessons.map((lesson, index) => ({
      ...lesson,
      order_index: index,
    }))
    setLessons(reorderedLessons)
  }

  const updateLesson = (id: string, field: keyof LessonForm, value: string | number) => {
    setLessons(lessons.map((lesson) => (lesson.id === id ? { ...lesson, [field]: value } : lesson)))
  }

  const moveLesson = (id: string, direction: "up" | "down") => {
    const currentIndex = lessons.findIndex((lesson) => lesson.id === id)
    if ((direction === "up" && currentIndex > 0) || (direction === "down" && currentIndex < lessons.length - 1)) {
      const newLessons = [...lessons]
      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
      ;[newLessons[currentIndex], newLessons[targetIndex]] = [newLessons[targetIndex], newLessons[currentIndex]]

      // Update order_index for both lessons
      newLessons[currentIndex].order_index = currentIndex
      newLessons[targetIndex].order_index = targetIndex

      setLessons(newLessons)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConnected || !account || !course) {
      toast({
        title: "Authentication error",
        description: "Please ensure your wallet is connected.",
        variant: "destructive",
      })
      return
    }

    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a course title",
        variant: "destructive",
      })
      return
    }

    const validLessons = lessons.filter((lesson) => lesson.title.trim() && lesson.youtube_url.trim())

    if (validLessons.length === 0) {
      toast({
        title: "At least one lesson required",
        description: "Please add at least one lesson with title and YouTube URL",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      const lessonData: LessonUpdateData[] = validLessons.map((lesson, index) => ({
        id: lesson.isNew ? undefined : lesson.id,
        title: lesson.title,
        description: lesson.description,
        youtube_url: lesson.youtube_url,
        order_index: index,
        isNew: lesson.isNew,
      }))

      const result = await updateCourse(
        courseId,
        account,
        {
          title: title.trim(),
          description: description.trim() || undefined,
        },
        lessonData,
      )

      if (!result.success) {
        throw new Error(result.error || "Failed to update course")
      }

      toast({
        title: "Course updated successfully!",
        description: `Your course has been updated with ${result.validLessonsCount} lessons.`,
      })

      router.push("/dashboard")
    } catch (error: any) {
      console.error("Error updating course:", error)
      toast({
        title: "Error updating course",
        description: error.message || "Please try again later",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please connect your wallet to edit courses.</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="space-y-6">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (accessDenied || !course) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Access denied. You can only edit your own courses.</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Course</h1>
          <p className="text-gray-600">Make changes to your course and lessons</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course Details</CardTitle>
          <CardDescription>Update your course information and manage lessons</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Course Details */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter course title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Course Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what students will learn in this course"
                  rows={4}
                />
              </div>
            </div>

            {/* Lessons */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Lessons</h3>
                <Button type="button" onClick={addLesson} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lesson
                </Button>
              </div>

              <div className="space-y-4">
                {lessons.map((lesson, index) => (
                  <Card key={lesson.id} className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center gap-2 mt-2">
                        <GripVertical className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-500">#{index + 1}</span>
                        {lesson.isNew && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">New</span>
                        )}
                      </div>

                      <div className="flex-1 space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`lesson-title-${lesson.id}`}>Lesson Title</Label>
                            <Input
                              id={`lesson-title-${lesson.id}`}
                              value={lesson.title}
                              onChange={(e) => updateLesson(lesson.id, "title", e.target.value)}
                              placeholder="Enter lesson title"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`lesson-url-${lesson.id}`}>YouTube URL</Label>
                            <Input
                              id={`lesson-url-${lesson.id}`}
                              type="url"
                              value={lesson.youtube_url}
                              onChange={(e) => updateLesson(lesson.id, "youtube_url", e.target.value)}
                              placeholder="https://www.youtube.com/watch?v=..."
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`lesson-description-${lesson.id}`}>Lesson Description (Optional)</Label>
                          <Textarea
                            id={`lesson-description-${lesson.id}`}
                            value={lesson.description}
                            onChange={(e) => updateLesson(lesson.id, "description", e.target.value)}
                            placeholder="Describe what this lesson covers"
                            rows={2}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => moveLesson(lesson.id, "up")}
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => moveLesson(lesson.id, "down")}
                          disabled={index === lessons.length - 1}
                        >
                          ↓
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeLesson(lesson.id)}
                          disabled={lessons.length === 1}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isSaving} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving Changes..." : "Save Changes"}
              </Button>
              <Link href="/dashboard">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
