import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { startRobotPolling } from '../api/startRobotPolling'
import type { Robot } from '../types/robot'
import type { Site } from '../types/site'

type RobotSnapshot = { siteId: string; robots: readonly Robot[] }
const emptyRobots: readonly Robot[] = []

function subscribeToVisibility(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}

function isPageVisible() {
  return document.visibilityState === 'visible'
}

export function useRobotUpdates(site: Site | null) {
  const [snapshot, setSnapshot] = useState<RobotSnapshot | null>(null)
  const [errorSiteId, setErrorSiteId] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [requestId, setRequestId] = useState(0)
  const latestSiteId = useRef<string | null>(null)
  const isVisible = useSyncExternalStore(subscribeToVisibility, isPageVisible)

  useEffect(() => {
    if (!site || !isVisible || (isPaused && latestSiteId.current === site.id)) return

    return startRobotPolling({
      site,
      repeat: !isPaused,
      onUpdate: (robots) => {
        latestSiteId.current = site.id
        setSnapshot({ siteId: site.id, robots })
        setErrorSiteId(null)
      },
      onError: () => setErrorSiteId(site.id),
    })
  }, [site, isPaused, isVisible, requestId])

  const hasSnapshot = site !== null && snapshot?.siteId === site.id
  const hasError = site !== null && errorSiteId === site.id

  function togglePause() {
    setIsPaused((paused) => !paused)
  }

  function retry() {
    setIsPaused(false)
    setRequestId((id) => id + 1)
  }

  return {
    robots: hasSnapshot ? snapshot.robots : emptyRobots,
    hasSnapshot,
    hasError,
    isLoading: site !== null && !hasSnapshot && !hasError,
    isPaused,
    isVisible,
    togglePause,
    retry,
  }
}
