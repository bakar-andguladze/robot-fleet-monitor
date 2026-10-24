import type { Robot } from '../types/robot'

type Position = Robot['position']

export type RobotRoute = {
  speed: number
  waypoints: readonly [Position, Position, ...Position[]]
}

export function simulateRobots(
  robots: readonly Robot[],
  routes: Readonly<Record<string, RobotRoute>>,
  elapsedSeconds: number,
): Robot[] {
  return robots.map((robot) => {
    const route = routes[robot.id]
    if (robot.status !== 'moving' || !route || route.speed <= 0) {
      return robot
    }

    const segments = route.waypoints.map((start, index) => {
      const end = route.waypoints[(index + 1) % route.waypoints.length]
      return { start, end, length: Math.hypot(end.x - start.x, end.y - start.y) }
    })
    const routeLength = segments.reduce((total, segment) => total + segment.length, 0)
    if (routeLength === 0) {
      return robot
    }

    let remainingDistance = (Math.max(0, elapsedSeconds) * route.speed) % routeLength
    for (const segment of segments) {
      if (segment.length === 0) continue
      if (remainingDistance <= segment.length) {
        const progress = remainingDistance / segment.length
        return {
          ...robot,
          position: {
            x: segment.start.x + (segment.end.x - segment.start.x) * progress,
            y: segment.start.y + (segment.end.y - segment.start.y) * progress,
          },
        }
      }
      remainingDistance -= segment.length
    }

    return robot
  })
}
