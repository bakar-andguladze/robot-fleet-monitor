import { expect, test } from 'vitest'
import { mockRobots } from '../src/data/mockRobots'
import { mockRoutes } from '../src/data/mockRoutes'
import { mockSites } from '../src/data/mockSites'
import type { Robot } from '../src/types/robot'
import { simulateRobots } from '../src/simulation/simulateRobots'
import type { RobotRoute } from '../src/simulation/simulateRobots'

const robot: Robot = {
  id: 'test-robot',
  name: 'Test robot',
  siteId: 'test-site',
  status: 'moving',
  batteryPercent: 80,
  position: { x: 0, y: 0 },
}

const routes: Record<string, RobotRoute> = {
  [robot.id]: {
    speed: 10,
    waypoints: [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
      { x: 0, y: 20 },
    ],
  },
}

test('moves at the route speed and follows corners without losing distance', () => {
  expect(simulateRobots([robot], routes, 0)[0].position).toStrictEqual({ x: 0, y: 0 })
  expect(simulateRobots([robot], routes, 1)[0].position).toStrictEqual({ x: 10, y: 0 })
  expect(simulateRobots([robot], routes, 2)[0].position).toStrictEqual({ x: 20, y: 0 })
  expect(simulateRobots([robot], routes, 3)[0].position).toStrictEqual({ x: 20, y: 10 })
})

test('loops routes and handles elapsed time spanning many laps', () => {
  expect(simulateRobots([robot], routes, 8)[0].position).toStrictEqual(robot.position)
  expect(simulateRobots([robot], routes, 8003)[0].position).toStrictEqual({ x: 20, y: 10 })
})

test('idle, charging, and error robots remain stationary even with a route', () => {
  for (const status of ['idle', 'charging', 'error'] as const) {
    const stationaryRobot = { ...robot, status }
    expect(simulateRobots([stationaryRobot], routes, 5)[0]).toBe(stationaryRobot)
  }
})

test('does not mutate input records or routes', () => {
  const originalRobot = structuredClone(robot)
  const originalRoutes = structuredClone(routes)
  simulateRobots([robot], routes, 3)
  expect(robot).toStrictEqual(originalRobot)
  expect(routes).toStrictEqual(originalRoutes)
})

test('missing or zero-length routes leave the robot in place', () => {
  expect(simulateRobots([robot], {}, 5)[0]).toBe(robot)
  const zeroLengthRoutes: Record<string, RobotRoute> = {
    [robot.id]: { speed: 10, waypoints: [{ x: 0, y: 0 }, { x: 0, y: 0 }] },
  }
  expect(simulateRobots([robot], zeroLengthRoutes, 5)[0]).toBe(robot)
})

test('mock routes start at the fixture positions and stay inside their warehouses', () => {
  for (const movingRobot of mockRobots.filter((robot) => robot.status === 'moving')) {
    const route = mockRoutes[movingRobot.id]
    expect(route).toBeDefined()
    expect(route.waypoints[0]).toStrictEqual(movingRobot.position)
    expect(simulateRobots([movingRobot], mockRoutes, 1)[0].position)
      .not.toStrictEqual(movingRobot.position)
  }
  for (let seconds = 0; seconds <= 120; seconds++) {
    for (const currentRobot of simulateRobots(mockRobots, mockRoutes, seconds)) {
      const site = mockSites.find((site) => site.id === currentRobot.siteId)
      if (!site) {
        throw new Error(`Unknown warehouse for ${currentRobot.name}: ${currentRobot.siteId}`)
      }
      expect(currentRobot.position.x).toBeGreaterThanOrEqual(24)
      expect(currentRobot.position.x).toBeLessThanOrEqual(site.width - 24)
      expect(currentRobot.position.y).toBeGreaterThanOrEqual(24)
      expect(currentRobot.position.y).toBeLessThanOrEqual(site.height - 24)
    }
  }
})
