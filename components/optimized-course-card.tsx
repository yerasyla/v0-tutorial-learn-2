"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, Clock, User } from "@phosphor-icons/react"
import { VerifiedBadge } from "@/components/verified-badge"
import type { Course, Lesson } from "@/lib/supabase"

type CourseWithLessons = Course & {
  lessons: Lesson[]
  user_profiles?: {
    display_name: string | null
    is_verified: boolean
  }
}

interface OptimizedCourseCardProps {
  course: CourseWithLessons
}

export function OptimizedCourseCard({ course }: OptimizedCourseCardProps) {
  const getFirstVideoThumbnail = (lessons: Lesson[]) => {
    if (lessons.length === 0) return "/placeholder.svg?height=160&width=280"

    const firstLesson = lessons[0]

    // Match regular YouTube videos
    let match = firstLesson.youtube_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
    }

    // Match YouTube Shorts
    match = firstLesson.youtube_url.match(/youtube\.com\/shorts\/([^&\n?#]+)/)
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
    }

    return "/placeholder.svg?height=160&width=280"
  }

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getCreatorDisplayName = (course: CourseWithLessons) => {
    return course.user_profiles?.display_name || formatWalletAddress(course.creator_wallet)
  }

  const thumbnailUrl = getFirstVideoThumbnail(course.lessons)
  const creatorName = getCreatorDisplayName(course)
  const isVerified = course.user_profiles?.is_verified || false

  return (
    <Card className="overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-all duration-200 group h-full">
      <div className="aspect-video relative overflow-hidden">
        <img
          src={thumbnailUrl || "/placeholder.svg"}
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = "/placeholder.svg?height=160&width=280"
          }}
        />
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-white/90 text-gray-900 font-medium text-xs px-2 py-1">
            {course.lessons.length} lesson{course.lessons.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="line-clamp-2 text-sm font-semibold leading-tight mb-2 text-card-foreground">
          {course.title}
        </CardTitle>
        <CardDescription className="line-clamp-2 text-xs leading-relaxed text-muted-foreground mb-2">
          {course.description}
        </CardDescription>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User size={12} />
          <span className="flex items-center gap-1">
            {creatorName}
            {isVerified && <VerifiedBadge size="sm" />}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>{new Date(course.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <Link href={`/courses/${course.id}`}>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs border border-border bg-transparent hover:bg-accent"
          >
            <Eye size={12} className="mr-1" />
            View Course
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
