import { useEffect, useState } from 'react'
import { mockRobots } from '../data/mockRobots'
import { mockRoutes } from '../data/mockRoutes'
import { simulateRobots } from '../simulation/simulateRobots'

export function useRobotSimulation() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (isPaused) return

    let previousTime = performance.now()
    const intervalId = window.setInterval(() => {
      const currentTime = performance.now()
      const deltaSeconds = (currentTime - previousTime) / 1000
      previousTime = currentTime
      setElapsedSeconds((elapsed) => elapsed + deltaSeconds)
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [isPaused])

  function togglePause() {
    setIsPaused((paused) => !paused)
  }

  return {
    robots: simulateRobots(mockRobots, mockRoutes, elapsedSeconds),
    isPaused,
    togglePause,
  }
}
