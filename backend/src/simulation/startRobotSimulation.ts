import type { FleetData } from '../data/fleetSchema.js'
import { createRobotSimulator } from './createRobotSimulator.js'
import type { RobotRoute } from './createRobotSimulator.js'
import { robotRoutes } from './robotRoutes.js'

export function startRobotSimulation(
  fleet: FleetData,
  routes: Readonly<Record<string, RobotRoute>> = robotRoutes,
) {
  const simulate = createRobotSimulator(fleet, routes)
  const startedAt = performance.now()
  const timer = setInterval(() => {
    fleet.robots = simulate((performance.now() - startedAt) / 1000)
  }, 1000)
  timer.unref()

  return () => clearInterval(timer)
}
