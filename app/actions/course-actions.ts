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
    console.log("Starting course update:", { courseId, creatorWallet, courseData })

    // First, verify the course exists and belongs to the creator
    const { data: existingCourse, error: fetchError } = await supabase
      .from("courses")
      .select("id, creator_wallet")
      .eq("id", courseId)
      .single()

    console.log("Existing course check:", { existingCourse, fetchError })

    if (fetchError) {
      console.error("Course fetch error:", fetchError)
      return { success: false, error: "Course not found" }
    }

    // Critical security check - verify ownership
    if (existingCourse.creator_wallet.toLowerCase() !== creatorWallet.toLowerCase()) {
      console.error("Ownership mismatch:", {
        existing: existingCourse.creator_wallet.toLowerCase(),
        provided: creatorWallet.toLowerCase(),
      })
      return { success: false, error: "Unauthorized: You can only edit your own courses" }
    }

    // Update course
    const { data: updatedCourse, error: courseError } = await supabase
      .from("courses")
      .update({
        title: courseData.title.trim(),
        description: courseData.description?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)
      .eq("creator_wallet", creatorWallet.toLowerCase()) // Double security check
      .select()

    console.log("Course update result:", { updatedCourse, courseError })

    if (courseError) {
      console.error("Course update error:", courseError)
      return { success: false, error: `Failed to update course: ${courseError.message}` }
    }

    // Handle lessons
    const validLessons = lessons.filter((lesson) => lesson.title.trim() && lesson.youtube_url.trim())
    console.log("Processing lessons:", { total: lessons.length, valid: validLessons.length })

    // First, get existing lessons to know which ones to delete
    const { data: existingLessons, error: existingLessonsError } = await supabase
      .from("lessons")
      .select("id")
      .eq("course_id", courseId)

    console.log("Existing lessons:", { existingLessons, existingLessonsError })

    if (existingLessonsError) {
      console.error("Error fetching existing lessons:", existingLessonsError)
      return { success: false, error: "Failed to fetch existing lessons" }
    }

    // Delete lessons that are no longer in the update
    const updatedLessonIds = validLessons.filter((l) => !l.isNew).map((l) => l.id)
    const lessonsToDelete = existingLessons?.filter((l) => !updatedLessonIds.includes(l.id)) || []

    console.log("Lessons to delete:", lessonsToDelete)

    for (const lessonToDelete of lessonsToDelete) {
      const { error: deleteError } = await supabase
        .from("lessons")
        .delete()
        .eq("id", lessonToDelete.id)
        .eq("course_id", courseId)

      if (deleteError) {
        console.error("Error deleting lesson:", deleteError)
        return { success: false, error: `Failed to delete lesson: ${deleteError.message}` }
      }
    }

    // Process valid lessons
    for (const [index, lesson] of validLessons.entries()) {
      const lessonData = {
        title: lesson.title.trim(),
        description: lesson.description?.trim() || null,
        youtube_url: lesson.youtube_url.trim(),
        order_index: index,
        updated_at: new Date().toISOString(),
      }

      console.log("Processing lesson:", { index, lesson: lessonData, isNew: lesson.isNew })

      if (lesson.isNew) {
        // Insert new lesson
        const { data: newLesson, error } = await supabase
          .from("lessons")
          .insert({
            ...lessonData,
            course_id: courseId,
          })
          .select()

        console.log("New lesson insert result:", { newLesson, error })

        if (error) {
          console.error("Error creating lesson:", error)
          return { success: false, error: `Failed to create lesson: ${error.message}` }
        }
      } else {
        // Update existing lesson - verify it belongs to the course
        const { data: updatedLesson, error } = await supabase
          .from("lessons")
          .update(lessonData)
          .eq("id", lesson.id)
          .eq("course_id", courseId) // Security check
          .select()

        console.log("Lesson update result:", { updatedLesson, error })

        if (error) {
          console.error("Error updating lesson:", error)
          return { success: false, error: `Failed to update lesson: ${error.message}` }
        }
      }
    }

    console.log("Course update completed successfully")

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
    console.log("Fetching course for edit:", { courseId, creatorWallet })

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

    console.log("Course fetch result:", { data, error })

    if (error) {
      console.error("Error fetching course:", error)
      return { success: false, error: "Course not found or access denied" }
    }

    // Sort lessons
    const sortedLessons = data.lessons?.sort((a: any, b: any) => a.order_index - b.order_index) || []

    console.log("Course fetched successfully:", { courseId, lessonsCount: sortedLessons.length })

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
    console.log("Deleting course:", { courseId, creatorWallet })

    // Verify ownership before deletion
    const { data: existingCourse, error: fetchError } = await supabase
      .from("courses")
      .select("id, creator_wallet")
      .eq("id", courseId)
      .single()

    console.log("Course ownership check:", { existingCourse, fetchError })

    if (fetchError) {
      console.error("Course fetch error:", fetchError)
      return { success: false, error: "Course not found" }
    }

    if (existingCourse.creator_wallet.toLowerCase() !== creatorWallet.toLowerCase()) {
      console.error("Unauthorized deletion attempt")
      return { success: false, error: "Unauthorized: You can only delete your own courses" }
    }

    // Delete course (lessons will be deleted via cascade)
    const { error } = await supabase
      .from("courses")
      .delete()
      .eq("id", courseId)
      .eq("creator_wallet", creatorWallet.toLowerCase()) // Double security check

    console.log("Course deletion result:", { error })

    if (error) {
      console.error("Error deleting course:", error)
      return { success: false, error: `Failed to delete course: ${error.message}` }
    }

    console.log("Course deleted successfully")

    revalidatePath("/dashboard")
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting course:", error)
    return { success: false, error: error.message || "An unexpected error occurred" }
  }
}

export async function deleteLessonSecure(lessonId: string, creatorWallet: string) {
  try {
    console.log("Deleting lesson:", { lessonId, creatorWallet })

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

    console.log("Lesson ownership check:", { lessonData, fetchError })

    if (fetchError) {
      console.error("Lesson fetch error:", fetchError)
      return { success: false, error: "Lesson not found" }
    }

    // @ts-ignore - Supabase types can be tricky with joins
    if (lessonData.courses.creator_wallet.toLowerCase() !== creatorWallet.toLowerCase()) {
      console.error("Unauthorized lesson deletion attempt")
      return { success: false, error: "Unauthorized: You can only delete lessons from your own courses" }
    }

    // Delete the lesson
    const { error } = await supabase.from("lessons").delete().eq("id", lessonId)

    console.log("Lesson deletion result:", { error })

    if (error) {
      console.error("Error deleting lesson:", error)
      return { success: false, error: `Failed to delete lesson: ${error.message}` }
    }

    console.log("Lesson deleted successfully")

    return { success: true }
  } catch (error: any) {
    console.error("Error deleting lesson:", error)
    return { success: false, error: error.message || "An unexpected error occurred" }
  }
}
