import type { Robot } from './robot'
import type { Site } from './site'

export type FleetData = {
  sites: readonly Site[]
  robots: readonly Robot[]
}
