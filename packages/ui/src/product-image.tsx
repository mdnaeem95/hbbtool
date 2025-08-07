'use client'

import * as React from "react"
import { cn } from "./lib/utils"
import { Skeleton } from "./skeleton"

interface ProductImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string
  aspectRatio?: "square" | "food" | "portrait"
}

const aspectRatios = {
  square: "aspect-square",
  food: "aspect-[4/3]",
  portrait: "aspect-[3/4]",
}

export function ProductImage({
  src,
  alt,
  className,
  fallback = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop",
  aspectRatio = "food",
  ...props
}: ProductImageProps) {
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasError, setHasError] = React.useState(false)
  const [imageSrc, setImageSrc] = React.useState(src)

  React.useEffect(() => {
    setImageSrc(src)
    setHasError(false)
  }, [src])

  const handleLoad = () => {
    setIsLoading(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
    if (fallback && imageSrc !== fallback) {
      setImageSrc(fallback)
    }
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted",
        aspectRatios[aspectRatio],
        className
      )}
    >
      {isLoading && (
        <Skeleton className="absolute inset-0" />
      )}
      <img
        src={imageSrc}
        alt={alt}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100"
        )}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
      {hasError && imageSrc === fallback && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Image unavailable</p>
        </div>
      )}
    </div>
  )
}