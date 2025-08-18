// apps/web/src/hooks/use-media-query.ts
import { useEffect, useState } from "react"

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    
    // Set initial value
    setMatches(media.matches)

    // Create event listener
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Add listener
    if (media.addListener) {
      media.addListener(listener)
    } else {
      media.addEventListener("change", listener)
    }

    // Remove listener on cleanup
    return () => {
      if (media.removeListener) {
        media.removeListener(listener)
      } else {
        media.removeEventListener("change", listener)
      }
    }
  }, [query])

  return matches
}