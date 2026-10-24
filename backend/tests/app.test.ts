import { once } from 'node:events'
import type { Server } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { loadFleetData } from '../src/data/loadFleetData.js'
import type { FleetData } from '../src/data/fleetSchema.js'

let server: Server | undefined
let baseUrl: string
let fleet: FleetData

beforeAll(async () => {
  fleet = await loadFleetData()
  fleet.sites.push({ id: 'empty', name: 'Empty Warehouse', width: 100, height: 100, zones: [] })
  server = createApp(fleet).listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Expected a TCP address')
  baseUrl = 'http://127.0.0.1:' + address.port
})

afterAll(async () => {
  if (!server) return
  const runningServer = server
  await new Promise<void>((resolve, reject) => {
    runningServer.close((error) => error ? reject(error) : resolve())
  })
})

describe('fleet API', () => {
  it('returns the warehouse layouts', async () => {
    const response = await fetch(baseUrl + '/api/sites')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(fleet.sites)
  })

  it('returns all robots when no warehouse is requested', async () => {
    const response = await fetch(baseUrl + '/api/robots')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(fleet.robots)
  })

  it.each(['site-north', 'site-south'])('filters robots by %s', async (siteId) => {
    const response = await fetch(baseUrl + '/api/robots?siteId=' + siteId)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(fleet.robots.filter((robot) => robot.siteId === siteId))
  })

  it('distinguishes an empty warehouse from an unknown warehouse', async () => {
    const emptyResponse = await fetch(baseUrl + '/api/robots?siteId=empty')
    expect(emptyResponse.status).toBe(200)
    expect(await emptyResponse.json()).toEqual([])

    const unknownResponse = await fetch(baseUrl + '/api/robots?siteId=missing')
    expect(unknownResponse.status).toBe(404)
    expect(await unknownResponse.json()).toEqual({ error: 'Warehouse not found' })
  })

  it.each(['siteId=', 'siteId=%20', 'siteId=site-north&siteId=site-south'])(
    'rejects a malformed filter: %s', async (query) => {
      const response = await fetch(baseUrl + '/api/robots?' + query)
      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({ error: 'siteId must be a single, non-empty string' })
    },
  )

  it('preserves the health endpoint and JSON not-found response', async () => {
    const health = await fetch(baseUrl + '/health')
    expect(health.status).toBe(200)
    expect(await health.json()).toEqual({ status: 'ok' })

    const missing = await fetch(baseUrl + '/api/missing')
    expect(missing.status).toBe(404)
    expect(await missing.json()).toEqual({ error: 'Not found' })
  })
})
