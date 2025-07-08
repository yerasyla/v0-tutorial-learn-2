"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Logo } from "@/components/logo"
import { useWeb3 } from "@/contexts/web3-context"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import { Plus, Trash, DotsSixVertical } from "@phosphor-icons/react"

interface LessonForm {
  id: string
  title: string
  description: string
  youtube_url: string
}

export default function CreateCoursePage() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [lessons, setLessons] = useState<LessonForm[]>([{ id: "1", title: "", description: "", youtube_url: "" }])
  const [isLoading, setIsLoading] = useState(false)
  const { account, isConnected } = useWeb3()
  const router = useRouter()

  const addLesson = () => {
    const newLesson: LessonForm = {
      id: Date.now().toString(),
      title: "",
      description: "",
      youtube_url: "",
    }
    setLessons([...lessons, newLesson])
  }

  const removeLesson = (id: string) => {
    if (lessons.length > 1) {
      setLessons(lessons.filter((lesson) => lesson.id !== id))
    }
  }

  const updateLesson = (id: string, field: keyof LessonForm, value: string) => {
    setLessons(lessons.map((lesson) => (lesson.id === id ? { ...lesson, [field]: value } : lesson)))
  }

  const moveLesson = (id: string, direction: "up" | "down") => {
    const currentIndex = lessons.findIndex((lesson) => lesson.id === id)
    if ((direction === "up" && currentIndex > 0) || (direction === "down" && currentIndex < lessons.length - 1)) {
      const newLessons = [...lessons]
      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
      ;[newLessons[currentIndex], newLessons[targetIndex]] = [newLessons[targetIndex], newLessons[currentIndex]]
      setLessons(newLessons)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConnected || !account) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create a course",
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

    setIsLoading(true)

    try {
      // Create course
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .insert([
          {
            title: title.trim(),
            description: description.trim() || null,
            creator_wallet: account.toLowerCase(),
          },
        ])
        .select()
        .single()

      if (courseError) {
        console.error("Course creation error:", courseError)
        throw new Error(`Failed to create course: ${courseError.message}`)
      }

      // Create lessons
      const lessonsToInsert = validLessons.map((lesson, index) => ({
        course_id: courseData.id,
        title: lesson.title.trim(),
        description: lesson.description.trim() || null,
        youtube_url: lesson.youtube_url.trim(),
        order_index: index,
      }))

      const { error: lessonsError } = await supabase.from("lessons").insert(lessonsToInsert)

      if (lessonsError) {
        console.error("Lessons creation error:", lessonsError)
        throw new Error(`Failed to create lessons: ${lessonsError.message}`)
      }

      toast({
        title: "Course created successfully!",
        description: `Your course with ${validLessons.length} lessons has been published.`,
      })

      // Reset form
      setTitle("")
      setDescription("")
      setLessons([{ id: "1", title: "", description: "", youtube_url: "" }])

      // Navigate to courses page
      router.push("/courses")
    } catch (error: any) {
      console.error("Error creating course:", error)
      toast({
        title: "Error creating course",
        description: error.message || "Please try again later",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="p-6">
              <div className="text-center mb-4">
                <div className="flex justify-center mb-4">
                  <Logo size="lg" showText={false} href={null} variant="circular" />
                </div>
                <CardTitle className="text-xl text-foreground mb-3">Connect Your Wallet</CardTitle>
                <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                  You need to connect your wallet to create courses
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <p className="text-muted-foreground text-center text-sm leading-relaxed">
                Please connect your Web3 wallet to start creating educational content.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2 leading-tight">Create New Course</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">Share your knowledge with the Web3 community</p>
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
              <div className="grid md:grid-cols-2 gap-4">
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
                  <Label className="text-sm font-medium text-foreground">Lessons</Label>
                  <div className="h-9 flex items-center text-sm text-muted-foreground bg-muted rounded-md px-3">
                    {lessons.filter((l) => l.title.trim() && l.youtube_url.trim()).length} lesson
                    {lessons.filter((l) => l.title.trim() && l.youtube_url.trim()).length !== 1 ? "s" : ""} ready
                  </div>
                </div>
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
                  <Card key={lesson.id} className="border border-border bg-background shadow-sm">
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
                              <Label
                                htmlFor={`lesson-title-${lesson.id}`}
                                className="text-xs font-medium text-foreground"
                              >
                                Lesson Title *
                              </Label>
                              <Input
                                id={`lesson-title-${lesson.id}`}
                                value={lesson.title}
                                onChange={(e) => updateLesson(lesson.id, "title", e.target.value)}
                                placeholder="Enter lesson title"
                                required
                                className="h-8 text-sm border border-border focus:border-brand-primary bg-background"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label
                                htmlFor={`lesson-url-${lesson.id}`}
                                className="text-xs font-medium text-foreground"
                              >
                                YouTube URL *
                              </Label>
                              <Input
                                id={`lesson-url-${lesson.id}`}
                                type="url"
                                value={lesson.youtube_url}
                                onChange={(e) => updateLesson(lesson.id, "youtube_url", e.target.value)}
                                placeholder="https://www.youtube.com/watch?v=..."
                                required
                                className="h-8 text-sm border border-border focus:border-brand-primary bg-background"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label
                              htmlFor={`lesson-description-${lesson.id}`}
                              className="text-xs font-medium text-foreground"
                            >
                              Lesson Description (Optional)
                            </Label>
                            <Textarea
                              id={`lesson-description-${lesson.id}`}
                              value={lesson.description}
                              onChange={(e) => updateLesson(lesson.id, "description", e.target.value)}
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
                            onClick={() => moveLesson(lesson.id, "up")}
                            disabled={index === 0}
                            className="h-7 w-7 p-0 border border-border hover:bg-accent"
                          >
                            ↑
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => moveLesson(lesson.id, "down")}
                            disabled={index === lessons.length - 1}
                            className="h-7 w-7 p-0 border border-border hover:bg-accent"
                          >
                            ↓
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeLesson(lesson.id)}
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
              disabled={isLoading}
            >
              {isLoading ? "Creating Course..." : "Create Course"}
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
