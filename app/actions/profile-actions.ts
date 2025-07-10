"use server"

import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"

export interface ProfileUpdateData {
  display_name: string
  avatar_url: string
  about_me: string
  website_url: string
  twitter_handle: string
}

export async function updateProfile(
  walletAddress: string,
  profileData: ProfileUpdateData,
  authenticatedWallet: string,
) {
  console.log("updateProfile called with:", { walletAddress, authenticatedWallet })

  // Security check: ensure the authenticated wallet matches the profile being updated
  if (walletAddress.toLowerCase() !== authenticatedWallet.toLowerCase()) {
    throw new Error("Unauthorized: You can only edit your own profile")
  }

  try {
    // Clean Twitter handle (remove @ if present)
    const cleanTwitterHandle = profileData.twitter_handle.replace(/^@/, "")

    const updateData = {
      wallet_address: walletAddress.toLowerCase(),
      display_name: profileData.display_name.trim() || null,
      avatar_url: profileData.avatar_url.trim() || null,
      about_me: profileData.about_me.trim() || null,
      website_url: profileData.website_url.trim() || null,
      twitter_handle: cleanTwitterHandle.trim() || null,
      updated_at: new Date().toISOString(),
    }

    console.log("Updating profile with data:", updateData)

    // Try to update existing profile first
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from("user_profiles")
      .update(updateData)
      .eq("wallet_address", walletAddress.toLowerCase())
      .select()
      .maybeSingle()

    console.log("Update result:", { updatedProfile, updateError })

    if (updateError) {
      console.error("Update error:", updateError)
      throw new Error(`Failed to update profile: ${updateError.message}`)
    }

    if (updatedProfile) {
      console.log("Profile updated successfully")
      revalidatePath(`/creator/${walletAddress}`)
      return { success: true, profile: updatedProfile }
    }

    // If no rows were updated, create a new profile
    console.log("No existing profile found, creating new one")

    const { data: newProfile, error: insertError } = await supabaseAdmin
      .from("user_profiles")
      .insert([updateData])
      .select()
      .single()

    console.log("Insert result:", { newProfile, insertError })

    if (insertError) {
      console.error("Insert error:", insertError)
      throw new Error(`Failed to create profile: ${insertError.message}`)
    }

    console.log("Profile created successfully")
    revalidatePath(`/creator/${walletAddress}`)
    return { success: true, profile: newProfile }
  } catch (error: any) {
    console.error("Error in updateProfile:", error)
    throw error
  }
}
