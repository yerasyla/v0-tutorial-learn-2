import { cn } from "@/lib/utils"

const CheckCircleIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22,4 12,14.01 9,11.01" />
  </svg>
)

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
        <CheckCircleIcon size={iconSizes[size]} />
      </div>
    )
  }

  return <CheckCircleIcon size={iconSizes[size]} />
}
