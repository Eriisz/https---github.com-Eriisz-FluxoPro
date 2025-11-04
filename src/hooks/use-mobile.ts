"use client"

import * as React from "react"

export function useIsMobile(query = "(max-width: 768px)") {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    setIsMobile(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => setIsMobile(event.matches)
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [query])

  return isMobile
}
