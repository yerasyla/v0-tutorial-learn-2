"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export interface CourseUpdateData {
  title: string
  description?: string
}

export interface LessonUpdateData {
  id?: string
  title: string
  description?: string
  youtube_url: string
  order_index: number
  isNew?: boolean
}

export async function updateCourse(
  courseId: string,
  creatorWallet: string,
  courseData: CourseUpdateData,
  lessons: LessonUpdateData[],
) {
  try {
    // First, verify the course exists and belongs to the creator
    const { data: existingCourse, error: fetchError } = await supabase
      .from("courses")
      .select("id, creator_wallet")
      .eq("id", courseId)
      .single()

    if (fetchError) {
      return { success: false, error: "Course not found" }
    }

    // Critical security check - verify ownership
    if (existingCourse.creator_wallet.toLowerCase() !== creatorWallet.toLowerCase()) {
      return { success: false, error: "Unauthorized: You can only edit your own courses" }
    }

    // Update course
    const { error: courseError } = await supabase
      .from("courses")
      .update({
        title: courseData.title.trim(),
        description: courseData.description?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)
      .eq("creator_wallet", creatorWallet.toLowerCase()) // Double security check

    if (courseError) {
      return { success: false, error: `Failed to update course: ${courseError.message}` }
    }

    // Handle lessons
    const validLessons = lessons.filter((lesson) => lesson.title.trim() && lesson.youtube_url.trim())

    for (const [index, lesson] of validLessons.entries()) {
      const lessonData = {
        title: lesson.title.trim(),
        description: lesson.description?.trim() || null,
        youtube_url: lesson.youtube_url.trim(),
        order_index: index,
        updated_at: new Date().toISOString(),
      }

      if (lesson.isNew) {
        // Insert new lesson
        const { error } = await supabase.from("lessons").insert({
          ...lessonData,
          course_id: courseId,
        })

        if (error) {
          return { success: false, error: `Failed to create lesson: ${error.message}` }
        }
      } else {
        // Update existing lesson - verify it belongs to the course
        const { error } = await supabase
          .from("lessons")
          .update(lessonData)
          .eq("id", lesson.id)
          .eq("course_id", courseId) // Security check

        if (error) {
          return { success: false, error: `Failed to update lesson: ${error.message}` }
        }
      }
    }

    revalidatePath("/dashboard")
    revalidatePath(`/courses/${courseId}`)

    return { success: true, validLessonsCount: validLessons.length }
  } catch (error: any) {
    console.error("Error updating course:", error)
    return { success: false, error: error.message || "An unexpected error occurred" }
  }
}

export async function getCourseForEdit(courseId: string, creatorWallet: string) {
  try {
    // Fetch course with authorization check
    const { data, error } = await supabase
      .from("courses")
      .select(`
        *,
        lessons (*)
      `)
      .eq("id", courseId)
      .eq("creator_wallet", creatorWallet.toLowerCase()) // Security check in query
      .single()

    if (error) {
      return { success: false, error: "Course not found or access denied" }
    }

    // Sort lessons
    const sortedLessons = data.lessons?.sort((a: any, b: any) => a.order_index - b.order_index) || []

    return {
      success: true,
      course: {
        ...data,
        lessons: sortedLessons,
      },
    }
  } catch (error: any) {
    console.error("Error fetching course for edit:", error)
    return { success: false, error: "Failed to load course data" }
  }
}

export async function deleteCourseSecure(courseId: string, creatorWallet: string) {
  try {
    // Verify ownership before deletion
    const { data: existingCourse, error: fetchError } = await supabase
      .from("courses")
      .select("id, creator_wallet")
      .eq("id", courseId)
      .single()

    if (fetchError) {
      return { success: false, error: "Course not found" }
    }

    if (existingCourse.creator_wallet.toLowerCase() !== creatorWallet.toLowerCase()) {
      return { success: false, error: "Unauthorized: You can only delete your own courses" }
    }

    // Delete course (lessons will be deleted via cascade)
    const { error } = await supabase
      .from("courses")
      .delete()
      .eq("id", courseId)
      .eq("creator_wallet", creatorWallet.toLowerCase()) // Double security check

    if (error) {
      return { success: false, error: `Failed to delete course: ${error.message}` }
    }

    revalidatePath("/dashboard")
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting course:", error)
    return { success: false, error: error.message || "An unexpected error occurred" }
  }
}

export async function deleteLessonSecure(lessonId: string, creatorWallet: string) {
  try {
    // First verify the lesson belongs to a course owned by the creator
    const { data: lessonData, error: fetchError } = await supabase
      .from("lessons")
      .select(`
        id,
        course_id,
        courses!inner (
          creator_wallet
        )
      `)
      .eq("id", lessonId)
      .single()

    if (fetchError) {
      return { success: false, error: "Lesson not found" }
    }

    // @ts-ignore - Supabase types can be tricky with joins
    if (lessonData.courses.creator_wallet.toLowerCase() !== creatorWallet.toLowerCase()) {
      return { success: false, error: "Unauthorized: You can only delete lessons from your own courses" }
    }

    // Delete the lesson
    const { error } = await supabase.from("lessons").delete().eq("id", lessonId)

    if (error) {
      return { success: false, error: `Failed to delete lesson: ${error.message}` }
    }

    return { success: true }
  } catch (error: any) {
    console.error("Error deleting lesson:", error)
    return { success: false, error: error.message || "An unexpected error occurred" }
  }
}
