/**
 * This was a simple implementation to upload images to ImgBB
 * Now replaced with Supabase Storage for better reliability
 */

// Free ImgBB API key for demo purposes only
// In production, use environment variables and a proper storage solution
const IMGBB_API_KEY = "c1d54a0d7c4fa1f66ed35e2a5a7dc684"

export async function uploadImageToExternalHost(base64Image: string): Promise<string> {
  throw new Error("External image hosting is deprecated. Use Supabase Storage instead.")
}
