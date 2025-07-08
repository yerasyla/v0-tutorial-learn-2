"use client"

import { memo, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { VerifiedBadge } from "@/components/verified-badge"
import { LazyImage } from "@/components/lazy-image"
import { Play, BookOpen } from "@phosphor-icons/react"

interface CourseWithCreatorProfile {
  id: string
  title: string
  description: string | null
  creator_wallet: string
  created_at: string
  lessons: Array<{
    id: string
    youtube_url: string
    order_index: number
  }>
  creator_profile?: {
    display_name: string | null
    avatar_url: string | null
    is_verified: boolean
  } | null
}

interface OptimizedCourseCardProps {
  course: CourseWithCreatorProfile
}

export const OptimizedCourseCard = memo(({ course }: OptimizedCourseCardProps) => {
  const getFirstVideoThumbnail = useCallback((lessons: any[]) => {
    if (lessons.length === 0) return "/placeholder.svg?height=180&width=320"

    const firstLesson = lessons.sort((a, b) => a.order_index - b.order_index)[0]
    const match = firstLesson.youtube_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    const videoId = match ? match[1] : null

    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : "/placeholder.svg?height=180&width=320"
  }, [])

  const getCreatorDisplayName = useCallback(() => {
    if (course.creator_profile?.display_name) {
      return course.creator_profile.display_name
    }
    return `${course.creator_wallet.slice(0, 6)}...${course.creator_wallet.slice(-4)}`
  }, [course.creator_profile?.display_name, course.creator_wallet])

  const getCreatorAvatarFallback = useCallback(() => {
    if (course.creator_profile?.display_name) {
      return course.creator_profile.display_name.charAt(0).toUpperCase()
    }
    return course.creator_wallet.charAt(2).toUpperCase()
  }, [course.creator_profile?.display_name, course.creator_wallet])

  const thumbnailUrl = getFirstVideoThumbnail(course.lessons)

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border border-border hover:border-brand-primary group bg-card h-full">
      <div className="aspect-video relative overflow-hidden">
        <LazyImage
          src={thumbnailUrl}
          alt={course.title}
          className="w-full h-full group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Play size={40} className="text-white" weight="fill" />
        </div>
        {course.creator_profile?.is_verified && (
          <div className="absolute top-2 left-2">
            <VerifiedBadge isVerified={true} size="sm" variant="overlay" />
          </div>
        )}
      </div>

      <CardHeader className="p-4 pb-2">
        <h3 className="line-clamp-2 text-base font-semibold leading-tight mb-2 text-card-foreground group-hover:text-brand-primary transition-colors">
          {course.title}
        </h3>
        {course.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground leading-relaxed mb-3">{course.description}</p>
        )}
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <div className="flex items-center justify-between mb-3">
          <Link
            href={`/creator/${course.creator_wallet}`}
            className="flex items-center hover:text-brand-primary transition-colors group/creator flex-1 min-w-0"
          >
            <Avatar className="h-5 w-5 mr-2 flex-shrink-0">
              <AvatarImage src={course.creator_profile?.avatar_url || "/placeholder.svg"} alt="Creator" />
              <AvatarFallback className="text-xs bg-muted font-medium text-muted-foreground">
                {getCreatorAvatarFallback()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium truncate group-hover/creator:underline">
              {getCreatorDisplayName()}
            </span>
            {course.creator_profile?.is_verified && (
              <VerifiedBadge isVerified={true} size="sm" className="ml-1 flex-shrink-0" />
            )}
          </Link>
          <div className="flex items-center text-xs text-muted-foreground ml-2">
            <BookOpen size={12} className="mr-1" />
            <span>
              {course.lessons.length} lesson{course.lessons.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <Link href={`/courses/${course.id}`}>
          <Button className="w-full h-9 text-sm font-semibold bg-brand-primary hover:bg-brand-secondary text-primary-foreground">
            <Play size={14} className="mr-2" weight="fill" />
            Start Course
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
})

OptimizedCourseCard.displayName = "OptimizedCourseCard"
