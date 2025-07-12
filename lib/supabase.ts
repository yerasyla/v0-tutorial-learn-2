import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

// Client-side Supabase client - READ ONLY due to RLS policies
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Note: This client can only read data due to RLS policies
// All write operations must go through server actions with proper authentication

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
