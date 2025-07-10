"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWeb3 } from "@/contexts/web3-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, ArrowLeft, Save, Plus, Trash, DotIcon as DotsSixVertical } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { WalletAuth } from "@/lib/wallet-auth"

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

export default function EditCoursePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { account, isConnected, isAuthenticated } = useWeb3()
  const [course, setCourse] = useState<Course | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [lessons, setLessons] = useState<LessonForm[]>([])

  // Fetch course data
  useEffect(() => {
    async function fetchCourse() {
      if (!account) return

      try {
        console.log("Fetching course:", params.id)

        const { data: courseData, error } = await supabase
          .from("courses")
          .select(`
            *,
            lessons (*)
          `)
          .eq("id", params.id)
          .single()

        if (error) {
          console.error("Course fetch error:", error)
          throw error
        }

        if (!courseData) {
          toast({
            title: "Course not found",
            description: "The requested course could not be found",
            variant: "destructive",
          })
          router.push("/dashboard")
          return
        }

        // Check if user owns this course
        if (courseData.creator_wallet.toLowerCase() !== account.toLowerCase()) {
          toast({
            title: "Access denied",
            description: "You can only edit your own courses",
            variant: "destructive",
          })
          router.push("/dashboard")
          return
        }

        // Sort lessons by order_index
        const sortedLessons = courseData.lessons?.sort((a: any, b: any) => a.order_index - b.order_index) || []

        setCourse({ ...courseData, lessons: sortedLessons })
        setTitle(courseData.title)
        setDescription(courseData.description || "")

        // Convert lessons to form format
        const lessonForms = sortedLessons.map((lesson: any) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description || "",
          youtube_url: lesson.youtube_url,
        }))

        setLessons(lessonForms.length > 0 ? lessonForms : [{ title: "", description: "", youtube_url: "" }])
      } catch (error) {
        console.error("Error fetching course:", error)
        toast({
          title: "Error",
          description: "Failed to load course data",
          variant: "destructive",
        })
        router.push("/dashboard")
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id && account) {
      fetchCourse()
    }
  }, [params.id, account, router])

  const addLesson = () => {
    setLessons([...lessons, { title: "", description: "", youtube_url: "" }])
  }

  const removeLesson = (index: number) => {
    if (lessons.length > 1) {
      setLessons(lessons.filter((_, i) => i !== index))
    }
  }

  const updateLesson = (index: number, field: keyof LessonForm, value: string) => {
    setLessons(lessons.map((lesson, i) => (i === index ? { ...lesson, [field]: value } : lesson)))
  }

  const moveLesson = (index: number, direction: "up" | "down") => {
    if ((direction === "up" && index > 0) || (direction === "down" && index < lessons.length - 1)) {
      const newLessons = [...lessons]
      const targetIndex = direction === "up" ? index - 1 : index + 1
      ;[newLessons[index], newLessons[targetIndex]] = [newLessons[targetIndex], newLessons[index]]
      setLessons(newLessons)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConnected || !account || !isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please connect and authenticate your wallet",
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

    // Validate lessons
    const validLessons = lessons.filter((lesson) => lesson.title.trim() && lesson.youtube_url.trim())

    if (validLessons.length === 0) {
      toast({
        title: "At least one lesson required",
        description: "Please add at least one lesson with title and YouTube URL",
        variant: "destructive",
      })
      return
    }

    const session = WalletAuth.getSession()
    if (!session) {
      toast({
        title: "Session Expired",
        description: "Please reconnect your wallet to authenticate",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      // Update course
      const { error: courseError } = await supabase
        .from("courses")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id)
        .eq("creator_wallet", account.toLowerCase())

      if (courseError) {
        console.error("Course update error:", courseError)
        throw new Error(`Failed to update course: ${courseError.message}`)
      }

      // Get existing lessons
      const { data: existingLessons, error: lessonsError } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", params.id)

      if (lessonsError) {
        throw new Error(`Failed to fetch existing lessons: ${lessonsError.message}`)
      }

      const existingLessonIds = new Set(existingLessons?.map((l) => l.id) || [])
      const updatedLessonIds = new Set(validLessons.filter((l) => l.id).map((l) => l.id))

      // Delete lessons that are no longer in the update
      const lessonsToDelete = existingLessons?.filter((l) => !updatedLessonIds.has(l.id)) || []

      if (lessonsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("lessons")
          .delete()
          .in(
            "id",
            lessonsToDelete.map((l) => l.id),
          )

        if (deleteError) {
          throw new Error(`Failed to delete lessons: ${deleteError.message}`)
        }
      }

      // Process each lesson (update existing or insert new)
      for (let i = 0; i < validLessons.length; i++) {
        const lesson = validLessons[i]
        const lessonData = {
          title: lesson.title.trim(),
          description: lesson.description.trim() || null,
          youtube_url: lesson.youtube_url.trim(),
          order_index: i,
          course_id: params.id,
        }

        if (lesson.id && existingLessonIds.has(lesson.id)) {
          // Update existing lesson
          const { error: updateError } = await supabase.from("lessons").update(lessonData).eq("id", lesson.id)

          if (updateError) {
            throw new Error(`Failed to update lesson "${lesson.title}": ${updateError.message}`)
          }
        } else {
          // Insert new lesson
          const { error: insertError } = await supabase.from("lessons").insert([lessonData])

          if (insertError) {
            throw new Error(`Failed to create lesson "${lesson.title}": ${insertError.message}`)
          }
        }
      }

      toast({
        title: "Course updated successfully!",
        description: `Your course has been updated with ${validLessons.length} lessons.`,
      })

      // Navigate back to dashboard
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

  if (!isConnected || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="p-6">
              <div className="text-center mb-4">
                <CardTitle className="text-xl text-foreground mb-3">Authentication Required</CardTitle>
                <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                  Please connect and authenticate your wallet to edit courses
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Loading course...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="p-6">
              <div className="text-center mb-4">
                <CardTitle className="text-xl text-foreground mb-3">Course Not Found</CardTitle>
                <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                  The requested course could not be found
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="border border-border bg-transparent hover:bg-accent"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2 leading-tight">Edit Course</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">Update your course details and lessons</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Course Details */}
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="p-4 pb-3">
              <CardTitle className="text-lg font-semibold text-foreground">Course Details</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Basic information about your course
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium text-foreground">
                  Course Title *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter course title"
                  required
                  className="h-9 text-sm border border-border focus:border-brand-primary bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-foreground">
                  Course Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what students will learn in this course"
                  rows={3}
                  className="text-sm border border-border focus:border-brand-primary resize-none bg-background"
                />
              </div>
            </CardContent>
          </Card>

          {/* Lessons */}
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="p-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-foreground">Course Lessons</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Add lessons with YouTube videos
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  onClick={addLesson}
                  variant="outline"
                  size="sm"
                  className="border border-border bg-transparent hover:bg-accent h-8 text-xs"
                >
                  <Plus size={14} className="mr-1" />
                  Add Lesson
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-3">
                {lessons.map((lesson, index) => (
                  <Card key={index} className="border border-border bg-background shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center gap-2 mt-1">
                          <DotsSixVertical size={16} className="text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                            #{index + 1}
                          </span>
                        </div>

                        <div className="flex-1 space-y-3">
                          <div className="grid md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs font-medium text-foreground">Lesson Title *</Label>
                              <Input
                                value={lesson.title}
                                onChange={(e) => updateLesson(index, "title", e.target.value)}
                                placeholder="Enter lesson title"
                                required
                                className="h-8 text-sm border border-border focus:border-brand-primary bg-background"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs font-medium text-foreground">YouTube URL *</Label>
                              <Input
                                type="url"
                                value={lesson.youtube_url}
                                onChange={(e) => updateLesson(index, "youtube_url", e.target.value)}
                                placeholder="https://www.youtube.com/watch?v=..."
                                required
                                className="h-8 text-sm border border-border focus:border-brand-primary bg-background"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-foreground">Lesson Description (Optional)</Label>
                            <Textarea
                              value={lesson.description}
                              onChange={(e) => updateLesson(index, "description", e.target.value)}
                              placeholder="Describe what this lesson covers"
                              rows={2}
                              className="text-sm border border-border focus:border-brand-primary resize-none bg-background"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => moveLesson(index, "up")}
                            disabled={index === 0}
                            className="h-7 w-7 p-0 border border-border hover:bg-accent"
                          >
                            ↑
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => moveLesson(index, "down")}
                            disabled={index === lessons.length - 1}
                            className="h-7 w-7 p-0 border border-border hover:bg-accent"
                          >
                            ↓
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeLesson(index)}
                            disabled={lessons.length === 1}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 h-7 w-7 p-0"
                          >
                            <Trash size={12} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              className="flex-1 h-10 text-sm font-semibold bg-brand-primary hover:bg-brand-secondary text-primary-foreground"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating Course...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Course
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="px-6 h-10 text-sm border border-border bg-transparent hover:bg-accent"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
