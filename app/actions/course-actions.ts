"use server"

import { supabaseAdmin } from "@/lib/supabase-admin"
import { SolanaAuth, type SolanaSession } from "@/lib/solana-auth"
import { revalidatePath } from "next/cache"

export interface CourseFormData {
  title: string
  description: string
  thumbnail_url: string
  difficulty: "beginner" | "intermediate" | "advanced"
  category: string
  estimated_duration: number
  is_free: boolean
  price?: number
}

export interface LessonFormData {
  title: string
  description: string
  content: string
  video_url?: string
  order_index: number
  duration_minutes?: number
}

/**
 * Verify Solana wallet session and extract wallet address
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

export async function createCourse(courseData: CourseFormData, session: SolanaSession) {
  console.log("createCourse called with:", {
    title: courseData.title,
    sessionAddress: session?.address,
    hasSession: !!session,
  })

  try {
    // Verify session
    const authenticatedWallet = verifySolanaSession(session)

    const newCourse = {
      ...courseData,
      creator_wallet: authenticatedWallet,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log("Creating course with data:", newCourse)

    const { data: course, error } = await supabaseAdmin.from("courses_sol").insert(newCourse).select().single()

    console.log("Course creation result:", { course, error })

    if (error) {
      console.error("Course creation error:", error)
      throw new Error(`Failed to create course: ${error.message}`)
    }

    console.log("Course created successfully:", course.id)
    revalidatePath("/courses")
    revalidatePath("/dashboard")
    return { success: true, course }
  } catch (error: any) {
    console.error("Error in createCourse:", error)
    throw error
  }
}

export async function updateCourse(courseId: string, courseData: CourseFormData, session: SolanaSession) {
  console.log("updateCourse called with:", {
    courseId,
    title: courseData.title,
    sessionAddress: session?.address,
    hasSession: !!session,
  })

  try {
    // Verify session
    const authenticatedWallet = verifySolanaSession(session)

    // First, verify the user owns this course
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

    const updateData = {
      ...courseData,
      updated_at: new Date().toISOString(),
    }

    console.log("Updating course with data:", updateData)

    const { data: course, error } = await supabaseAdmin
      .from("courses_sol")
      .update(updateData)
      .eq("id", courseId)
      .select()
      .single()

    console.log("Course update result:", { course, error })

    if (error) {
      console.error("Course update error:", error)
      throw new Error(`Failed to update course: ${error.message}`)
    }

    console.log("Course updated successfully")
    revalidatePath("/courses")
    revalidatePath("/dashboard")
    revalidatePath(`/courses/${courseId}`)
    return { success: true, course }
  } catch (error: any) {
    console.error("Error in updateCourse:", error)
    throw error
  }
}

export async function deleteCourse(courseId: string, session: SolanaSession) {
  console.log("deleteCourse called with:", {
    courseId,
    sessionAddress: session?.address,
    hasSession: !!session,
  })

  try {
    // Verify session
    const authenticatedWallet = verifySolanaSession(session)

    // First, verify the user owns this course
    const { data: existingCourse, error: fetchError } = await supabaseAdmin
      .from("courses_sol")
      .select("creator_wallet")
      .eq("id", courseId)
      .single()

    if (fetchError) {
      throw new Error(`Course not found: ${fetchError.message}`)
    }

    if (existingCourse.creator_wallet !== authenticatedWallet) {
      throw new Error("Unauthorized: You can only delete your own courses")
    }

    console.log("Deleting course:", courseId)

    const { error } = await supabaseAdmin.from("courses_sol").delete().eq("id", courseId)

    console.log("Course deletion result:", { error })

    if (error) {
      console.error("Course deletion error:", error)
      throw new Error(`Failed to delete course: ${error.message}`)
    }

    console.log("Course deleted successfully")
    revalidatePath("/courses")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error: any) {
    console.error("Error in deleteCourse:", error)
    throw error
  }
}

export async function addLesson(courseId: string, lessonData: LessonFormData, session: SolanaSession) {
  console.log("addLesson called with:", {
    courseId,
    title: lessonData.title,
    sessionAddress: session?.address,
    hasSession: !!session,
  })

  try {
    // Verify session
    const authenticatedWallet = verifySolanaSession(session)

    // First, verify the user owns this course
    const { data: existingCourse, error: fetchError } = await supabaseAdmin
      .from("courses_sol")
      .select("creator_wallet")
      .eq("id", courseId)
      .single()

    if (fetchError) {
      throw new Error(`Course not found: ${fetchError.message}`)
    }

    if (existingCourse.creator_wallet !== authenticatedWallet) {
      throw new Error("Unauthorized: You can only add lessons to your own courses")
    }

    const newLesson = {
      ...lessonData,
      course_id: courseId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log("Adding lesson with data:", newLesson)

    const { data: lesson, error } = await supabaseAdmin.from("lessons_sol").insert(newLesson).select().single()

    console.log("Lesson creation result:", { lesson, error })

    if (error) {
      console.error("Lesson creation error:", error)
      throw new Error(`Failed to add lesson: ${error.message}`)
    }

    console.log("Lesson added successfully")
    revalidatePath(`/courses/${courseId}`)
    revalidatePath("/dashboard")
    return { success: true, lesson }
  } catch (error: any) {
    console.error("Error in addLesson:", error)
    throw error
  }
}

export async function updateLesson(lessonId: string, lessonData: LessonFormData, session: SolanaSession) {
  console.log("updateLesson called with:", {
    lessonId,
    title: lessonData.title,
    sessionAddress: session?.address,
    hasSession: !!session,
  })

  try {
    // Verify session
    const authenticatedWallet = verifySolanaSession(session)

    // First, verify the user owns the course that contains this lesson
    const { data: lessonWithCourse, error: fetchError } = await supabaseAdmin
      .from("lessons_sol")
      .select(`
        id,
        course_id,
        courses_sol!inner(creator_wallet)
      `)
      .eq("id", lessonId)
      .single()

    if (fetchError) {
      throw new Error(`Lesson not found: ${fetchError.message}`)
    }

    if (lessonWithCourse.courses_sol.creator_wallet !== authenticatedWallet) {
      throw new Error("Unauthorized: You can only edit lessons in your own courses")
    }

    const updateData = {
      ...lessonData,
      updated_at: new Date().toISOString(),
    }

    console.log("Updating lesson with data:", updateData)

    const { data: lesson, error } = await supabaseAdmin
      .from("lessons_sol")
      .update(updateData)
      .eq("id", lessonId)
      .select()
      .single()

    console.log("Lesson update result:", { lesson, error })

    if (error) {
      console.error("Lesson update error:", error)
      throw new Error(`Failed to update lesson: ${error.message}`)
    }

    console.log("Lesson updated successfully")
    revalidatePath(`/courses/${lessonWithCourse.course_id}`)
    revalidatePath("/dashboard")
    return { success: true, lesson }
  } catch (error: any) {
    console.error("Error in updateLesson:", error)
    throw error
  }
}

export async function deleteLesson(lessonId: string, session: SolanaSession) {
  console.log("deleteLesson called with:", {
    lessonId,
    sessionAddress: session?.address,
    hasSession: !!session,
  })

  try {
    // Verify session
    const authenticatedWallet = verifySolanaSession(session)

    // First, verify the user owns the course that contains this lesson
    const { data: lessonWithCourse, error: fetchError } = await supabaseAdmin
      .from("lessons_sol")
      .select(`
        id,
        course_id,
        courses_sol!inner(creator_wallet)
      `)
      .eq("id", lessonId)
      .single()

    if (fetchError) {
      throw new Error(`Lesson not found: ${fetchError.message}`)
    }

    if (lessonWithCourse.courses_sol.creator_wallet !== authenticatedWallet) {
      throw new Error("Unauthorized: You can only delete lessons from your own courses")
    }

    console.log("Deleting lesson:", lessonId)

    const { error } = await supabaseAdmin.from("lessons_sol").delete().eq("id", lessonId)

    console.log("Lesson deletion result:", { error })

    if (error) {
      console.error("Lesson deletion error:", error)
      throw new Error(`Failed to delete lesson: ${error.message}`)
    }

    console.log("Lesson deleted successfully")
    revalidatePath(`/courses/${lessonWithCourse.course_id}`)
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error: any) {
    console.error("Error in deleteLesson:", error)
    throw error
  }
}

export async function getCoursesByCreator(walletAddress: string) {
  console.log("getCoursesByCreator called with:", { walletAddress })

  try {
    const { data: courses, error } = await supabaseAdmin
      .from("courses_sol")
      .select(`
        *,
        lessons_sol(id, title, order_index)
      `)
      .eq("creator_wallet", walletAddress)
      .order("created_at", { ascending: false })

    console.log("Courses fetch result:", { coursesCount: courses?.length, error })

    if (error) {
      throw new Error(`Failed to fetch courses: ${error.message}`)
    }

    return courses || []
  } catch (error) {
    console.error("Error in getCoursesByCreator:", error)
    throw error
  }
}

export async function getCourseWithLessons(courseId: string) {
  console.log("getCourseWithLessons called with:", { courseId })

  try {
    const { data: course, error } = await supabaseAdmin
      .from("courses_sol")
      .select(`
        *,
        lessons_sol(*)
      `)
      .eq("id", courseId)
      .single()

    console.log("Course with lessons fetch result:", { course: !!course, error })

    if (error) {
      throw new Error(`Failed to fetch course: ${error.message}`)
    }

    // Sort lessons by order_index
    if (course?.lessons_sol) {
      course.lessons_sol.sort((a: any, b: any) => a.order_index - b.order_index)
    }

    return course
  } catch (error) {
    console.error("Error in getCourseWithLessons:", error)
    throw error
  }
}

export async function createCourseWithLessons(
  courseData: { title: string; description: string | null },
  lessons: Array<{
    title: string
    description: string
    youtube_url: string
  }>,
  session: SolanaSession,
) {
  console.log("createCourseWithLessons called:", {
    title: courseData.title,
    lessons: lessons.length,
    sessionAddress: session?.address,
  })

  try {
    /* 1️⃣  verify wallet session */
    const wallet = verifySolanaSession(session)

    /* 2️⃣  insert course */
    console.log("[SERVER] Inserting course with data:", {
      title: courseData.title,
      description: courseData.description,
      creator_wallet: wallet,
    })

    const { data: course, error: courseErr } = await supabaseAdmin
      .from("courses_sol")
      .insert({
        title: courseData.title,
        description: courseData.description,
        creator_wallet: wallet,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (courseErr) {
      console.error("[SERVER] Course creation error:", JSON.stringify(courseErr, null, 2))
      return { success: false, error: courseErr.message }
    }

    console.log("[SERVER] Course created successfully:", course.id)

    /* 3️⃣  insert lessons (ordered) */
    const lessonsToInsert = lessons.map((l, i) => ({
      course_id: course.id,
      title: l.title,
      description: l.description || null,
      youtube_url: l.youtube_url,
      order_index: i,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    console.log("[SERVER] Inserting lessons:", lessonsToInsert.length)

    const { error: lessonErr } = await supabaseAdmin.from("lessons_sol").insert(lessonsToInsert)

    if (lessonErr) {
      console.error("[SERVER] Lesson creation error:", JSON.stringify(lessonErr, null, 2))
      return { success: false, error: lessonErr.message }
    }

    console.log("[SERVER] Lessons created successfully")

    /* 4️⃣  cache busting */
    revalidatePath("/courses")
    revalidatePath("/dashboard")

    return { success: true, courseId: course.id }
  } catch (error: any) {
    console.error("[SERVER] Unexpected error in createCourseWithLessons:", {
      message: error.message,
      stack: error.stack,
      error: JSON.stringify(error, null, 2),
    })
    return { success: false, error: error.message || "An unexpected error occurred" }
  }
}
