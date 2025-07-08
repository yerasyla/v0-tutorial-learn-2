import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
})

export type Course = {
  id: string
  title: string
  description: string | null
  creator_wallet: string
  created_at: string
  updated_at: string
}

export type Lesson = {
  id: string
  course_id: string
  title: string
  description: string | null
  youtube_url: string
  order_index: number
  created_at: string
  updated_at: string
}

export type CourseWithLessons = Course & {
  lessons: Lesson[]
}

export type Donation = {
  id: string
  course_id: string
  donor_wallet: string
  amount: string
  tx_hash: string
  created_at: string
}

export type UserProfile = {
  id: string
  wallet_address: string
  display_name: string | null
  avatar_url: string | null
  about_me: string | null
  website_url: string | null
  twitter_handle: string | null
  is_verified: boolean
  verification_date: string | null
  verification_notes: string | null
  created_at: string
  updated_at: string
}

// Test connection function
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from("courses").select("count", { count: "exact", head: true })
    if (error) {
      console.error("Supabase connection test failed:", error)
      return false
    }
    console.log("Supabase connection successful")
    return true
  } catch (error) {
    console.error("Supabase connection error:", error)
    return false
  }
}

// Verification functions
export const verifyCreator = async (walletAddress: string, notes?: string) => {
  try {
    const { error } = await supabase.rpc("verify_creator", {
      creator_wallet: walletAddress,
      notes: notes || null,
    })

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error("Error verifying creator:", error)
    return { success: false, error }
  }
}

export const unverifyCreator = async (walletAddress: string) => {
  try {
    const { error } = await supabase.rpc("unverify_creator", {
      creator_wallet: walletAddress,
    })

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error("Error unverifying creator:", error)
    return { success: false, error }
  }
}
