"use client"

import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion"
import { useState } from "react"

interface SwipeCardProps {
  photo: { id: string; name: string; thumbnailUrl: string; fullUrl: string }
  onSwipe: (direction: 1 | -1) => void
  onTap: () => void
  isTop: boolean
  stackIndex: number
}

export function SwipeCard({ photo, onSwipe, onTap, isTop, stackIndex }: SwipeCardProps) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-15, 15])
  const keepOpacity = useTransform(x, [0, 80], [0, 1])
  const rejectOpacity = useTransform(x, [-80, 0], [1, 0])
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const scale = 1 - stackIndex * 0.04
  const yOffset = stackIndex * 8

  function handleDragEnd(_: unknown, info: PanInfo) {
    setIsDragging(false)
    const threshold = 100
    if (info.offset.x > threshold) {
      onSwipe(1)
    } else if (info.offset.x < -threshold) {
      onSwipe(-1)
    }
  }

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        scale,
        y: yOffset,
        zIndex: 10 - stackIndex,
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      animate={
        !isTop
          ? { scale, y: yOffset }
          : undefined
      }
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <div
        className="relative h-full w-full overflow-hidden rounded-2xl bg-card shadow-lg border border-border/50"
        onClick={() => {
          if (!isDragging && isTop) onTap()
        }}
      >
        {/* Photo */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
          </div>
        )}
        <img
          src={photo.thumbnailUrl}
          alt={photo.name}
          className="h-full w-full object-cover"
          crossOrigin="anonymous"
          onLoad={() => setImageLoaded(true)}
          draggable={false}
        />

        {/* Filename label */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/60 to-transparent px-4 py-3">
          <p className="text-sm text-card font-medium truncate">{photo.name}</p>
        </div>

        {/* KEEP overlay */}
        {isTop && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center rounded-2xl border-4 border-keep bg-keep/10"
            style={{ opacity: keepOpacity }}
          >
            <span className="rounded-lg bg-keep px-6 py-2 text-2xl font-bold text-keep-foreground rotate-[-15deg] shadow-lg">
              KEEP
            </span>
          </motion.div>
        )}

        {/* NOPE overlay */}
        {isTop && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center rounded-2xl border-4 border-reject bg-reject/10"
            style={{ opacity: rejectOpacity }}
          >
            <span className="rounded-lg bg-reject px-6 py-2 text-2xl font-bold text-reject-foreground rotate-[15deg] shadow-lg">
              NOPE
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
