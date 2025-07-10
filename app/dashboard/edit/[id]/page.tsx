"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useWeb3 } from "@/contexts/web3-context"
import { getCourseForEdit, updateCourse, deleteCourse, deleteLessonSecure } from "@/app/actions/course-actions"
import { toast } from "@/hooks/use-toast"
import { FloppyDisk, Plus, Trash, ArrowLeft, Play, Warning } from "@phosphor-icons/react"
import { GripVertical } from "lucide-react"

interface Lesson {
  id?: string
  title: string
  youtube_url: string
  order_index: number
  course_id?: string
}

interface Course {
  id: string
  title: string
  description: string
  creator_wallet: string
  lessons: Lesson[]
}

export default function EditCoursePage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string
  const { account, isConnected } = useWeb3()

  const [course, setCourse] = useState<Course | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [lessons, setLessons] = useState<Lesson[]>([])

  // Load course data
  useEffect(() => {
    if (courseId && account) {
      loadCourse()
    }
  }, [courseId, account])

  const loadCourse = async () => {
    if (!account) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to edit courses.",
        variant: "destructive",
      })
      return
    }

    try {
      console.log("Loading course for edit:", { courseId, account })

      const courseData = await getCourseForEdit(courseId, account)

      console.log("Course loaded:", courseData)

      setCourse(courseData)
      setTitle(courseData.title)
      setDescription(courseData.description || "")
      setLessons(courseData.lessons || [])
    } catch (error: any) {
      console.error("Error loading course:", error)
      toast({
        title: "Error loading course",
        description: error.message || "Failed to load course data",
        variant: "destructive",
      })

      // If unauthorized, redirect to dashboard
      if (error.message?.includes("Unauthorized") || error.message?.includes("Access denied")) {
        router.push("/dashboard")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const addLesson = () => {
    const newLesson: Lesson = {
      title: "",
      youtube_url: "",
      order_index: lessons.length,
    }
    setLessons([...lessons, newLesson])
  }

  const updateLesson = (index: number, field: keyof Lesson, value: string | number) => {
    const updatedLessons = lessons.map((lesson, i) => {
      if (i === index) {
        return { ...lesson, [field]: value }
      }
      return lesson
    })
    setLessons(updatedLessons)
  }

  const removeLesson = async (index: number) => {
    const lesson = lessons[index]

    // If lesson has an ID, delete it from database
    if (lesson.id && account) {
      try {
        await deleteLessonSecure(lesson.id, account)
        toast({
          title: "Lesson deleted",
          description: "The lesson has been removed from the course.",
        })
      } catch (error: any) {
        console.error("Error deleting lesson:", error)
        toast({
          title: "Error deleting lesson",
          description: error.message || "Failed to delete lesson",
          variant: "destructive",
        })
        return
      }
    }

    // Remove from local state
    const updatedLessons = lessons.filter((_, i) => i !== index)
    // Update order indices
    const reorderedLessons = updatedLessons.map((lesson, i) => ({
      ...lesson,
      order_index: i,
    }))
    setLessons(reorderedLessons)
  }

  const moveLesson = (fromIndex: number, toIndex: number) => {
    const updatedLessons = [...lessons]
    const [movedLesson] = updatedLessons.splice(fromIndex, 1)
    updatedLessons.splice(toIndex, 0, movedLesson)

    // Update order indices
    const reorderedLessons = updatedLessons.map((lesson, i) => ({
      ...lesson,
      order_index: i,
    }))
    setLessons(reorderedLessons)
  }

  const validateYouTubeUrl = (url: string): boolean => {
    if (!url) return false
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/
    return youtubeRegex.test(url)
  }

  const handleSave = async () => {
    if (!account) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to save changes.",
        variant: "destructive",
      })
      return
    }

    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a course title.",
        variant: "destructive",
      })
      return
    }

    // Validate lessons
    const validLessons = lessons.filter((lesson) => lesson.title.trim() && lesson.youtube_url.trim())
    const invalidLessons = lessons.filter(
      (lesson) => lesson.title.trim() && lesson.youtube_url.trim() && !validateYouTubeUrl(lesson.youtube_url),
    )

    if (invalidLessons.length > 0) {
      toast({
        title: "Invalid YouTube URLs",
        description: "Please check your YouTube URLs and make sure they're valid.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      console.log("Saving course:", { courseId, title, description, lessons: validLessons.length, account })

      await updateCourse(courseId, { title: title.trim(), description: description.trim() }, validLessons, account)

      toast({
        title: "Course updated successfully!",
        description: `Your course "${title}" has been saved.`,
      })

      // Reload the course data to reflect changes
      await loadCourse()
    } catch (error: any) {
      console.error("Error saving course:", error)
      toast({
        title: "Error saving course",
        description: error.message || "Failed to save course changes",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!account || !course) return

    setIsDeleting(true)

    try {
      console.log("Deleting course:", { courseId, account })

      const result = await deleteCourse(courseId, account)

      toast({
        title: "Course deleted",
        description: `"${result.title}" has been permanently deleted.`,
      })

      router.push("/dashboard")
    } catch (error: any) {
      console.error("Error deleting course:", error)
      toast({
        title: "Error deleting course",
        description: error.message || "Failed to delete course",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-8">
            <Warning size={48} className="text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Wallet Required</h2>
            <p className="text-muted-foreground mb-4">Please connect your wallet to edit courses.</p>
            <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-64 mb-6"></div>
            <div className="space-y-6">
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-24 bg-muted rounded"></div>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 bg-muted rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-8">
            <Warning size={48} className="text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Course Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The course you're looking for doesn't exist or you don't have permission to edit it.
            </p>
            <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Edit Course</h1>
            <p className="text-muted-foreground">Make changes to your course content</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Course Details */}
          <Card>
            <CardHeader>
              <CardTitle>Course Information</CardTitle>
              <CardDescription>Update your course title and description</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Course Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter course title"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what students will learn in this course"
                  rows={4}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Lessons */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Course Lessons</CardTitle>
                  <CardDescription>Add and organize your course lessons</CardDescription>
                </div>
                <Button onClick={addLesson} size="sm" className="flex items-center gap-2">
                  <Plus size={16} />
                  Add Lesson
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {lessons.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Play size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No lessons yet. Add your first lesson to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {lessons.map((lesson, index) => (
                    <Card key={index} className="border-2">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex flex-col items-center gap-2 pt-2">
                            <Badge variant="secondary" className="text-xs">
                              {index + 1}
                            </Badge>
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveLesson(index, Math.max(0, index - 1))}
                                disabled={index === 0}
                                className="h-6 w-6 p-0"
                              >
                                <GripVertical size={12} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveLesson(index, Math.min(lessons.length - 1, index + 1))}
                                disabled={index === lessons.length - 1}
                                className="h-6 w-6 p-0"
                              >
                                <GripVertical size={12} />
                              </Button>
                            </div>
                          </div>

                          <div className="flex-1 space-y-3">
                            <div>
                              <Label htmlFor={`lesson-title-${index}`}>Lesson Title</Label>
                              <Input
                                id={`lesson-title-${index}`}
                                value={lesson.title}
                                onChange={(e) => updateLesson(index, "title", e.target.value)}
                                placeholder="Enter lesson title"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`lesson-url-${index}`}>YouTube URL</Label>
                              <Input
                                id={`lesson-url-${index}`}
                                value={lesson.youtube_url}
                                onChange={(e) => updateLesson(index, "youtube_url", e.target.value)}
                                placeholder="https://www.youtube.com/watch?v=..."
                                className="mt-1"
                              />
                              {lesson.youtube_url && !validateYouTubeUrl(lesson.youtube_url) && (
                                <p className="text-sm text-destructive mt-1">Please enter a valid YouTube URL</p>
                              )}
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLesson(index)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-6"
                          >
                            <Trash size={16} />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="flex items-center gap-2"
            >
              <Trash size={16} />
              Delete Course
            </Button>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => router.push("/dashboard")} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2">
                <FloppyDisk size={16} />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="max-w-md mx-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Warning size={20} />
                  Delete Course
                </CardTitle>
                <CardDescription>
                  This action cannot be undone. This will permanently delete your course and all its lessons.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 justify-end">
                  <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex items-center gap-2"
                  >
                    <Trash size={16} />
                    {isDeleting ? "Deleting..." : "Delete Forever"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
