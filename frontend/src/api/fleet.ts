import type { FleetData } from '../types/fleet'
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
  const response = await fetch(path, { signal })
  if (!response.ok) {
    throw new Error('Fleet request failed with status ' + response.status)
  }
  return response.json()
}

export async function fetchFleetData(signal: AbortSignal): Promise<FleetData> {
  const [sites, robots] = await Promise.all([
    fetchJson('/api/sites', signal),
    fetchJson('/api/robots', signal),
  ])

  if (!Array.isArray(sites) || !sites.every(isSite)
    || !Array.isArray(robots) || !robots.every(isRobot)) {
    throw new Error('Invalid fleet data received from the API')
  }

  const siteIds = new Set(sites.map((site) => site.id))
  const robotIds = new Set(robots.map((robot) => robot.id))
  if (siteIds.size !== sites.length || robotIds.size !== robots.length
    || robots.some((robot) => !siteIds.has(robot.siteId))) {
    throw new Error('Inconsistent fleet data received from the API')
  }

  return { sites, robots }
}
