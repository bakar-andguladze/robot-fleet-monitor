import type { FleetData } from '../data/fleetSchema.js'
import { createChargingCycle } from './robotChargingCycle.js'
import { prepareRobotRoute } from './robotRoute.js'
import type { RobotRoute } from './robotRoute.js'

export type { RobotRoute } from './robotRoute.js'

export function createRobotSimulator(
  fleet: FleetData,
  routes: Readonly<Record<string, RobotRoute>>,
) {
  const sites = new Map(fleet.sites.map(site => [site.id, site]))
  const simulators = structuredClone(fleet.robots).map(robot => {
    if (robot.status === 'idle' || robot.status === 'error') return () => robot
    const site = sites.get(robot.siteId)
    // A charging robot can finish without an assigned work route, then remain idle.
    const route = robot.status === 'moving' || routes[robot.id]
      ? prepareRobotRoute(robot, site, routes[robot.id]) : undefined
    return createChargingCycle(robot, route, site?.zones ?? [])
  })

  return function simulate(elapsedSeconds: number): FleetData['robots'] {
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
      throw new Error('Simulation time must be non-negative and finite')
    }
    return simulators.map(simulateRobot => simulateRobot(elapsedSeconds))
  }
}
