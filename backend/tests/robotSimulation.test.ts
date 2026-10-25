import { once } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { loadFleetData } from '../src/data/loadFleetData.js'
import type { FleetData } from '../src/data/fleetSchema.js'
import { createRobotSimulator } from '../src/simulation/createRobotSimulator.js'
import type { RobotRoute } from '../src/simulation/createRobotSimulator.js'
import { robotRoutes } from '../src/simulation/robotRoutes.js'
import { startRobotSimulation } from '../src/simulation/startRobotSimulation.js'

type Robot = FleetData['robots'][number]

function fixture(status: Robot['status'] = 'moving') {
  const robot: Robot = {
    id: 'robot', name: 'Robot', siteId: 'warehouse', status,
    batteryPercent: 80, position: { x: 10, y: 10 },
  }
  const site = { id: 'warehouse', name: 'Warehouse', width: 100, height: 80, zones: [] }
  const route: RobotRoute = {
    siteId: site.id, speed: 10,
    waypoints: [{ x: 10, y: 10 }, { x: 30, y: 10 }, { x: 30, y: 30 }, { x: 10, y: 30 }],
  }
  const fleet: FleetData = { sites: [site], robots: [robot] }
  return { fleet, robot, site, route, routes: { [robot.id]: route } }
}

type Fixture = ReturnType<typeof fixture>
const invalidRoutes: { name: string; change: (fixture: Fixture) => void }[] = [
  { name: 'a missing route', change: ({ routes, robot }) => { delete routes[robot.id] } },
  { name: 'a route for another warehouse', change: ({ route }) => { route.siteId = 'other' } },
  { name: 'a zero speed', change: ({ route }) => { route.speed = 0 } },
  { name: 'a non-finite speed', change: ({ route }) => { route.speed = Infinity } },
  { name: 'an out-of-bounds waypoint', change: ({ route }) => { route.waypoints = [{ x: 101, y: 10 }, { x: 10, y: 10 }] } },
  { name: 'a negative waypoint', change: ({ route }) => { route.waypoints = [{ x: -1, y: 10 }, { x: 10, y: 10 }] } },
  { name: 'a non-finite waypoint', change: ({ route }) => { route.waypoints = [{ x: NaN, y: 10 }, { x: 10, y: 10 }] } },
  { name: 'a zero-length route', change: ({ route }) => { route.waypoints = [{ x: 10, y: 10 }, { x: 10, y: 10 }] } },
]

describe('robot movement', () => {
  it('follows corners at the configured speed and loops across many laps', () => {
    const { fleet, routes } = fixture()
    const simulate = createRobotSimulator(fleet, routes)
    expect(simulate(0)[0]?.position).toEqual({ x: 10, y: 10 })
    expect(simulate(1)[0]?.position).toEqual({ x: 20, y: 10 })
    expect(simulate(3)[0]?.position).toEqual({ x: 30, y: 20 })
    expect(simulate(8)[0]?.position).toEqual({ x: 10, y: 10 })
    expect(simulate(155)[0]?.position).toEqual({ x: 30, y: 20 })
  })

  const stationaryStatuses: Robot['status'][] = ['idle', 'charging', 'error']
  it.each(stationaryStatuses)('leaves %s robots in place without requiring a route', (status) => {
    const { fleet, robot } = fixture(status)
    expect(createRobotSimulator(fleet, {})(60)[0]?.position).toEqual(robot.position)
  })

  it('starts at the seed position before joining the configured route', () => {
    const { fleet, routes, robot } = fixture()
    robot.position = { x: 5, y: 10 }
    const simulate = createRobotSimulator(fleet, routes)
    expect(simulate(0)[0]?.position).toEqual({ x: 5, y: 10 })
    expect(simulate(1)[0]?.position).toEqual({ x: 15, y: 10 })
  })

  it('does not mutate the seed records or route configuration', () => {
    const { fleet, routes } = fixture()
    const seed = structuredClone(fleet)
    const originalRoutes = structuredClone(routes)
    const simulate = createRobotSimulator(fleet, routes)
    simulate(3)
    simulate(7)
    expect(fleet).toEqual(seed)
    expect(routes).toEqual(originalRoutes)
  })

  it('keeps the shipped fleet inside its warehouses', async () => {
    const fleet = await loadFleetData()
    const simulate = createRobotSimulator(fleet, robotRoutes)
    const sites = new Map(fleet.sites.map(site => [site.id, site]))
    for (let seconds = 0; seconds <= 120; seconds++) {
      for (const robot of simulate(seconds)) {
        const site = sites.get(robot.siteId)
        if (!site) throw new Error('Unknown warehouse')
        expect(robot.position.x).toBeGreaterThanOrEqual(0)
        expect(robot.position.x).toBeLessThanOrEqual(site.width)
        expect(robot.position.y).toBeGreaterThanOrEqual(0)
        expect(robot.position.y).toBeLessThanOrEqual(site.height)
      }
    }
  })

  it('supports an empty fleet', () => {
    expect(createRobotSimulator({ sites: [], robots: [] }, {})(100)).toEqual([])
  })

  it.each(invalidRoutes)('rejects $name before starting a timer', ({ change }) => {
    const data = fixture()
    change(data)
    expect(() => createRobotSimulator(data.fleet, data.routes)).toThrow(/route|speed/)
  })

  it.each([-1, NaN, Infinity])('rejects invalid simulation time %s', (time) => {
    const { fleet, routes } = fixture()
    const simulate = createRobotSimulator(fleet, routes)
    expect(() => simulate(time)).toThrow('time')
  })
})

describe('battery simulation', () => {
  it('drains a moving robot by elapsed time, including fractional seconds', () => {
    const { fleet, routes } = fixture()
    const snapshot = createRobotSimulator(fleet, routes)(3.5)[0]
    expect(snapshot?.batteryPercent).toBe(78.25)
    expect(snapshot?.status).toBe('moving')
    expect(snapshot?.position).toEqual({ x: 30, y: 25 })
  })

  it('stops exactly at depletion when a delayed snapshot skips past it', () => {
    const { fleet, routes, robot } = fixture()
    robot.batteryPercent = 1.25
    const simulate = createRobotSimulator(fleet, routes)
    expect(simulate(2.49)[0]?.status).toBe('moving')
    expect(simulate(2.49)[0]?.batteryPercent).toBeCloseTo(0.005)
    const depleted = simulate(2.5)
    expect(depleted).toEqual([{ ...robot, batteryPercent: 0, status: 'error', position: { x: 30, y: 15 } }])
    expect(simulate(Number.MAX_VALUE)).toEqual(depleted)
  })

  it.each([
    { seconds: 1, position: { x: 20, y: 10 } },
    { seconds: 2, position: { x: 30, y: 10 } },
    { seconds: 8, position: { x: 10, y: 10 } },
  ])('handles depletion at $seconds seconds, including corners and a completed lap', ({ seconds, position }) => {
    const { fleet, routes, robot } = fixture()
    robot.batteryPercent = seconds * 0.5
    const simulate = createRobotSimulator(fleet, routes)
    expect(simulate(seconds + 100)[0]).toEqual({ ...robot, batteryPercent: 0, status: 'error', position })
  })

  it('charges in place, becomes idle at full charge, and never exceeds 100%', () => {
    const { fleet, robot } = fixture('charging')
    robot.batteryPercent = 99.5
    const simulate = createRobotSimulator(fleet, {})
    expect(simulate(0.25)).toEqual([{ ...robot, batteryPercent: 99.75 }])
    expect(simulate(0.5)).toEqual([{ ...robot, batteryPercent: 100, status: 'idle' }])
    expect(simulate(Number.MAX_VALUE)).toEqual(simulate(0.5))
  })

  const unchangedStatuses: Robot['status'][] = ['idle', 'error']
  it.each(unchangedStatuses)('leaves %s battery and position unchanged', (status) => {
    const { fleet, robot } = fixture(status)
    expect(createRobotSimulator(fleet, {})(Number.MAX_VALUE)).toEqual([robot])
  })

  const activeStatuses: Robot['status'][] = ['moving', 'charging']
  it.each(activeStatuses)('produces the same %s snapshot regardless of intermediate updates', (status) => {
    const { fleet, routes } = fixture(status)
    const simulate = createRobotSimulator(fleet, routes)
    simulate(1)
    simulate(3.5)
    simulate(60)
    expect(simulate(120)).toEqual(createRobotSimulator(fleet, routes)(120))
  })
})

describe('shared simulation lifecycle', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] }))
  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('updates once per second and stops cleanly', () => {
    const { fleet, routes } = fixture()
    const stop = startRobotSimulation(fleet, routes)
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(999)
    expect(fleet.robots[0]?.position).toEqual({ x: 10, y: 10 })
    vi.advanceTimersByTime(1)
    expect(fleet.robots[0]?.position).toEqual({ x: 20, y: 10 })
    stop()
    stop()
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(5000)
    expect(fleet.robots[0]?.position).toEqual({ x: 20, y: 10 })
  })

  it('uses elapsed time when a timer callback is delayed', () => {
    const { fleet, routes } = fixture()
    const clock = vi.spyOn(performance, 'now').mockReturnValue(0)
    const stop = startRobotSimulation(fleet, routes)
    clock.mockReturnValue(3500)
    vi.advanceTimersByTime(1000)
    expect(fleet.robots[0]?.position).toEqual({ x: 30, y: 25 })
    expect(fleet.robots[0]?.batteryPercent).toBe(78.25)
    stop()
  })

  const boundaryCases: { status: Robot['status']; batteryPercent: number; expected: Robot['status'] }[] = [
    { status: 'moving', batteryPercent: 0, expected: 'error' },
    { status: 'charging', batteryPercent: 100, expected: 'moving' },
  ]
  it.each(boundaryCases)('normalizes a $status robot at $batteryPercent% before the first timer tick', ({ status, batteryPercent, expected }) => {
    const { fleet, routes, robot } = fixture(status)
    robot.batteryPercent = batteryPercent
    const stop = startRobotSimulation(fleet, routes)
    expect(fleet.robots[0]).toEqual({ ...robot, status: expected })
    expect(vi.getTimerCount()).toBe(1)
    stop()
  })

  it('serves shared snapshots without creating timers or advancing on requests', async () => {
    const { fleet, routes, robot } = fixture()
    const stop = startRobotSimulation(fleet, routes)
    const server = createApp(fleet).listen(0, '127.0.0.1')
    await once(server, 'listening')
    try {
      const address = server.address()
      if (!address || typeof address === 'string') throw new Error('Expected a TCP address')
      const url = 'http://127.0.0.1:' + address.port + '/api/robots?siteId=warehouse'
      const snapshots = await Promise.all(Array.from({ length: 12 }, async () => {
        const response = await fetch(url)
        expect(response.status).toBe(200)
        expect(response.headers.get('cache-control')).toBe('no-store')
        return response.json()
      }))
      expect(snapshots.every(snapshot => JSON.stringify(snapshot) === JSON.stringify([robot]))).toBe(true)
      expect(vi.getTimerCount()).toBe(1)
      vi.advanceTimersByTime(1000)
      const updated = await fetch(url)
      expect(await updated.json()).toEqual([{ ...robot, batteryPercent: 79.5, position: { x: 20, y: 10 } }])
      expect(vi.getTimerCount()).toBe(1)
    } finally {
      stop()
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    }
  })
})
