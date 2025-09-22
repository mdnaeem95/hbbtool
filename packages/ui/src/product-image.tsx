import Image from "next/image"
import { cn } from "@homejiak/ui"

interface ProductImageProps {
  src: string
  alt: string
  className?: string
  priority?: boolean
  fill?: boolean
  sizes?: string
}

export function ProductImage({
  src,
  alt,
  className,
  priority = false,
  fill = false,
  sizes
}: ProductImageProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-muted", className)}>
      <Image
        src={src}
        alt={alt}
        fill={fill}
        sizes={sizes}
        priority={priority}
        className="object-cover transition-transform duration-300 hover:scale-105"
      />
    </div>
  )
}