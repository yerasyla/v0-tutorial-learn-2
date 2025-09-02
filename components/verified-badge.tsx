import { SealCheck } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

interface VerifiedBadgeProps {
  isVerified: boolean
  size?: "sm" | "md" | "lg"
  className?: string
  variant?: "default" | "card" | "overlay"
}

export function VerifiedBadge({ isVerified, size = "md", className, variant = "default" }: VerifiedBadgeProps) {
  if (!isVerified) return null

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  }

  const containerSizes = {
    sm: "h-6 w-6",
    md: "h-7 w-7",
    lg: "h-8 w-8",
  }

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  }

  if (variant === "card" || variant === "overlay") {
    return (
      <div
        className={cn(
          "rounded-full bg-white flex items-center justify-center flex-shrink-0",
          variant === "card" ? "shadow-lg border border-gray-100" : "shadow-md",
          containerSizes[size],
          className,
        )}
      >
        <SealCheck weight="fill" size={iconSizes[size]} className="text-blue-500" />
      </div>
    )
  }

  return (
    <SealCheck weight="fill" className={cn("text-blue-500 inline-block flex-shrink-0", sizeClasses[size], className)} />
  )
}
