import type { Robot } from '../types/robot'
import type { Site, SiteZone } from '../types/site'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isNonnegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isZone(value: unknown): value is SiteZone {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && (value.type === 'storage' || value.type === 'loading' || value.type === 'charging')
    && isNonnegativeNumber(value.x)
    && isNonnegativeNumber(value.y)
    && isNonnegativeNumber(value.width) && value.width > 0
    && isNonnegativeNumber(value.height) && value.height > 0
}

function isSite(value: unknown): value is Site {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.name)
    && isNonnegativeNumber(value.width) && value.width > 0
    && isNonnegativeNumber(value.height) && value.height > 0
    && Array.isArray(value.zones) && value.zones.every(isZone)
}

function isRobot(value: unknown): value is Robot {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.name)
    && isNonEmptyString(value.siteId)
    && (value.status === 'moving' || value.status === 'idle'
      || value.status === 'charging' || value.status === 'error')
    && isNonnegativeNumber(value.batteryPercent) && value.batteryPercent <= 100
    && isRecord(value.position)
    && isNonnegativeNumber(value.position.x)
    && isNonnegativeNumber(value.position.y)
}

async function fetchJson(path: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(path, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
  })
  if (!response.ok) {
    throw new Error('Fleet request failed with status ' + response.status)
  }
  return response.json()
}

export async function fetchSites(signal: AbortSignal): Promise<Site[]> {
  const sites = await fetchJson('/api/sites', signal)
  if (!Array.isArray(sites) || !sites.every(isSite)
    || new Set(sites.map((site) => site.id)).size !== sites.length) {
    throw new Error('Invalid warehouse data received from the API')
  }
  return sites
}

export async function fetchRobots(site: Site, signal: AbortSignal): Promise<Robot[]> {
  const robots = await fetchJson('/api/robots?siteId=' + encodeURIComponent(site.id), signal)
  if (!Array.isArray(robots) || !robots.every(isRobot)
    || new Set(robots.map((robot) => robot.id)).size !== robots.length
    || robots.some((robot) => robot.siteId !== site.id
      || robot.position.x > site.width || robot.position.y > site.height)) {
    throw new Error('Invalid robot data received from the API')
  }
  return robots
}
