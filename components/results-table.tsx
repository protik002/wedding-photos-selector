"use client"

import { useState } from "react"
import { PhotoViewer } from "@/components/photo-viewer"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowUpDown, Camera } from "lucide-react"
import { cn } from "@/lib/utils"

interface PhotoResult {
  id: string
  filename: string
  score: number
  totalVotes: number
  keeps: number
}

type SortMode = "score-desc" | "score-asc" | "name-asc" | "votes-desc" | "keep-pct"

export function ResultsTable({ results }: { results: PhotoResult[] }) {
  const [sortMode, setSortMode] = useState<SortMode>("score-desc")
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null)
  const [previewAlt, setPreviewAlt] = useState("")

  const sorted = [...results].sort((a, b) => {
    switch (sortMode) {
      case "score-desc":
        return b.score - a.score
      case "score-asc":
        return a.score - b.score
      case "name-asc":
        return a.filename.localeCompare(b.filename)
      case "votes-desc":
        return b.totalVotes - a.totalVotes
      case "keep-pct": {
        const pctA = a.totalVotes > 0 ? a.keeps / a.totalVotes : 0
        const pctB = b.totalVotes > 0 ? b.keeps / b.totalVotes : 0
        return pctB - pctA
      }
      default:
        return 0
    }
  })

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Camera className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No votes yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Start swiping to see results here
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Sort controls */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm text-muted-foreground">
          {results.length} photo{results.length !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <Select
            value={sortMode}
            onValueChange={(val) => setSortMode(val as SortMode)}
          >
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score-desc">Highest Score</SelectItem>
              <SelectItem value="score-asc">Lowest Score</SelectItem>
              <SelectItem value="keep-pct">Keep %</SelectItem>
              <SelectItem value="votes-desc">Most Votes</SelectItem>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results grid */}
      <div className="grid grid-cols-1 gap-2 px-4 pb-6">
        {sorted.map((photo, index) => {
          const keepPct =
            photo.totalVotes > 0
              ? Math.round((photo.keeps / photo.totalVotes) * 100)
              : 0
          const thumbUrl = `https://drive.google.com/thumbnail?id=${photo.id}&sz=w120`

          return (
            <button
              key={photo.id}
              className="flex items-center gap-3 rounded-xl bg-card border border-border/50 p-3 text-left hover:bg-secondary/50 transition-colors"
              onClick={() => {
                setPreviewPhoto(
                  `https://drive.google.com/thumbnail?id=${photo.id}&sz=w800`
                )
                setPreviewAlt(photo.filename)
              }}
            >
              {/* Rank */}
              <span className="text-xs font-medium text-muted-foreground w-5 text-center shrink-0">
                {index + 1}
              </span>

              {/* Thumbnail */}
              <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted shrink-0">
                <img
                  src={thumbUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  crossOrigin="anonymous"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {photo.filename}
                </p>
                <p className="text-xs text-muted-foreground">
                  {photo.totalVotes} vote{photo.totalVotes !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Score + Keep % */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-end">
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      photo.score > 0 && "text-keep",
                      photo.score < 0 && "text-reject",
                      photo.score === 0 && "text-muted-foreground"
                    )}
                  >
                    {photo.score > 0 ? "+" : ""}
                    {photo.score}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {keepPct}% kept
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <PhotoViewer
        src={previewPhoto}
        alt={previewAlt}
        onClose={() => setPreviewPhoto(null)}
      />
    </div>
  )
}
