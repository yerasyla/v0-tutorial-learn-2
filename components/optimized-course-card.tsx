"use client"

import Link from "next/link"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { VerifiedBadge } from "@/components/verified-badge"
import type { Course, Lesson } from "@/lib/supabase"

type CourseWithLessons = Course & {
  lessons: Lesson[]
  user_profiles?: Array<{
    display_name: string | null
    is_verified: boolean
  }>
}

interface OptimizedCourseCardProps {
  course: CourseWithLessons
}

export function OptimizedCourseCard({ course }: OptimizedCourseCardProps) {
  const getFirstVideoThumbnail = (lessons: Lesson[]) => {
    if (!lessons || lessons.length === 0) return "/placeholder.svg?height=160&width=280"

    const firstLesson = lessons[0]

    if (!firstLesson.youtube_url) return "/placeholder.svg?height=160&width=280"

    let match = firstLesson.youtube_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
    }

    match = firstLesson.youtube_url.match(/youtube\.com\/shorts\/([^&\n?#]+)/)
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
    }

    return "/placeholder.svg?height=160&width=280"
  }

  const getCreatorDisplayName = () => {
    if (course.user_profiles && course.user_profiles.length > 0) {
      return (
        course.user_profiles[0].display_name ||
        (course.creator_wallet
          ? `${course.creator_wallet.slice(0, 6)}...${course.creator_wallet.slice(-4)}`
          : "Unknown Creator")
      )
    }
    return course.creator_wallet
      ? `${course.creator_wallet.slice(0, 6)}...${course.creator_wallet.slice(-4)}`
      : "Unknown Creator"
  }

  const isCreatorVerified = () => {
    return course.user_profiles && course.user_profiles.length > 0 && course.user_profiles[0].is_verified
  }

  const thumbnailUrl = getFirstVideoThumbnail(course.lessons)
  const creatorName = getCreatorDisplayName()
  const isVerified = isCreatorVerified()

  return (
    <Link href={`/courses/${course.id}`}>
      <Card className="overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-all duration-200 group h-full cursor-pointer">
        <div className="aspect-video relative overflow-hidden">
          <img
            src={thumbnailUrl || "/placeholder.svg"}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-white/90 text-gray-900 font-medium text-xs px-2 py-1">
              {course.lessons?.length || 0} lesson{(course.lessons?.length || 0) !== 1 ? "s" : ""}
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
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
            <span>by {creatorName}</span>
            {isVerified && <VerifiedBadge size="sm" />}
          </div>
        </CardHeader>
      </Card>
    </Link>
  )
}
