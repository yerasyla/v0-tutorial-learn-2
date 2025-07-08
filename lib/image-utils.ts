/**
 * Convert a File to a base64 data URL
 */
export const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Resize an image file to specified dimensions
 */
export const resizeImage = (file: File, maxWidth = 200, maxHeight = 200, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
      }

      canvas.width = width
      canvas.height = height

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height)

      // Use lower quality and try to optimize for size
      const dataURL = canvas.toDataURL("image/jpeg", quality)

      // Clean up
      URL.revokeObjectURL(img.src)

      resolve(dataURL)
    }

    img.onerror = reject
    img.crossOrigin = "anonymous"
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Validate image file
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 2 * 1024 * 1024 // 2MB (reduced from 5MB)
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: "Please select a valid image file (JPEG, PNG, GIF, or WebP)" }
  }

  if (file.size > maxSize) {
    return { valid: false, error: "Image size must be less than 2MB" }
  }

  return { valid: true }
}
