"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { Upload, X, Camera, LinkIcon } from "lucide-react"
import { validateImageFile, resizeImage } from "@/lib/image-utils"
import { uploadAvatarToSupabase } from "@/lib/supabase-storage"

interface AvatarUploadProps {
  currentAvatar?: string
  displayName?: string
  walletAddress: string
  onAvatarChange: (avatarUrl: string) => void
  disabled?: boolean
}

export function AvatarUpload({
  currentAvatar,
  displayName,
  walletAddress,
  onAvatarChange,
  disabled = false,
}: AvatarUploadProps) {
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
        description: "Your avatar has been updated.",
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
    fileInputRef.current?.click()
  }

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <div className="space-y-4">
      {/* Avatar Preview */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <Avatar className="w-24 h-24">
            <AvatarImage src={previewUrl || "/placeholder.svg"} alt="Profile avatar" />
            <AvatarFallback className="text-2xl">
              {displayName?.charAt(0)?.toUpperCase() || formatWalletAddress(walletAddress).charAt(0)}
            </AvatarFallback>
          </Avatar>

          {previewUrl && !disabled && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
              onClick={handleRemoveAvatar}
              disabled={isUploading}
            >
              <X className="h-3 w-3" />
            </Button>
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          )}
        </div>

        {!disabled && (
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
      {!disabled && (
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

                  <p className="text-xs text-gray-500 mt-2">
                    Supports JPEG, PNG, GIF, WebP. Max size: 2MB
                    <br />
                    Images will be automatically resized and optimized.
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
                <p className="text-xs text-gray-500">Enter a direct link to your avatar image</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
