"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, ExternalLink, Smartphone, Monitor, Tablet } from "lucide-react"

interface FaviconTest {
  name: string
  path: string
  size: string
  purpose: string
  loaded: boolean
}

export default function FaviconTestPage() {
  const [faviconTests, setFaviconTests] = useState<FaviconTest[]>([
    { name: "Main Favicon", path: "/favicon.ico", size: "32x32", purpose: "Browser tabs, bookmarks", loaded: false },
    { name: "Small PNG", path: "/favicon-16x16.png", size: "16x16", purpose: "Small browser tabs", loaded: false },
    { name: "Standard PNG", path: "/favicon-32x32.png", size: "32x32", purpose: "Desktop browsers", loaded: false },
    {
      name: "Apple Touch Icon",
      path: "/apple-touch-icon.png",
      size: "180x180",
      purpose: "iOS home screen",
      loaded: false,
    },
    {
      name: "Android Chrome Small",
      path: "/android-chrome-192x192.png",
      size: "192x192",
      purpose: "Android devices",
      loaded: false,
    },
    {
      name: "Android Chrome Large",
      path: "/android-chrome-512x512.png",
      size: "512x512",
      purpose: "PWA installation",
      loaded: false,
    },
  ])

  const [manifestLoaded, setManifestLoaded] = useState(false)

  useEffect(() => {
    // Test favicon loading
    const testFavicons = async () => {
      const updatedTests = await Promise.all(
        faviconTests.map(async (test) => {
          try {
            const response = await fetch(test.path, { method: "HEAD" })
            return { ...test, loaded: response.ok }
          } catch {
            return { ...test, loaded: false }
          }
        }),
      )
      setFaviconTests(updatedTests)
    }

    // Test manifest loading
    const testManifest = async () => {
      try {
        const response = await fetch("/site.webmanifest", { method: "HEAD" })
        setManifestLoaded(response.ok)
      } catch {
        setManifestLoaded(false)
      }
    }

    testFavicons()
    testManifest()
  }, [])

  const openInNewTab = (url: string) => {
    window.open(url, "_blank")
  }

  const allFaviconsLoaded = faviconTests.every((test) => test.loaded)

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Favicon Test & Verification</h1>
        <p className="text-muted-foreground">
          Verify that all favicon files are properly loaded and configured across different browsers and devices.
        </p>
      </div>

      {/* Overall Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {allFaviconsLoaded && manifestLoaded ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            Overall Favicon Status
          </CardTitle>
          <CardDescription>
            {allFaviconsLoaded && manifestLoaded
              ? "All favicon files are properly loaded and accessible"
              : "Some favicon files may be missing or inaccessible"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Badge variant={allFaviconsLoaded ? "default" : "destructive"}>
              Favicon Files: {faviconTests.filter((t) => t.loaded).length}/{faviconTests.length}
            </Badge>
            <Badge variant={manifestLoaded ? "default" : "destructive"}>
              Web Manifest: {manifestLoaded ? "Loaded" : "Missing"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Favicon Files Test */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Favicon Files Status</CardTitle>
          <CardDescription>Check if all favicon files are accessible and properly sized</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {faviconTests.map((test, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {test.loaded ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <div>
                    <div className="font-medium">{test.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {test.size} - {test.purpose}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={test.loaded ? "default" : "destructive"} className="text-xs">
                    {test.loaded ? "OK" : "FAIL"}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => openInNewTab(test.path)}>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Visual Preview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Favicon Preview</CardTitle>
          <CardDescription>Visual preview of how the favicon appears in different sizes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <img src="/favicon-16x16.png" alt="16x16 favicon" className="mx-auto mb-2" />
              <div className="text-sm font-medium">16x16 (Browser Tab)</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <img src="/favicon-32x32.png" alt="32x32 favicon" className="mx-auto mb-2" />
              <div className="text-sm font-medium">32x32 (Desktop)</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <img src="/apple-touch-icon.png" alt="180x180 favicon" className="mx-auto mb-2 w-12 h-12" />
              <div className="text-sm font-medium">180x180 (iOS)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Testing Guide */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Manual Testing Guide</CardTitle>
          <CardDescription>Step-by-step instructions to verify favicon across different platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Desktop Testing */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Monitor className="h-5 w-5" />
                <h3 className="font-semibold">Desktop Browsers</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-20">Chrome:</span>
                  <span>Check browser tab, bookmark bar, and new tab page</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-20">Firefox:</span>
                  <span>Verify tab icon and bookmark favicon display</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-20">Safari:</span>
                  <span>Test tab icon and bookmark appearance</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-20">Edge:</span>
                  <span>Check tab, favorites, and start page tiles</span>
                </div>
              </div>
            </div>

            {/* Mobile Testing */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="h-5 w-5" />
                <h3 className="font-semibold">Mobile Devices</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-20">iOS Safari:</span>
                  <span>Add to home screen and check icon quality</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-20">Android:</span>
                  <span>Test Chrome mobile and PWA installation</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-20">PWA:</span>
                  <span>Install as app and verify icon in app drawer</span>
                </div>
              </div>
            </div>

            {/* Tablet Testing */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Tablet className="h-5 w-5" />
                <h3 className="font-semibold">Tablet Devices</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-20">iPad:</span>
                  <span>Test Safari tabs and home screen bookmark</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-20">Android:</span>
                  <span>Verify Chrome tabs and app installation</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Test Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Test Actions</CardTitle>
          <CardDescription>Perform these actions to quickly verify favicon functionality</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <Button variant="outline" onClick={() => openInNewTab(window.location.origin)} className="justify-start">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: "Tutorial Platform",
                    url: window.location.origin,
                  })
                } else {
                  navigator.clipboard.writeText(window.location.origin)
                }
              }}
              className="justify-start"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Test Share/Copy URL
            </Button>
            <Button variant="outline" onClick={() => openInNewTab("/site.webmanifest")} className="justify-start">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Web Manifest
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const link = document.createElement("a")
                link.href = window.location.origin
                link.download = "bookmark.url"
                link.click()
              }}
              className="justify-start"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Create Bookmark File
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
