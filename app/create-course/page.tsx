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
import { WalletAuth } from "@/lib/wallet-auth"
import { toast } from "@/hooks/use-toast"
import { Plus, Trash, DotsSixVertical } from "@phosphor-icons/react"
import { createCourseWithLessons } from "@/app/actions/course-actions"

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

  const { address: account, isConnected } = useWeb3()
  const router = useRouter()

  /* ---------- helpers ---------- */
  const addLesson = () =>
    setLessons((l) => [...l, { id: Date.now().toString(), title: "", description: "", youtube_url: "" }])

  const removeLesson = (id: string) => lessons.length > 1 && setLessons(lessons.filter((l) => l.id !== id))

  const updateLesson = (id: string, field: keyof LessonForm, value: string) =>
    setLessons((l) => l.map((lsn) => (lsn.id === id ? { ...lsn, [field]: value } : lsn)))

  const moveLesson = (id: string, dir: "up" | "down") => {
    const idx = lessons.findIndex((l) => l.id === id)
    if ((dir === "up" && idx === 0) || (dir === "down" && idx === lessons.length - 1)) return
    const swap = dir === "up" ? idx - 1 : idx + 1
    const copy = [...lessons]
    ;[copy[idx], copy[swap]] = [copy[swap], copy[idx]]
    setLessons(copy)
  }

  /* ---------- submit ---------- */
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

    const validLessons = lessons.filter((l) => l.title.trim() && l.youtube_url.trim())
    if (validLessons.length === 0) {
      toast({
        title: "At least one lesson required",
        description: "Please add at least one lesson with title and YouTube URL",
        variant: "destructive",
      })
      return
    }

    /* get current signed session */
    const session = WalletAuth.getSessionForAPI()
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please sign the auth message first",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const res = await createCourseWithLessons(
        {
          title: title.trim(),
          description: description.trim() || null,
        },
        validLessons,
        session,
      )

      if (!res.success) throw new Error(res.error || "Unknown error")

      toast({
        title: "Course created!",
        description: `Course "${title}" published with ${validLessons.length} lessons.`,
      })
      router.push("/courses")
    } catch (err: any) {
      toast({
        title: "Error creating course",
        description: err.message || "Please try again later",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  /* ---------- UI ---------- */
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Logo size="lg" showText={false} href={null} variant="circular" />
            <CardTitle className="text-xl mt-4">Connect Your Wallet</CardTitle>
            <CardDescription>You need to connect your wallet to create courses</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Create New Course</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── course details ───────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
              <CardDescription>Basic information about your course</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title *</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Course Description</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* ── lessons ──────────────────────── */}
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>Lessons</CardTitle>
                <CardDescription>Add lessons with YouTube videos</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addLesson}>
                <Plus size={14} className="mr-1" /> Add Lesson
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {lessons.map((lesson, idx) => (
                <Card key={lesson.id} className="p-4">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <DotsSixVertical size={16} />
                      <span className="text-xs bg-muted rounded px-2">#{idx + 1}</span>
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor={`lt-${lesson.id}`}>Title *</Label>
                          <Input
                            id={`lt-${lesson.id}`}
                            value={lesson.title}
                            onChange={(e) => updateLesson(lesson.id, "title", e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`url-${lesson.id}`}>YouTube URL *</Label>
                          <Input
                            id={`url-${lesson.id}`}
                            type="url"
                            value={lesson.youtube_url}
                            onChange={(e) => updateLesson(lesson.id, "youtube_url", e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`desc-${lesson.id}`}>Description</Label>
                        <Textarea
                          id={`desc-${lesson.id}`}
                          rows={2}
                          value={lesson.description}
                          onChange={(e) => updateLesson(lesson.id, "description", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => moveLesson(lesson.id, "up")}
                        disabled={idx === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => moveLesson(lesson.id, "down")}
                        disabled={idx === lessons.length - 1}
                      >
                        ↓
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeLesson(lesson.id)}
                        disabled={lessons.length === 1}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash size={12} />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* ── submit ───────────────────────── */}
          <div className="flex gap-3">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Creating..." : "Create Course"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
