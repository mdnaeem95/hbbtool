import { useEffect, useRef } from 'react'

interface UseIntersectionObserverOptions {
  threshold?: number | number[]
  root?: Element | Document | null
  rootMargin?: string
  onIntersect?: () => void
  enabled?: boolean
}

export function useIntersectionObserver({
  threshold = 0,
  root = null,
  rootMargin = '0px',
  onIntersect,
  enabled = true,
}: UseIntersectionObserverOptions = {}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled || !ref.current || !onIntersect) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onIntersect()
          }
        })
      },
      {
        threshold,
        root,
        rootMargin,
      }
    )

    observer.observe(ref.current)

    return () => {
      observer.disconnect()
    }
  }, [enabled, onIntersect, root, rootMargin, threshold])

  return { ref }
}