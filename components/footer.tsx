"use client"

import Image from "next/image"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { Twitter, Linkedin, Globe } from "lucide-react"

export default function Footer() {
  return (
    <footer className="bg-card text-card-foreground border-t border-border">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Brand Section */}
          <div className="space-y-3 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center space-x-2">
              <Logo size="md" showText={false} variant="circular" />
              <Image
                src="/images/vector-footer-text.svg"
                alt="Tutorial"
                width={80}
                height={14}
                className="h-3 sm:h-4 object-contain"
                priority
              />
            </div>
            <p className="text-xs text-muted-foreground max-w-sm">
              Tutorial is building the future of education | Expanding access to learning & space adoption
            </p>
            <div className="flex items-center space-x-3">
              <Link
                href="https://x.com/tutorialtoken"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label="Twitter"
              >
                <Twitter size={16} />
              </Link>
              <Link
                href="http://linkedin.com/company/tutorialtoken"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label="LinkedIn"
              >
                <Linkedin size={16} />
              </Link>
              <Link
                href="https://tutorialtoken.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label="Website"
              >
                <Globe size={16} />
              </Link>
            </div>
          </div>

          {/* Products Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Products</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors block py-0.5"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/courses"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors block py-0.5"
                >
                  Courses
                </Link>
              </li>
            </ul>
          </div>

          {/* Community Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Community</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="https://t.me/tut_portal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors block py-0.5"
                >
                  Telegram
                </Link>
              </li>
              <li>
                <Link
                  href="https://discord.com/invite/CdkuHwEJne"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors block py-0.5"
                >
                  Discord
                </Link>
              </li>
              <li>
                <Link
                  href="/referral"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors block py-0.5"
                >
                  Become verified creator
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-6 sm:mt-12 sm:pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">© Tutorial Learn</p>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">Powered By</span>
            <Logo size="sm" showText={false} variant="rounded-square" />
            <span className="text-xs font-medium text-foreground">Tutorial</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
