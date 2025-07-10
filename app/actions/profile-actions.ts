"use server"

import { revalidatePath } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { WalletAuth, type WalletSession } from "@/lib/wallet-auth"

export interface ProfileUpdateData {
  display_name: string
  avatar_url: string
  about_me: string
  website_url: string
  twitter_handle: string
}

/**
 * Verify the wallet session and return its lowercase address.
 */
function verifyWalletSession(session: WalletSession): string {
  console.log("[SERVER] Verifying wallet session:", {
    hasSession: !!session,
    address: session?.address,
    timestamp: session?.timestamp,
    hasSignature: !!session?.signature,
    hasMessage: !!session?.message,
    expiresAt: session?.expiresAt,
    sessionType: typeof session,
  })

  if (!session) {
    throw new Error("No authentication session provided")
  }

  if (!session.address || !session.message || !session.signature) {
    console.error("[SERVER] Session missing required fields:", {
      hasAddress: !!session.address,
      hasMessage: !!session.message,
      hasSignature: !!session.signature,
    })
    throw new Error("Invalid session structure")
  }

  // Verify signature
  if (!WalletAuth.verifySession(session)) {
    throw new Error("Invalid or expired authentication session")
  }

  console.log("[SERVER] Session verified successfully for:", session.address)
  return session.address.toLowerCase()
}

export async function updateProfile(walletAddress: string, profileData: ProfileUpdateData, session: WalletSession) {
  console.log("[SERVER] updateProfile called with:", {
    walletAddress,
    sessionAddress: session?.address,
    hasSession: !!session,
    sessionKeys: session ? Object.keys(session) : [],
  })

  try {
    // Verify session
    const authenticatedWallet = verifyWalletSession(session)

    // Security check: ensure the authenticated wallet matches the profile being updated
    if (walletAddress.toLowerCase() !== authenticatedWallet) {
      throw new Error("Unauthorized: You can only edit your own profile")
    }

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

    console.log("[SERVER] Updating profile with data:", updateData)

    // Use upsert to handle both insert and update
    const { data: profile, error } = await supabaseAdmin
      .from("user_profiles")
      .upsert(updateData, {
        onConflict: "wallet_address",
      })
      .select()
      .single()

    console.log("[SERVER] Profile upsert result:", { profile, error })

    if (error) {
      console.error("[SERVER] Profile upsert error:", error)
      throw new Error(`Failed to update profile: ${error.message}`)
    }

    console.log("[SERVER] Profile updated successfully")
    revalidatePath(`/creator/${walletAddress}`)
    return { success: true, profile }
  } catch (error: any) {
    console.error("[SERVER] Error in updateProfile:", error)
    throw error
  }
}

export async function getProfile(walletAddress: string) {
  console.log("[SERVER] getProfile called with:", { walletAddress })

  try {
    const { data: profile, error } = await supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("wallet_address", walletAddress.toLowerCase())
      .single()

    console.log("[SERVER] Profile fetch result:", { profile, error })

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" error, which is expected for new users
      throw new Error(`Failed to fetch profile: ${error.message}`)
    }

    return profile || null
  } catch (error) {
    console.error("[SERVER] Error in getProfile:", error)
    throw error
  }
}
