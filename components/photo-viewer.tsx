"use client"

import { X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface PhotoViewerProps {
  src: string | null
  alt: string
  onClose: () => void
}

export function PhotoViewer({ src, alt, onClose }: PhotoViewerProps) {
  return (
    <AnimatePresence>
      {src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 p-4"
          onClick={onClose}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 rounded-full bg-card/90 p-2 text-card-foreground shadow-md hover:bg-card"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
          <motion.img
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            src={src}
            alt={alt}
            className="max-h-[90dvh] max-w-[95vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
