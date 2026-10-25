import { describe, expect, it } from 'vitest'
import { fleetSchema } from '../src/data/fleetSchema.js'
import type { FleetData } from '../src/data/fleetSchema.js'
import { loadFleetData } from '../src/data/loadFleetData.js'
import { createRobotSimulator } from '../src/simulation/createRobotSimulator.js'
import type { RobotRoute } from '../src/simulation/createRobotSimulator.js'
import { robotRoutes } from '../src/simulation/robotRoutes.js'

type Robot = FleetData['robots'][number]

function fixture() {
  const robot: Robot = { id: 'robot', name: 'Robot', siteId: 'warehouse', status: 'moving',
    batteryPercent: 21, position: { x: 10, y: 10 } }
  const site: FleetData['sites'][number] = { id: 'warehouse', name: 'Warehouse', width: 100, height: 80,
    zones: [{ id: 'charger', type: 'charging', x: 50, y: 0, width: 20, height: 20 }] }
  const route: RobotRoute = { siteId: site.id, speed: 10,
    waypoints: [{ x: 10, y: 10 }, { x: 30, y: 10 }, { x: 30, y: 30 }, { x: 10, y: 30 }] }
  const fleet: FleetData = { sites: [site], robots: [robot] }
  return { fleet, robot, site, route, routes: { [robot.id]: route } }
}

describe('automatic charging cycle', () => {
  it('diverts at 20%, drains during travel, and charges only on arrival', () => {
    const { fleet, routes } = fixture()
    const simulate = createRobotSimulator(fleet, routes)
    expect(simulate(1.9)[0]?.batteryPercent).toBeCloseTo(20.05)
    expect(simulate(2.5)[0]).toMatchObject({ status: 'moving', batteryPercent: 19.75, position: { x: 35, y: 10 } })
    expect(simulate(5)[0]).toMatchObject({ status: 'charging', batteryPercent: 18.5, position: { x: 60, y: 10 } })
    expect(simulate(6)[0]).toMatchObject({ status: 'charging', batteryPercent: 19.5, position: { x: 60, y: 10 } })
  })

  it('departs at full charge and joins the work route without teleporting', () => {
    const { fleet, routes } = fixture()
    const simulate = createRobotSimulator(fleet, routes)
    expect(simulate(86.5)[0]).toMatchObject({ status: 'moving', batteryPercent: 100, position: { x: 60, y: 10 } })
    expect(simulate(87.5)[0]).toMatchObject({ status: 'moving', batteryPercent: 99.5, position: { x: 50, y: 10 } })
    expect(simulate(92.5)[0]).toMatchObject({ status: 'moving', batteryPercent: 97, position: { x: 20, y: 10 } })
  })

  it('repeats the charging cycle and skips complete cycles after a long delay', () => {
    const { fleet, routes } = fixture()
    const simulate = createRobotSimulator(fleet, routes)
    // After rejoining, the robot reaches (30, 20) at its next 20% threshold.
    const tripSeconds = Math.hypot(30, 10) / 10
    const cycleSeconds = 160 + tripSeconds + (80 + tripSeconds * 0.5)
    for (const cycle of [1, 2, 100_000]) {
      const snapshot = simulate(86.5 + cycleSeconds * cycle + 1)[0]
      expect(snapshot?.status).toBe('moving')
      expect(snapshot?.batteryPercent).toBeCloseTo(99.5, 6)
      expect(snapshot?.position.x).toBeCloseTo(50, 6)
      expect(snapshot?.position.y).toBeCloseTo(10, 6)
    }
  })

  it.each([2, 5, 86.5, 91.5])('keeps positions continuous across the transition at %s seconds', (time) => {
    const { fleet, routes } = fixture()
    const simulate = createRobotSimulator(fleet, routes)
    const before = simulate(time - 0.000001)[0]?.position
    const after = simulate(time + 0.000001)[0]?.position
    if (!before || !after) throw new Error('Missing robot')
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThanOrEqual(0.000021)
  })

  it('immediately sends an already-low robot toward its charger', () => {
    const { fleet, robot, routes } = fixture()
    robot.batteryPercent = 19
    const simulate = createRobotSimulator(fleet, routes)
    expect(simulate(1)[0]).toMatchObject({ status: 'moving', batteryPercent: 18.5, position: { x: 20, y: 10 } })
    expect(simulate(5)[0]).toMatchObject({ status: 'charging', batteryPercent: 16.5 })
  })

  it('uses the nearest local charging area and can charge immediately when already there', () => {
    const { fleet, robot, site, routes } = fixture()
    robot.batteryPercent = 19
    site.zones.push({ id: 'near', type: 'charging', x: 0, y: 0, width: 20, height: 20 })
    expect(createRobotSimulator(fleet, routes)(0)[0]).toMatchObject({ status: 'charging', batteryPercent: 19, position: robot.position })
  })

  it('ignores charging areas in other warehouses', () => {
    const { fleet, robot, routes } = fixture()
    robot.batteryPercent = 19
    fleet.sites.push({ id: 'other', name: 'Other', width: 100, height: 80,
      zones: [{ id: 'near', type: 'charging', x: 0, y: 0, width: 20, height: 20 }] })
    expect(createRobotSimulator(fleet, routes)(5)[0]).toMatchObject({ status: 'charging', position: { x: 60, y: 10 } })
  })

  it('stops at depletion if its charging area cannot be reached', () => {
    const { fleet, robot, site, routes } = fixture()
    robot.batteryPercent = 19
    site.width = 1000
    site.zones = [{ id: 'far', type: 'charging', x: 900, y: 0, width: 20, height: 20 }]
    const simulate = createRobotSimulator(fleet, routes)
    expect(simulate(38)[0]).toMatchObject({ status: 'error', batteryPercent: 0, position: { x: 390, y: 10 } })
    expect(simulate(10_000)).toEqual(simulate(38))
  })

  it('can start charging when it reaches the station exactly as its battery empties', () => {
    const { fleet, robot, routes } = fixture()
    robot.batteryPercent = 2.5
    const simulate = createRobotSimulator(fleet, routes)
    expect(simulate(5)[0]).toMatchObject({ status: 'charging', batteryPercent: 0, position: { x: 60, y: 10 } })
    expect(simulate(6)[0]).toMatchObject({ status: 'charging', batteryPercent: 1 })
  })

  it('lets a seeded charging robot leave when full, and validates its work route', () => {
    const { fleet, robot, route, routes } = fixture()
    robot.status = 'charging'
    robot.position = { x: 60, y: 10 }
    robot.batteryPercent = 99.5
    expect(createRobotSimulator(fleet, routes)(1.5)[0]).toMatchObject({ status: 'moving', batteryPercent: 99.5, position: { x: 50, y: 10 } })
    route.speed = 0
    expect(() => createRobotSimulator(fleet, routes)).toThrow('speed')
  })

  it('produces the same snapshot regardless of intermediate calls and preserves seed data', () => {
    const { fleet, routes } = fixture()
    const original = structuredClone({ fleet, routes })
    const simulate = createRobotSimulator(fleet, routes)
    for (let seconds = 0; seconds < 1200; seconds += 0.5) simulate(seconds)
    expect(simulate(1200)).toEqual(createRobotSimulator(fleet, routes)(1200))
    expect({ fleet, routes }).toEqual(original)
  })

  it('keeps every shipped active robot cycling, in bounds, and charging inside a charging area', async () => {
    const fleet = await loadFleetData()
    const simulate = createRobotSimulator(fleet, robotRoutes)
    const active = new Set(fleet.robots.filter(robot => robot.status === 'moving' || robot.status === 'charging').map(robot => robot.id))
    for (const seconds of [0, 1, 73, 120, 300, 1000, 3600, 86_400, 1e9, Number.MAX_VALUE]) {
      const robots = simulate(seconds)
      expect(fleetSchema.safeParse({ ...fleet, robots }).success).toBe(true)
      for (const robot of robots.filter(robot => active.has(robot.id))) {
        expect(['moving', 'charging']).toContain(robot.status)
        if (robot.status === 'charging') {
          const site = fleet.sites.find(site => site.id === robot.siteId)
          expect(site?.zones.some(zone => zone.type === 'charging'
            && robot.position.x >= zone.x && robot.position.x <= zone.x + zone.width
            && robot.position.y >= zone.y && robot.position.y <= zone.y + zone.height)).toBe(true)
        }
      }
    }
  })
})
