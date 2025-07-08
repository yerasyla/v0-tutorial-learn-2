"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { X, Camera, Upload } from "@phosphor-icons/react"
import { validateImageFile, resizeImage } from "@/lib/image-utils"
import { uploadAvatarToSupabase } from "@/lib/supabase-storage"

interface ClickUploadAvatarProps {
  currentAvatar?: string
  displayName?: string
  walletAddress: string
  onAvatarChange: (avatarUrl: string) => void
  disabled?: boolean
  size?: "sm" | "md" | "lg" | "xl"
  showInstructions?: boolean
}

const avatarSizes = {
  sm: "w-16 h-16",
  md: "w-24 h-24",
  lg: "w-32 h-32",
  xl: "w-40 h-40",
}

const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
}

const textSizes = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-sm",
  xl: "text-base",
}

export function ClickUploadAvatar({
  currentAvatar,
  displayName,
  walletAddress,
  onAvatarChange,
  disabled = false,
  size = "lg",
  showInstructions = true,
}: ClickUploadAvatarProps) {
  const [previewUrl, setPreviewUrl] = useState<string>(currentAvatar || "")
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      toast({
        title: "Invalid file",
        description: validation.error,
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      // Show immediate preview while uploading
      const previewDataURL = await resizeImage(file, 200, 200, 0.8)
      setPreviewUrl(previewDataURL)

      // Upload to Supabase Storage
      const uploadedUrl = await uploadAvatarToSupabase(file, walletAddress)

      // Update with the final URL
      setPreviewUrl(uploadedUrl)
      onAvatarChange(uploadedUrl)

      toast({
        title: "Profile picture updated!",
        description: "Your new profile picture has been uploaded successfully.",
      })
    } catch (error) {
      console.error("Error uploading avatar:", error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image. Please try again.",
        variant: "destructive",
      })

      // Reset preview on error
      setPreviewUrl(currentAvatar || "")
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveAvatar = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the upload when clicking remove
    setPreviewUrl("")
    onAvatarChange("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const triggerFileInput = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click()
    }
  }

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Avatar with click-to-upload */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div
            className={`relative ${!disabled ? "cursor-pointer group" : "cursor-default"} transition-all duration-200`}
            onClick={triggerFileInput}
          >
            <Avatar
              className={`${avatarSizes[size]} border-4 border-border transition-all duration-200 ${
                !disabled ? "group-hover:border-brand-primary group-hover:shadow-lg" : ""
              }`}
            >
              <AvatarImage src={previewUrl || "/placeholder.svg"} alt="Profile picture" className="object-cover" />
              <AvatarFallback
                className={`${
                  size === "xl" ? "text-4xl" : size === "lg" ? "text-2xl" : size === "md" ? "text-xl" : "text-lg"
                } bg-muted text-muted-foreground font-bold`}
              >
                {displayName?.charAt(0)?.toUpperCase() || formatWalletAddress(walletAddress).charAt(0)}
              </AvatarFallback>
            </Avatar>

            {/* Click to upload overlay */}
            {!disabled && (
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 rounded-full flex items-center justify-center transition-all duration-200">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-center">
                  {isUploading ? (
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                      <span className={`${textSizes[size]} font-medium`}>Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Camera size={iconSizes[size]} className="mb-2" />
                      <span className={`${textSizes[size]} font-medium`}>
                        {previewUrl ? "Change Photo" : "Upload Photo"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Remove button */}
          {previewUrl && !disabled && !isUploading && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 h-8 w-8 rounded-full p-0 shadow-lg hover:shadow-xl transition-shadow duration-200"
              onClick={handleRemoveAvatar}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Instructions */}
        {showInstructions && !disabled && (
          <div className="text-center max-w-xs">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <Camera size={16} className="inline mr-1" />
              Click on your photo to upload a new image
            </p>
            <p className="text-xs text-muted-foreground mt-1">Supports JPEG, PNG, GIF, WebP • Max 2MB</p>
          </div>
        )}

        {/* Alternative upload button for better accessibility */}
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={triggerFileInput}
            disabled={isUploading}
            className="border-2 border-border hover:border-brand-primary hover:bg-accent transition-colors duration-200 bg-transparent"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Uploading..." : previewUrl ? "Change Photo" : "Upload Photo"}
          </Button>
        )}
      </div>
    </div>
  )
}
