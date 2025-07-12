"use server"

import { supabaseAdmin } from "@/lib/supabase-admin"
import { WalletAuth, type WalletSession } from "@/lib/wallet-auth"
import { revalidatePath } from "next/cache"

export interface CourseUpdateData {
  title: string
  description: string
}

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
  console.log("Verifying wallet session:", {
    address: session?.address,
    timestamp: session?.timestamp,
    hasSignature: !!session?.signature,
  })

  if (!session) {
    throw new Error("No authentication session provided")
  }

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
  console.log("getCourseForEdit called with:", {
    courseId,
    sessionAddress: session?.address,
  })

  try {
    // Verify session
    const authenticatedWallet = verifyWalletSession(session)

    // Set wallet context
    await supabaseAdmin.rpc("set_wallet_context", { wallet_address: authenticatedWallet })

    // Fetch course with lessons
    const { data: course, error } = await supabaseAdmin
      .from("courses")
      .select(`
        *,
        lessons (*)
      `)
      .eq("id", courseId)
      .eq("creator_wallet", authenticatedWallet)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error("Course not found or you don't have permission to edit it")
      }
      throw new Error(`Failed to fetch course: ${error.message}`)
    }

    // Sort lessons by order_index
    if (course.lessons) {
      course.lessons.sort((a: any, b: any) => a.order_index - b.order_index)
    }

    console.log("Course fetched successfully for editing")
    return course
  } catch (error: any) {
    console.error("Error in getCourseForEdit:", error)
    throw error
  }
}

/**
 * Update course
 */
export async function updateCourse(
  courseId: string,
  courseData: CourseUpdateData,
  lessons: LessonUpdateData[],
  session: WalletSession,
) {
  console.log("updateCourse called with:", {
    courseId,
    title: courseData.title,
    lessonsCount: lessons.length,
    sessionAddress: session?.address,
  })

  try {
    // Verify session
    const authenticatedWallet = verifyWalletSession(session)

    // Set wallet context
    await supabaseAdmin.rpc("set_wallet_context", { wallet_address: authenticatedWallet })

    // Verify ownership
    const { data: existingCourse, error: fetchError } = await supabaseAdmin
      .from("courses")
      .select("creator_wallet")
      .eq("id", courseId)
      .single()

    if (fetchError) {
      throw new Error(`Course not found: ${fetchError.message}`)
    }

    if (existingCourse.creator_wallet.toLowerCase() !== authenticatedWallet) {
      throw new Error("Unauthorized: You can only edit your own courses")
    }

    // Update course
    const { error: courseError } = await supabaseAdmin
      .from("courses")
      .update({
        title: courseData.title,
        description: courseData.description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)

    if (courseError) {
      throw new Error(`Failed to update course: ${courseError.message}`)
    }

    // Delete existing lessons
    const { error: deleteError } = await supabaseAdmin.from("lessons").delete().eq("course_id", courseId)

    if (deleteError) {
      throw new Error(`Failed to delete existing lessons: ${deleteError.message}`)
    }

    // Insert new lessons
    if (lessons.length > 0) {
      const lessonsToInsert = lessons.map((lesson) => ({
        course_id: courseId,
        title: lesson.title,
        youtube_url: lesson.youtube_url,
        order_index: lesson.order_index,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      const { error: insertError } = await supabaseAdmin.from("lessons").insert(lessonsToInsert)

      if (insertError) {
        throw new Error(`Failed to insert lessons: ${insertError.message}`)
      }
    }

    console.log("Course updated successfully")
    revalidatePath("/dashboard")
    revalidatePath(`/courses/${courseId}`)
    return { success: true }
  } catch (error: any) {
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
