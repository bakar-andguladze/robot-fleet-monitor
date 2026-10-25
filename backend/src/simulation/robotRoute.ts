import type { FleetData } from '../data/fleetSchema.js'

type Robot = FleetData['robots'][number]
type Site = FleetData['sites'][number]
export type Position = Robot['position']
export type RobotRoute = {
  siteId: string
  speed: number
  waypoints: readonly [Position, Position, ...Position[]]
}
type Segment = { start: Position; end: Position; length: number }
export type PreparedRoute = { start: Position; speed: number; segments: Segment[]; length: number; duration: number }

export function prepareRobotRoute(robot: Robot, site: Site | undefined, route: RobotRoute | undefined): PreparedRoute {
  if (!route || !site || route.siteId !== robot.siteId) {
    throw new Error('Missing or mismatched simulation route for ' + robot.id)
  }
  if (!Number.isFinite(route.speed) || route.speed <= 0) {
    throw new Error('Simulation speed must be positive and finite for ' + robot.id)
  }
  for (const point of route.waypoints) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)
      || point.x < 0 || point.y < 0 || point.x > site.width || point.y > site.height) {
      throw new Error('Simulation route leaves its warehouse for ' + robot.id)
    }
  }
  const segments: Segment[] = []
  let start = route.waypoints[0]
  for (const end of [...route.waypoints.slice(1), route.waypoints[0]]) {
    const length = Math.hypot(end.x - start.x, end.y - start.y)
    if (length > 0) segments.push({ start, end, length })
    start = end
  }
  const length = segments.reduce((total, segment) => total + segment.length, 0)
  const duration = length / route.speed
  if (!Number.isFinite(length) || length === 0 || !Number.isFinite(duration) || duration <= 0) {
    throw new Error('Simulation route must have a finite, non-zero length and duration for ' + robot.id)
  }
  return { start: route.waypoints[0], speed: route.speed, segments, length, duration }
}

export function directPath(start: Position, end: Position, speed: number) {
  const duration = Math.hypot(end.x - start.x, end.y - start.y) / speed
  if (!Number.isFinite(duration)) throw new Error('Simulation trip duration must be finite')
  return {
    duration,
    positionAt(seconds: number): Position {
      if (duration === 0) return end
      const progress = Math.min(1, seconds / duration)
      return { x: start.x + (end.x - start.x) * progress, y: start.y + (end.y - start.y) * progress }
    },
  }
}

// Join the first work waypoint, then follow the closed route without teleporting.
export function workPath(route: PreparedRoute, start: Position) {
  const join = directPath(start, route.start, route.speed)
  return (seconds: number): Position => {
    if (seconds < join.duration) return join.positionAt(seconds)
    let distance = (((seconds - join.duration) % route.duration) * route.speed) % route.length
    for (const segment of route.segments) {
      if (distance <= segment.length) {
        const progress = distance / segment.length
        return { x: segment.start.x + (segment.end.x - segment.start.x) * progress,
          y: segment.start.y + (segment.end.y - segment.start.y) * progress }
      }
      distance -= segment.length
    }
    return route.start
  }
}

export function nearestChargingPoint(zones: Site['zones'], position: Position) {
  let nearest: Position | undefined
  let distance = Infinity
  for (const zone of zones) {
    if (zone.type !== 'charging') continue
    // Aim slightly inside the area instead of stopping on its border.
    const insetX = Math.min(12, zone.width / 2)
    const insetY = Math.min(12, zone.height / 2)
    const point = {
      x: Math.max(zone.x + insetX, Math.min(position.x, zone.x + zone.width - insetX)),
      y: Math.max(zone.y + insetY, Math.min(position.y, zone.y + zone.height - insetY)),
    }
    const candidateDistance = Math.hypot(point.x - position.x, point.y - position.y)
    if (!nearest || candidateDistance < distance) {
      nearest = point
      distance = candidateDistance
    }
  }
  return nearest
}
