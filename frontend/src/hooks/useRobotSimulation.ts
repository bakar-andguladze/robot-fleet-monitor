import { useEffect, useMemo, useState } from 'react'
import type { Robot } from '../types/robot'
import { mockRoutes } from '../data/mockRoutes'
import { simulateRobots } from '../simulation/simulateRobots'
import type { RobotRoute } from '../simulation/simulateRobots'

export function useRobotSimulation(initialRobots: readonly Robot[]) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const routes = useMemo(() => {
    const routes: Record<string, RobotRoute> = {}
    for (const robot of initialRobots) {
      const route = mockRoutes[robot.id]
      if (route) {
        routes[robot.id] = { ...route, waypoints: [robot.position, ...route.waypoints] }
      }
    }
    return routes
  }, [initialRobots])

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
    robots: simulateRobots(initialRobots, routes, elapsedSeconds),
    isPaused,
    togglePause,
  }
}
