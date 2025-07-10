"use server"

import { supabaseAdmin } from "@/lib/supabase-admin"
import { WalletAuth, type WalletSession } from "@/lib/wallet-auth"
import { revalidatePath } from "next/cache"

export interface LessonUpdateData {
  id?: string
  title: string
  youtube_url: string
  order_index: number
  course_id?: string
}

/**
 * Verify wallet session and extract wallet address
 */
function verifyWalletSession(session: WalletSession): string {
  console.log("Verifying wallet session:", { address: session.address, timestamp: session.timestamp })

  // Verify signature
  if (!WalletAuth.verifySession(session)) {
    throw new Error("Invalid or expired authentication session")
  }

  console.log("Session verified successfully for:", session.address)
  return session.address.toLowerCase()
}

/**
 * Get course for editing
 */
export async function getCourseForEdit(courseId: string, session: WalletSession) {
  console.log("getCourseForEdit called with:", { courseId, sessionAddress: session?.address })

  try {
    // Verify session
    const walletAddress = verifyWalletSession(session)

    const { data: course, error } = await supabaseAdmin
      .from("courses")
      .select(`
        *,
        lessons (*)
      `)
      .eq("id", courseId)
      .single()

    console.log("Course fetch result:", { course, error })

    if (error) {
      console.error("Error fetching course:", error)
      throw error
    }

    if (!course) {
      throw new Error("Course not found")
    }

    // Check if user owns this course
    if (course.creator_wallet.toLowerCase() !== walletAddress) {
      throw new Error("Unauthorized: You can only edit your own courses")
    }

    // Sort lessons by order_index
    const sortedLessons = course.lessons?.sort((a: any, b: any) => a.order_index - b.order_index) || []

    return {
      ...course,
      lessons: sortedLessons,
    }
  } catch (error) {
    console.error("Error in getCourseForEdit:", error)
    throw error
  }
}

/**
 * Update course
 */
export async function updateCourse(
  courseId: string,
  courseData: { title: string; description?: string },
  lessons: LessonUpdateData[],
  session: WalletSession,
) {
  console.log("updateCourse called with:", {
    courseId,
    courseData,
    lessons: lessons.length,
    sessionAddress: session?.address,
  })

  try {
    // Verify session
    const walletAddress = verifyWalletSession(session)

    // First, verify the user owns this course
    const { data: existingCourse, error: courseCheckError } = await supabaseAdmin
      .from("courses")
      .select("creator_wallet")
      .eq("id", courseId)
      .single()

    console.log("Course ownership check:", { existingCourse, courseCheckError })

    if (courseCheckError) {
      throw new Error(`Failed to verify course ownership: ${courseCheckError.message}`)
    }

    if (!existingCourse || existingCourse.creator_wallet.toLowerCase() !== walletAddress) {
      throw new Error("Unauthorized: You can only edit your own courses")
    }

    // Update course details
    const { error: courseUpdateError } = await supabaseAdmin
      .from("courses")
      .update({
        title: courseData.title,
        description: courseData.description || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)

    console.log("Course update result:", { courseUpdateError })

    if (courseUpdateError) {
      throw new Error(`Failed to update course: ${courseUpdateError.message}`)
    }

    // Get existing lessons to determine what to update/delete
    const { data: existingLessons, error: lessonsError } = await supabaseAdmin
      .from("lessons")
      .select("*")
      .eq("course_id", courseId)

    console.log("Existing lessons:", { existingLessons, lessonsError })

    if (lessonsError) {
      throw new Error(`Failed to fetch existing lessons: ${lessonsError.message}`)
    }

    const existingLessonIds = new Set(existingLessons?.map((l) => l.id) || [])
    const updatedLessonIds = new Set(lessons.filter((l) => l.id).map((l) => l.id))

    // Delete lessons that are no longer in the update
    const lessonsToDelete = existingLessons?.filter((l) => !updatedLessonIds.has(l.id)) || []

    if (lessonsToDelete.length > 0) {
      console.log(
        "Deleting lessons:",
        lessonsToDelete.map((l) => l.id),
      )

      const { error: deleteError } = await supabaseAdmin
        .from("lessons")
        .delete()
        .in(
          "id",
          lessonsToDelete.map((l) => l.id),
        )

      if (deleteError) {
        console.error("Error deleting lessons:", deleteError)
        throw new Error(`Failed to delete lessons: ${deleteError.message}`)
      }
    }

    // Process each lesson (update existing or insert new)
    for (const lesson of lessons) {
      const lessonData = {
        title: lesson.title,
        youtube_url: lesson.youtube_url,
        order_index: lesson.order_index,
        course_id: courseId,
      }

      if (lesson.id && existingLessonIds.has(lesson.id)) {
        // Update existing lesson
        console.log("Updating lesson:", lesson.id)

        const { error: updateError } = await supabaseAdmin.from("lessons").update(lessonData).eq("id", lesson.id)

        if (updateError) {
          console.error("Error updating lesson:", updateError)
          throw new Error(`Failed to update lesson "${lesson.title}": ${updateError.message}`)
        }
      } else {
        // Insert new lesson
        console.log("Inserting new lesson:", lesson.title)

        const { error: insertError } = await supabaseAdmin.from("lessons").insert([lessonData])

        if (insertError) {
          console.error("Error inserting lesson:", insertError)
          throw new Error(`Failed to create lesson "${lesson.title}": ${insertError.message}`)
        }
      }
    }

    console.log("Course update completed successfully")

    // Revalidate relevant paths
    revalidatePath(`/courses/${courseId}`)
    revalidatePath(`/dashboard/edit/${courseId}`)
    revalidatePath("/dashboard")
    revalidatePath("/courses")

    return { success: true }
  } catch (error) {
    console.error("Error in updateCourse:", error)
    throw error
  }
}

/**
 * Delete course
 */
export async function deleteCourse(courseId: string, session: WalletSession) {
  console.log("deleteCourse called with:", { courseId, sessionAddress: session?.address })

  try {
    // Verify session
    const walletAddress = verifyWalletSession(session)

    // First, verify the user owns this course
    const { data: existingCourse, error: courseCheckError } = await supabaseAdmin
      .from("courses")
      .select("creator_wallet, title")
      .eq("id", courseId)
      .single()

    console.log("Course ownership check for deletion:", { existingCourse, courseCheckError })

    if (courseCheckError) {
      throw new Error(`Failed to verify course ownership: ${courseCheckError.message}`)
    }

    if (!existingCourse || existingCourse.creator_wallet.toLowerCase() !== walletAddress) {
      throw new Error("Unauthorized: You can only delete your own courses")
    }

    // Delete all lessons first (due to foreign key constraint)
    const { error: lessonsDeleteError } = await supabaseAdmin.from("lessons").delete().eq("course_id", courseId)

    console.log("Lessons deletion result:", { lessonsDeleteError })

    if (lessonsDeleteError) {
      throw new Error(`Failed to delete course lessons: ${lessonsDeleteError.message}`)
    }

    // Delete the course
    const { error: courseDeleteError } = await supabaseAdmin.from("courses").delete().eq("id", courseId)

    console.log("Course deletion result:", { courseDeleteError })

    if (courseDeleteError) {
      throw new Error(`Failed to delete course: ${courseDeleteError.message}`)
    }

    console.log("Course deleted successfully:", existingCourse.title)

    // Revalidate relevant paths
    revalidatePath("/dashboard")
    revalidatePath("/courses")

    return { success: true, title: existingCourse.title }
  } catch (error) {
    console.error("Error in deleteCourse:", error)
    throw error
  }
}

/**
 * Delete lesson
 */
export async function deleteLessonSecure(lessonId: string, session: WalletSession) {
  console.log("deleteLessonSecure called with:", { lessonId, sessionAddress: session?.address })

  try {
    // Verify session
    const walletAddress = verifyWalletSession(session)

    // Fetch the lesson and the course creator
    const { data: lesson, error: fetchError } = await supabaseAdmin
      .from("lessons")
      .select(
        `
        id,
        course_id,
        courses!inner (
          creator_wallet
        )
      `,
      )
      .eq("id", lessonId)
      .single()

    console.log("Lesson ownership check:", { lesson, fetchError })

    if (fetchError) {
      throw new Error(`Failed to fetch lesson: ${fetchError.message}`)
    }

    // @ts-ignore - Supabase types can be tricky with joins
    if (!lesson || lesson.courses.creator_wallet.toLowerCase() !== walletAddress) {
      throw new Error("Unauthorized: You can only delete lessons from your own courses")
    }

    // Delete the lesson
    const { error: deleteError } = await supabaseAdmin.from("lessons").delete().eq("id", lessonId)

    console.log("Lesson deletion result:", { deleteError })

    if (deleteError) {
      throw new Error(`Failed to delete lesson: ${deleteError.message}`)
    }

    console.log("Lesson deleted successfully", lessonId)
    return { success: true }
  } catch (error) {
    console.error("Error in deleteLessonSecure:", error)
    throw error
  }
}

/**
 * Create course
 */
export async function createCourse(formData: FormData, session: WalletSession) {
  console.log("createCourse called with session:", session?.address)

  try {
    // Verify session
    const walletAddress = verifyWalletSession(session)

    const title = formData.get("title") as string
    const description = formData.get("description") as string

    if (!title?.trim()) {
      throw new Error("Course title is required")
    }

    const courseData = {
      title: title.trim(),
      description: description?.trim() || null,
      creator_wallet: walletAddress,
    }

    console.log("Creating course with data:", courseData)

    const { data: course, error } = await supabaseAdmin.from("courses").insert([courseData]).select().single()

    console.log("Course creation result:", { course, error })

    if (error) {
      throw new Error(`Failed to create course: ${error.message}`)
    }

    console.log("Course created successfully:", course.id)

    // Revalidate relevant paths
    revalidatePath("/dashboard")
    revalidatePath("/courses")

    return { success: true, courseId: course.id }
  } catch (error) {
    console.error("Error in createCourse:", error)
    throw error
  }
}

// Export for backward compatibility
export const deleteCourseSecure = deleteCourse
