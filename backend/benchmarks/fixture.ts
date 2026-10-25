import { once } from 'node:events'
import { cpus, platform, release } from 'node:os'
import { setTimeout as delay } from 'node:timers/promises'
import express from 'express'
import { createApp } from '../src/app.js'
import { fleetSchema } from '../src/data/fleetSchema.js'
import type { RobotRoute } from '../src/simulation/createRobotSimulator.js'
import { startRobotSimulation } from '../src/simulation/startRobotSimulation.js'

export { delay }
export const fleetSizes = [100, 1000]

export function createBenchmarkFleet(count: number) {
  if (!Number.isInteger(count) || count < 1 || count > 1000) {
    throw new Error('Benchmark fleet size must be an integer between 1 and 1000')
  }
  const routes: Record<string, RobotRoute> = {}
  const robots = Array.from({ length: count }, (_, index) => {
    const id = 'benchmark-' + index.toString().padStart(4, '0')
    const position = { x: 25 + (index % 20) * 38, y: 25 + Math.floor(index / 20) * 9 }
    routes[id] = {
      siteId: 'benchmark-site',
      speed: 12,
      waypoints: [
        { x: position.x + 15, y: position.y },
        { x: position.x + 15, y: position.y + 8 },
        { x: position.x, y: position.y + 8 },
      ],
    }
    return { id, name: 'Robot ' + index, siteId: 'benchmark-site', status: 'moving', batteryPercent: 80, position }
  })
  const fleet = fleetSchema.parse({
    sites: [{ id: 'benchmark-site', name: 'Benchmark warehouse', width: 800, height: 520, zones: [
      { id: 'storage', type: 'storage', x: 40, y: 40, width: 350, height: 350 },
      { id: 'loading', type: 'loading', x: 500, y: 40, width: 240, height: 150 },
      { id: 'charging', type: 'charging', x: 500, y: 320, width: 240, height: 150 },
    ] }],
    robots,
  })
  return { fleet, routes }
}

export async function startBenchmarkApi(count: number) {
  const { fleet, routes } = createBenchmarkFleet(count)
  const stopSimulation = startRobotSimulation(fleet, routes)
  const requests = { sites: 0, robots: 0 }
  const app = express()
  app.use((request, _response, next) => {
    if (request.path === '/api/sites') requests.sites++
    if (request.path === '/api/robots') requests.robots++
    next()
  })
  app.use(createApp(fleet))
  const server = app.listen(0, '127.0.0.1')
  try {
    await once(server, 'listening')
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Missing benchmark API port')
    return {
      url: 'http://127.0.0.1:' + address.port,
      requests,
      async close() {
        stopSimulation()
        const closed = once(server, 'close')
        server.close()
        server.closeAllConnections()
        await closed
      },
    }
  } catch (error) {
    stopSimulation()
    server.close()
    throw error
  }
}

export function distribution(samples: number[]) {
  if (samples.length === 0) throw new Error('No benchmark samples collected')
  const sorted = [...samples].sort((a, b) => a - b)
  const percentile = (fraction: number) => Number((sorted[Math.ceil(sorted.length * fraction) - 1] ?? 0).toFixed(4))
  return { samples: sorted.length, p50: percentile(0.5), p95: percentile(0.95), max: percentile(1) }
}

export function environment() {
  return { date: new Date().toISOString(), node: process.version, os: platform() + ' ' + release(), cpu: cpus()[0]?.model }
}
