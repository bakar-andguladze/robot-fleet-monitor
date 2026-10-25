import type { FleetData } from '../data/fleetSchema.js'

type Robot = FleetData['robots'][number]
type Position = Robot['position']

export type RobotRoute = {
  siteId: string
  speed: number
  waypoints: readonly [Position, Position, ...Position[]]
}

type Segment = { start: Position; end: Position; length: number }
type PreparedRoute = { speed: number; segments: Segment[]; length: number }

// Accelerated demo rates, in battery percentage points per second.
const movementDrainPerSecond = 0.5
const chargingGainPerSecond = 1

export function createRobotSimulator(
  fleet: FleetData,
  routes: Readonly<Record<string, RobotRoute>>,
) {
  const initialRobots = structuredClone(fleet.robots)
  const sites = new Map(fleet.sites.map((site) => [site.id, site]))
  const preparedRoutes = new Map<string, PreparedRoute>()

  for (const robot of initialRobots) {
    if (robot.status !== 'moving') continue

    const route = routes[robot.id]
    const site = sites.get(robot.siteId)
    if (!route || !site || route.siteId !== robot.siteId) {
      throw new Error('Missing or mismatched simulation route for ' + robot.id)
    }
    if (!Number.isFinite(route.speed) || route.speed <= 0) {
      throw new Error('Simulation speed must be positive and finite for ' + robot.id)
    }

    const segments: Segment[] = []
    let start = robot.position
    // Join the configured route from the seed position and close the loop there.
    for (const end of [...route.waypoints, robot.position]) {
      if (!Number.isFinite(end.x) || !Number.isFinite(end.y)
        || end.x < 0 || end.y < 0 || end.x > site.width || end.y > site.height) {
        throw new Error('Simulation route leaves its warehouse for ' + robot.id)
      }
      const length = Math.hypot(end.x - start.x, end.y - start.y)
      if (length > 0) segments.push({ start, end, length })
      start = end
    }
    const length = segments.reduce((total, segment) => total + segment.length, 0)
    if (!Number.isFinite(length) || length === 0) {
      throw new Error('Simulation route must have a finite, non-zero length for ' + robot.id)
    }
    preparedRoutes.set(robot.id, { speed: route.speed, segments, length })
  }

  return function simulate(elapsedSeconds: number): Robot[] {
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
      throw new Error('Simulation time must be non-negative and finite')
    }

    return initialRobots.map((robot) => {
      if (robot.status === 'charging') {
        const batteryPercent = Math.min(100, robot.batteryPercent + elapsedSeconds * chargingGainPerSecond)
        return { ...robot, batteryPercent, status: batteryPercent === 100 ? 'idle' : 'charging' }
      }

      const route = preparedRoutes.get(robot.id)
      if (!route) return robot

      const batteryPercent = Math.max(0, robot.batteryPercent - elapsedSeconds * movementDrainPerSecond)
      // Stop at the depletion instant even if a timer skips past it.
      const movingSeconds = Math.min(elapsedSeconds, robot.batteryPercent / movementDrainPerSecond)
      let position = robot.position
      let remainingDistance = ((movingSeconds % (route.length / route.speed)) * route.speed) % route.length
      for (const segment of route.segments) {
        if (remainingDistance <= segment.length) {
          const progress = remainingDistance / segment.length
          position = {
            x: segment.start.x + (segment.end.x - segment.start.x) * progress,
            y: segment.start.y + (segment.end.y - segment.start.y) * progress,
          }
          break
        }
        remainingDistance -= segment.length
      }
      return { ...robot, batteryPercent, status: batteryPercent === 0 ? 'error' : 'moving', position }
    })
  }
}
