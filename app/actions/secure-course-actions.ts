"use server"

import { supabaseAdmin } from "@/lib/supabase-admin"
import { SolanaAuth, type SolanaSession } from "@/lib/solana-auth"
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
 * Verify Solana session and extract wallet address
 */
function verifySolanaSession(session: SolanaSession): string {
  console.log("Verifying Solana session:", {
    address: session?.address,
    timestamp: session?.timestamp,
    hasSignature: !!session?.signature,
  })

  if (!session) {
    throw new Error("No authentication session provided")
  }

  // Verify signature
  if (!SolanaAuth.verifySession(session)) {
    throw new Error("Invalid or expired authentication session")
  }

  console.log("Session verified successfully for:", session.address)
  return session.address
}

/**
 * Get course for editing
 */
export async function getCourseForEdit(courseId: string, session: SolanaSession) {
  console.log("getCourseForEdit called with:", {
    courseId,
    sessionAddress: session?.address,
  })

  try {
    // Verify session
    const authenticatedWallet = verifySolanaSession(session)

    // Set wallet context
    await supabaseAdmin.rpc("set_wallet_context", { wallet_address: authenticatedWallet })

    // Fetch course with lessons
    const { data: course, error } = await supabaseAdmin
      .from("courses_sol")
      .select(`
        *,
        lessons_sol (*)
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

    const courseWithLessons = {
      ...course,
      lessons: course.lessons_sol || [],
    }

    // Sort lessons by order_index
    if (courseWithLessons.lessons) {
      courseWithLessons.lessons.sort((a: any, b: any) => a.order_index - b.order_index)
    }

    console.log("Course fetched successfully for editing")
    return courseWithLessons
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
  session: SolanaSession,
) {
  console.log("updateCourse called with:", {
    courseId,
    title: courseData.title,
    lessonsCount: lessons.length,
    sessionAddress: session?.address,
  })

  try {
    // Verify session
    const authenticatedWallet = verifySolanaSession(session)

    // Set wallet context
    await supabaseAdmin.rpc("set_wallet_context", { wallet_address: authenticatedWallet })

    // Verify ownership
    const { data: existingCourse, error: fetchError } = await supabaseAdmin
      .from("courses_sol")
      .select("creator_wallet")
      .eq("id", courseId)
      .single()

    if (fetchError) {
      throw new Error(`Course not found: ${fetchError.message}`)
    }

    if (existingCourse.creator_wallet !== authenticatedWallet) {
      throw new Error("Unauthorized: You can only edit your own courses")
    }

    // Update course
    const { error: courseError } = await supabaseAdmin
      .from("courses_sol")
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
    const { error: deleteError } = await supabaseAdmin.from("lessons_sol").delete().eq("course_id", courseId)

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

      const { error: insertError } = await supabaseAdmin.from("lessons_sol").insert(lessonsToInsert)

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
export async function deleteCourse(courseId: string, session: SolanaSession) {
  console.log("deleteCourse called with:", { courseId, sessionAddress: session?.address })

  try {
    // Verify session
    const walletAddress = verifySolanaSession(session)

    // First, verify the user owns this course
    const { data: existingCourse, error: courseCheckError } = await supabaseAdmin
      .from("courses_sol")
      .select("creator_wallet, title")
      .eq("id", courseId)
      .single()

    console.log("Course ownership check for deletion:", { existingCourse, courseCheckError })

    if (courseCheckError) {
      throw new Error(`Failed to verify course ownership: ${courseCheckError.message}`)
    }

    if (!existingCourse || existingCourse.creator_wallet !== walletAddress) {
      throw new Error("Unauthorized: You can only delete your own courses")
    }

    // Delete all lessons first (due to foreign key constraint)
    const { error: lessonsDeleteError } = await supabaseAdmin.from("lessons_sol").delete().eq("course_id", courseId)

    console.log("Lessons deletion result:", { lessonsDeleteError })

    if (lessonsDeleteError) {
      throw new Error(`Failed to delete course lessons: ${lessonsDeleteError.message}`)
    }

    // Delete the course
    const { error: courseDeleteError } = await supabaseAdmin.from("courses_sol").delete().eq("id", courseId)

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
export async function deleteLessonSecure(lessonId: string, session: SolanaSession) {
  console.log("deleteLessonSecure called with:", { lessonId, sessionAddress: session?.address })

  try {
    // Verify session
    const walletAddress = verifySolanaSession(session)

    // Fetch the lesson and the course creator
    const { data: lesson, error: fetchError } = await supabaseAdmin
      .from("lessons_sol")
      .select(
        `
        id,
        course_id,
        courses_sol!inner (
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
    if (!lesson || lesson.courses_sol.creator_wallet !== walletAddress) {
      throw new Error("Unauthorized: You can only delete lessons from your own courses")
    }

    // Delete the lesson
    const { error: deleteError } = await supabaseAdmin.from("lessons_sol").delete().eq("id", lessonId)

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
export async function createCourse(formData: FormData, session: SolanaSession) {
  console.log("createCourse called with session:", session?.address)

  try {
    // Verify session
    const walletAddress = verifySolanaSession(session)

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

    const { data: course, error } = await supabaseAdmin.from("courses_sol").insert([courseData]).select().single()

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
