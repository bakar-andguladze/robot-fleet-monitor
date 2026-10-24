import { mkdtemp, readFile, rmdir, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadFleetData } from '../src/data/loadFleetData.js'

function validFixture() {
  const zone = { id: 'loading', type: 'loading', x: 0, y: 0, width: 20, height: 20 }
  const site = { id: 'warehouse', name: 'Warehouse', width: 100, height: 80, zones: [zone] }
  const robot = {
    id: 'robot', name: 'Robot', siteId: 'warehouse', status: 'idle',
    batteryPercent: 50, position: { x: 40, y: 30 },
  }
  return { fleet: { sites: [site], robots: [robot] }, site, robot, zone }
}

type Fixture = ReturnType<typeof validFixture>

const invalidFixtures: { name: string; change: (fixture: Fixture) => void }[] = [
  { name: 'unknown warehouse reference', change: ({ robot }) => { robot.siteId = 'missing' } },
  { name: 'duplicate site IDs', change: ({ fleet, site }) => { fleet.sites.push(structuredClone(site)) } },
  { name: 'duplicate robot IDs', change: ({ fleet, robot }) => { fleet.robots.push(structuredClone(robot)) } },
  { name: 'duplicate zone IDs', change: ({ site, zone }) => { site.zones.push(structuredClone(zone)) } },
  { name: 'zone outside its warehouse', change: ({ zone }) => { zone.width = 101 } },
  { name: 'robot outside its warehouse', change: ({ robot }) => { robot.position.y = 81 } },
  { name: 'negative coordinates', change: ({ robot }) => { robot.position.x = -1 } },
  { name: 'invalid battery percentage', change: ({ robot }) => { robot.batteryPercent = 101 } },
  { name: 'unknown operating status', change: ({ robot }) => { robot.status = 'flying' } },
  { name: 'invalid dimensions', change: ({ site }) => { site.height = 0 } },
]

let directory: URL

async function writeFleet(fleet: Fixture['fleet']) {
  await Promise.all([
    writeFile(new URL('sites.json', directory), JSON.stringify(fleet.sites)),
    writeFile(new URL('robots.json', directory), JSON.stringify(fleet.robots)),
  ])
}

beforeEach(async () => {
  const path = await mkdtemp(join(tmpdir(), 'robot-fleet-data-'))
  directory = pathToFileURL(path + '/')
  await writeFleet(validFixture().fleet)
})

afterEach(async () => {
  await Promise.all(['sites.json', 'robots.json'].map(async (name) => {
    await unlink(new URL(name, directory)).catch((error: unknown) => {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
    })
  }))
  await rmdir(directory)
})

describe('loadFleetData', () => {
  it('loads and validates the shipped fixtures', async () => {
    const fleet = await loadFleetData()
    const sites: unknown = JSON.parse(await readFile(new URL('../data/sites.json', import.meta.url), 'utf8'))
    const robots: unknown = JSON.parse(await readFile(new URL('../data/robots.json', import.meta.url), 'utf8'))
    expect(fleet).toEqual({ sites, robots })
  })

  it('allows empty fleets', async () => {
    await writeFleet({ sites: [], robots: [] })
    await expect(loadFleetData(directory)).resolves.toEqual({ sites: [], robots: [] })
  })

  it('rejects missing files rather than using fallback data', async () => {
    await unlink(new URL('robots.json', directory))
    await expect(loadFleetData(directory)).rejects.toThrow('Failed to read or parse')
  })

  it('rejects malformed JSON', async () => {
    await writeFile(new URL('sites.json', directory), '{ invalid json')
    await expect(loadFleetData(directory)).rejects.toThrow('Failed to read or parse')
  })

  it.each(invalidFixtures)('rejects $name', async ({ change }) => {
    const fixture = validFixture()
    change(fixture)
    await writeFleet(fixture.fleet)
    await expect(loadFleetData(directory)).rejects.toThrow()
  })
})
