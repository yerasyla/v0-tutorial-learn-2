"use client"

import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl"
  showText?: boolean
  className?: string
  href?: string | null
  variant?: "default" | "circular" | "rounded-square"
  textVariant?: "text" | "svg"
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
  xl: "h-12 w-12",
}

const textSizeClasses = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-3xl",
}

const svgTextSizeClasses = {
  sm: "h-4",
  md: "h-5",
  lg: "h-6",
  xl: "h-7",
}

export function Logo({
  size = "md",
  showText = true,
  className,
  href = "/",
  variant = "default",
  textVariant = "text",
}: LogoProps) {
  const getShapeClasses = () => {
    switch (variant) {
      case "circular":
        return "rounded-full p-1 bg-gradient-to-br from-brand-primary to-brand-secondary"
      case "rounded-square":
        return "rounded-lg p-1 bg-gradient-to-br from-brand-primary to-brand-secondary"
      default:
        return ""
    }
  }

  const logoElement = (
    <div className={cn("flex items-center space-x-3", className)}>
      <div className={cn("relative flex-shrink-0", sizeClasses[size], getShapeClasses())}>
        <Image
          src="/images/tutlogo.png"
          alt="Tutorial Platform Logo"
          width={size === "sm" ? 24 : size === "md" ? 32 : size === "lg" ? 40 : 48}
          height={size === "sm" ? 24 : size === "md" ? 32 : size === "lg" ? 40 : 48}
          className={cn("object-contain", variant === "circular" || variant === "rounded-square" ? "rounded-full" : "")}
          priority
        />
      </div>
      {showText && (
        <>
          {textVariant === "svg" ? (
            <Image
              src="/images/vector-footer-text.svg"
              alt="Tutorial"
              width={size === "sm" ? 60 : size === "md" ? 90 : size === "lg" ? 110 : 130}
              height={size === "sm" ? 16 : size === "md" ? 20 : size === "lg" ? 24 : 28}
              className={cn(svgTextSizeClasses[size], "object-contain")}
              priority
            />
          ) : (
            <span className={cn("font-extrabold tracking-tight text-foreground", textSizeClasses[size])}>Tutorial</span>
          )}
        </>
      )}
    </div>
  )

  // Wrap with <Link> unless href is null
  return href === null ? logoElement : <Link href={href}>{logoElement}</Link>
}
