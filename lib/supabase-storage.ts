import { supabase } from "./supabase"

/**
 * Upload an image file to Supabase Storage
 */
export async function uploadAvatarToSupabase(file: File, walletAddress: string): Promise<string> {
  try {
    // Create a unique filename
    const fileExt = file.name.split(".").pop()
    const fileName = `${walletAddress.toLowerCase()}-${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    // Upload the file
    const { data, error } = await supabase.storage.from("avatars").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      console.error("Supabase storage error:", error)
      throw new Error(`Upload failed: ${error.message}`)
    }

    // Get the public URL
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(data.path)

    return urlData.publicUrl
  } catch (error) {
    console.error("Error uploading to Supabase:", error)
    throw error
  }
}

/**
 * Upload a base64 image to Supabase Storage
 */
export async function uploadBase64ToSupabase(base64Data: string, walletAddress: string): Promise<string> {
  try {
    // Convert base64 to blob
    const response = await fetch(base64Data)
    const blob = await response.blob()

    // Create a file from the blob
    const file = new File([blob], `avatar-${Date.now()}.jpg`, { type: "image/jpeg" })

    return await uploadAvatarToSupabase(file, walletAddress)
  } catch (error) {
    console.error("Error converting base64 to file:", error)
    throw error
  }
}

/**
 * Delete an avatar from Supabase Storage
 */
export async function deleteAvatarFromSupabase(avatarUrl: string): Promise<void> {
  try {
    // Extract the file path from the URL
    const url = new URL(avatarUrl)
    const pathParts = url.pathname.split("/")
    const filePath = pathParts.slice(-2).join("/") // Get 'avatars/filename.jpg'

    const { error } = await supabase.storage.from("avatars").remove([filePath])

    if (error) {
      console.error("Error deleting avatar:", error)
      // Don't throw error for deletion failures as it's not critical
    }
  } catch (error) {
    console.error("Error parsing avatar URL for deletion:", error)
    // Don't throw error for deletion failures
  }
}
