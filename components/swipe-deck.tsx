"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { SwipeCard } from "@/components/swipe-card"
import { PhotoViewer } from "@/components/photo-viewer"
import { Button } from "@/components/ui/button"
import { X, Heart, Undo2, Camera } from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"

interface Photo {
  id: string
  name: string
  thumbnailUrl: string
  fullUrl: string
}

interface VoteHistoryEntry {
  photoFilename: string
  direction: 1 | -1
}

export function SwipeDeck() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [votedFilenames, setVotedFilenames] = useState<Set<string>>(new Set())
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [voteHistory, setVoteHistory] = useState<VoteHistoryEntry[]>([])
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null)
  const [previewAlt, setPreviewAlt] = useState("")
  const [loadingMore, setLoadingMore] = useState(false)
  const nextPageTokenRef = useRef<string | null>(null)
  const allLoadedRef = useRef(false)

  // Load user's existing votes
  useEffect(() => {
    async function loadVotes() {
      try {
        const res = await authFetch("/api/votes")
        if (res.ok) {
          const data = await res.json()
          setVotedFilenames(new Set(data.votedPhotoFilenames || []))
        }
      } catch {
        // Continue without previous votes
      }
    }
    loadVotes()
  }, [])

  // Load photos from Google Drive (paginated)
  const loadPhotos = useCallback(async (pageToken?: string) => {
    try {
      const url = pageToken
        ? `/api/photos?pageToken=${pageToken}`
        : "/api/photos"
      const res = await authFetch(url)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to load photos")
      }
      const data = await res.json()

      // Shuffle new batch
      const shuffled = (data.photos || []).sort(() => Math.random() - 0.5)

      setPhotos((prev) => [...prev, ...shuffled])
      nextPageTokenRef.current = data.nextPageToken
      if (!data.nextPageToken) {
        allLoadedRef.current = true
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load photos")
    }
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await loadPhotos()
      setLoading(false)
    }
    init()
  }, [loadPhotos])

  // Preload next images
  useEffect(() => {
    const unvoted = getUnvotedPhotos()
    const toPreload = unvoted.slice(0, 4)
    toPreload.forEach((photo) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.src = photo.thumbnailUrl
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, photos.length, votedFilenames.size])

  // Load more photos when running low
  useEffect(() => {
    const unvoted = getUnvotedPhotos()
    if (
      unvoted.length < 10 &&
      nextPageTokenRef.current &&
      !allLoadedRef.current &&
      !loadingMore
    ) {
      setLoadingMore(true)
      loadPhotos(nextPageTokenRef.current).finally(() => setLoadingMore(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, votedFilenames.size])

  function getUnvotedPhotos() {
    return photos.filter((p, i) => i >= currentIndex && !votedFilenames.has(p.name))
  }

  // Find the next unvoted index from the current position
  function findNextUnvotedIndex(fromIndex: number): number {
    let idx = fromIndex
    while (idx < photos.length && votedFilenames.has(photos[idx].name)) {
      idx++
    }
    return idx
  }

  async function handleSwipe(direction: 1 | -1) {
    const unvoted = getUnvotedPhotos()
    if (unvoted.length === 0) return

    const photo = unvoted[0]

    // Optimistic update
    setVotedFilenames((prev) => new Set(prev).add(photo.name))
    setVoteHistory((prev) => [...prev, { photoFilename: photo.name, direction }])
    setCurrentIndex((prev) => findNextUnvotedIndex(prev))

    // Submit to server
    try {
      await authFetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoFilename: photo.name,
          direction,
        }),
      })
    } catch {
      // Revert on error
      setVotedFilenames((prev) => {
        const next = new Set(prev)
        next.delete(photo.name)
        return next
      })
      setVoteHistory((prev) => prev.slice(0, -1))
    }
  }

  async function handleUndo() {
    if (voteHistory.length === 0) return
    const last = voteHistory[voteHistory.length - 1]

    setVoteHistory((prev) => prev.slice(0, -1))
    setVotedFilenames((prev) => {
      const next = new Set(prev)
      next.delete(last.photoFilename)
      return next
    })

    // Find the index of this photo and go back
    const idx = photos.findIndex((p) => p.name === last.photoFilename)
    if (idx >= 0 && idx < currentIndex) {
      setCurrentIndex(idx)
    }

    try {
      await authFetch("/api/vote", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoFilename: last.photoFilename }),
      })
    } catch {
      // Silent fail on undo
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (previewPhoto) {
        if (e.key === "Escape") setPreviewPhoto(null)
        return
      }
      if (e.key === "ArrowLeft") handleSwipe(-1)
      if (e.key === "ArrowRight") handleSwipe(1)
      if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleUndo()
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voteHistory.length, previewPhoto, photos.length, votedFilenames.size, currentIndex])

  const totalPhotos = photos.length + (allLoadedRef.current ? 0 : 50) // Estimate
  const votedCount = votedFilenames.size
  const progressPct = totalPhotos > 0 ? Math.min((votedCount / totalPhotos) * 100, 100) : 0
  const unvoted = getUnvotedPhotos()
  const isDone = unvoted.length === 0 && allLoadedRef.current && !loading

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading photos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="text-center">
          <Camera className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-reject">{error}</p>
          <p className="text-xs text-muted-foreground mt-1">Check your Google Drive configuration</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center">
      {/* Progress bar */}
      <div className="w-full max-w-sm px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">
            {votedCount} of {allLoadedRef.current ? photos.length : `${photos.length}+`} reviewed
          </span>
          <span className="text-xs text-muted-foreground">
            {Math.round(progressPct)}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gold"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {isDone ? (
        /* Done state */
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="text-center">
            <Heart className="h-12 w-12 text-keep mx-auto mb-4" />
            <h2 className="text-xl font-serif font-semibold text-foreground mb-2">
              {"All done!"}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {"You've reviewed all the photos. Check the results to see favorites!"}
            </p>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/results")}
            >
              View Results
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Card stack */}
          <div className="relative w-full max-w-sm flex-1 min-h-0 px-4 py-2">
            <div className="relative h-full">
              <AnimatePresence>
                {unvoted.slice(0, 3).map((photo, i) => (
                  <SwipeCard
                    key={photo.id}
                    photo={photo}
                    onSwipe={handleSwipe}
                    onTap={() => {
                      setPreviewPhoto(photo.fullUrl)
                      setPreviewAlt(photo.name)
                    }}
                    isTop={i === 0}
                    stackIndex={i}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-4 pb-6 pt-3">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground"
              onClick={handleUndo}
              disabled={voteHistory.length === 0}
              aria-label="Undo last vote"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              className="h-14 w-14 rounded-full bg-reject text-reject-foreground hover:bg-reject/90 shadow-md"
              onClick={() => handleSwipe(-1)}
              aria-label="Reject photo"
            >
              <X className="h-6 w-6" />
            </Button>
            <Button
              size="icon"
              className="h-14 w-14 rounded-full bg-keep text-keep-foreground hover:bg-keep/90 shadow-md"
              onClick={() => handleSwipe(1)}
              aria-label="Keep photo"
            >
              <Heart className="h-6 w-6" />
            </Button>
          </div>
        </>
      )}

      {/* Photo preview modal */}
      <PhotoViewer
        src={previewPhoto}
        alt={previewAlt}
        onClose={() => setPreviewPhoto(null)}
      />
    </div>
  )
}
