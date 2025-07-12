"use server"

import { supabaseAdmin } from "@/lib/supabase-admin"
import { WalletAuth, type WalletSession } from "@/lib/wallet-auth"

export interface DashboardData {
  profile: any
  courses: any[]
  stats: {
    totalCourses: number
    totalLessons: number
    createdThisMonth: number
  }
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
 * Get all dashboard data for authenticated user
 */
export async function getDashboardData(session: WalletSession): Promise<DashboardData> {
  console.log("getDashboardData called with session:", session?.address)

  try {
    // Verify session
    const walletAddress = verifyWalletSession(session)

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("wallet_address", walletAddress)
      .single()

    if (profileError && profileError.code !== "PGRST116") {
      console.error("Error fetching profile:", profileError)
      throw new Error(`Failed to fetch profile: ${profileError.message}`)
    }

    // Fetch user's courses with lessons
    const { data: courses, error: coursesError } = await supabaseAdmin
      .from("courses")
      .select(`
        *,
        lessons (*)
      `)
      .eq("creator_wallet", walletAddress)
      .order("created_at", { ascending: false })

    if (coursesError) {
      console.error("Error fetching courses:", coursesError)
      throw new Error(`Failed to fetch courses: ${coursesError.message}`)
    }

    // Sort lessons by order_index for each course
    const coursesWithSortedLessons =
      courses?.map((course) => ({
        ...course,
        lessons: course.lessons?.sort((a: any, b: any) => a.order_index - b.order_index) || [],
      })) || []

    // Calculate stats
    const totalCourses = coursesWithSortedLessons.length
    const totalLessons = coursesWithSortedLessons.reduce((sum, course) => sum + (course.lessons?.length || 0), 0)

    // Count courses created this month
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)

    const createdThisMonth = coursesWithSortedLessons.filter(
      (course) => new Date(course.created_at) >= thisMonth,
    ).length

    const stats = {
      totalCourses,
      totalLessons,
      createdThisMonth,
    }

    console.log("Dashboard data fetched successfully:", {
      hasProfile: !!profile,
      coursesCount: coursesWithSortedLessons.length,
      stats,
    })

    return {
      profile: profile || null,
      courses: coursesWithSortedLessons,
      stats,
    }
  } catch (error) {
    console.error("Error in getDashboardData:", error)
    throw error
  }
}

/**
 * Delete course securely
 */
export async function deleteCourseSecure(courseId: string, session: WalletSession) {
  console.log("deleteCourseSecure called with:", { courseId, sessionAddress: session?.address })

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

    return { success: true, title: existingCourse.title }
  } catch (error) {
    console.error("Error in deleteCourseSecure:", error)
    throw error
  }
}
