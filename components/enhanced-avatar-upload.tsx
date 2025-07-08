"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { Upload, X, Camera, LinkIcon } from "@phosphor-icons/react"
import { validateImageFile, resizeImage } from "@/lib/image-utils"
import { uploadAvatarToSupabase } from "@/lib/supabase-storage"

interface EnhancedAvatarUploadProps {
  currentAvatar?: string
  displayName?: string
  walletAddress: string
  onAvatarChange: (avatarUrl: string) => void
  disabled?: boolean
  size?: "sm" | "md" | "lg" | "xl"
  showUploadOptions?: boolean
  clickToUpload?: boolean
}

const avatarSizes = {
  sm: "w-16 h-16",
  md: "w-24 h-24",
  lg: "w-32 h-32",
  xl: "w-40 h-40",
}

export function EnhancedAvatarUpload({
  currentAvatar,
  displayName,
  walletAddress,
  onAvatarChange,
  disabled = false,
  size = "lg",
  showUploadOptions = true,
  clickToUpload = true,
}: EnhancedAvatarUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string>(currentAvatar || "")
  const [avatarUrl, setAvatarUrl] = useState<string>(currentAvatar || "")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file")
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
        title: "Avatar uploaded successfully!",
        description: "Your profile picture has been updated.",
      })
    } catch (error) {
      console.error("Error uploading avatar:", error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload avatar. Please try again.",
        variant: "destructive",
      })

      // Reset preview on error
      setPreviewUrl(currentAvatar || "")
    } finally {
      setIsUploading(false)
    }
  }

  const handleUrlChange = (url: string) => {
    setAvatarUrl(url)
    setPreviewUrl(url)
    onAvatarChange(url)
  }

  const handleRemoveAvatar = () => {
    setPreviewUrl("")
    setAvatarUrl("")
    onAvatarChange("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const triggerFileInput = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <div className="space-y-4">
      {/* Avatar Preview */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div
            className={`relative ${clickToUpload && !disabled ? "cursor-pointer group" : ""}`}
            onClick={clickToUpload ? triggerFileInput : undefined}
          >
            <Avatar
              className={`${avatarSizes[size]} border-4 border-border transition-all duration-200 ${clickToUpload && !disabled ? "group-hover:border-brand-primary group-hover:shadow-lg" : ""}`}
            >
              <AvatarImage src={previewUrl || "/placeholder.svg"} alt="Profile avatar" />
              <AvatarFallback
                className={`${size === "xl" ? "text-4xl" : size === "lg" ? "text-2xl" : size === "md" ? "text-xl" : "text-lg"} bg-muted text-muted-foreground`}
              >
                {displayName?.charAt(0)?.toUpperCase() || formatWalletAddress(walletAddress).charAt(0)}
              </AvatarFallback>
            </Avatar>

            {/* Click to upload overlay */}
            {clickToUpload && !disabled && (
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full flex items-center justify-center transition-all duration-200">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-center">
                  <Camera size={size === "xl" ? 32 : size === "lg" ? 24 : 20} className="mx-auto mb-1" />
                  <span className={`${size === "xl" ? "text-sm" : "text-xs"} font-medium`}>
                    {previewUrl ? "Change" : "Upload"}
                  </span>
                </div>
              </div>
            )}

            {/* Loading overlay */}
            {isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}
          </div>

          {/* Remove button */}
          {previewUrl && !disabled && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 h-8 w-8 rounded-full p-0 shadow-lg"
              onClick={handleRemoveAvatar}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Upload mode toggle */}
        {!disabled && showUploadOptions && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant={uploadMode === "file" ? "default" : "outline"}
              size="sm"
              onClick={() => setUploadMode("file")}
              disabled={isUploading}
            >
              <Camera className="h-4 w-4 mr-2" />
              Upload
            </Button>
            <Button
              type="button"
              variant={uploadMode === "url" ? "default" : "outline"}
              size="sm"
              onClick={() => setUploadMode("url")}
              disabled={isUploading}
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              URL
            </Button>
          </div>
        )}
      </div>

      {/* Upload Options */}
      {!disabled && showUploadOptions && (
        <Card>
          <CardContent className="p-4">
            {uploadMode === "file" ? (
              <div className="space-y-4">
                <div className="text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isUploading}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={triggerFileInput}
                    disabled={isUploading}
                    className="w-full bg-transparent"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? "Uploading..." : "Choose Image File"}
                  </Button>

                  <p className="text-xs text-muted-foreground mt-2">
                    Supports JPEG, PNG, GIF, WebP. Max size: 2MB
                    <br />
                    Images will be automatically resized and optimized.
                    <br />
                    {clickToUpload && (
                      <span className="font-medium">💡 Tip: Click on your avatar to upload quickly!</span>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="avatar-url">Avatar URL</Label>
                <Input
                  id="avatar-url"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  disabled={isUploading}
                />
                <p className="text-xs text-muted-foreground">Enter a direct link to your avatar image</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
