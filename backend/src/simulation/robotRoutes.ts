import type { RobotRoute } from './createRobotSimulator.js'

// Speeds are schematic units per second; each route loops back to its first point.
export const robotRoutes: Readonly<Record<string, RobotRoute>> = {
  'RBT-001': {
    siteId: 'site-north',
    speed: 22,
    waypoints: [
      { x: 565, y: 210 },
      { x: 565, y: 340 },
      { x: 740, y: 340 },
      { x: 740, y: 450 },
      { x: 565, y: 450 },
    ],
  },
  'RBT-005': {
    siteId: 'site-south',
    speed: 24,
    waypoints: [
      { x: 500, y: 230 },
      { x: 840, y: 230 },
    ],
  },
  'RBT-007': {
    siteId: 'site-north',
    speed: 12,
    waypoints: [
      { x: 650, y: 385 },
      { x: 700, y: 385 },
      { x: 700, y: 420 },
      { x: 650, y: 420 },
    ],
  },
}
