import type { FleetData } from '../data/fleetSchema.js'
import { directPath, nearestChargingPoint, workPath } from './robotRoute.js'
import type { Position, PreparedRoute } from './robotRoute.js'

type Robot = FleetData['robots'][number]
type Zones = FleetData['sites'][number]['zones']
type Phase = {
  duration: number
  status: 'moving' | 'charging'
  battery: number
  positionAt: (seconds: number) => Position
}

// Accelerated demo rates, in battery percentage points per second.
const movementDrainPerSecond = 0.5
const chargingGainPerSecond = 1
const chargingThreshold = 20

export function createChargingCycle(robot: Robot, route: PreparedRoute | undefined, zones: Zones) {
  const initial: Phase[] = []
  let battery = robot.batteryPercent
  if (robot.status === 'charging') {
    initial.push({ duration: (100 - battery) / chargingGainPerSecond, status: 'charging',
      battery, positionAt: () => robot.position })
    battery = 100
  }
  if (!route) {
    const full = { ...robot, batteryPercent: 100, status: 'idle' } satisfies Robot
    return (seconds: number) => sample(initial, seconds, robot, full)
  }
  if (battery === 0) return () => ({ ...robot, status: 'error' } satisfies Robot)
  const workRoute = route

  function workingTrip(phases: Phase[], start: Position, charge: number, assignedStation?: Position) {
    const path = workPath(workRoute, start)
    const canCharge = assignedStation !== undefined || zones.some(zone => zone.type === 'charging')
    const seconds = Math.max(0, (charge - (canCharge ? chargingThreshold : 0)) / movementDrainPerSecond)
    phases.push({ duration: seconds, status: 'moving', battery: charge, positionAt: path })
    const position = path(seconds)
    const remaining = Math.max(0, charge - seconds * movementDrainPerSecond)
    const station = assignedStation ?? nearestChargingPoint(zones, position)
    if (!station) {
      return { terminal: { ...robot, batteryPercent: 0, status: 'error', position } satisfies Robot,
        station, repeats: false }
    }
    const trip = directPath(position, station, workRoute.speed)
    const availableSeconds = remaining / movementDrainPerSecond
    phases.push({ duration: Math.min(trip.duration, availableSeconds), status: 'moving',
      battery: remaining, positionAt: trip.positionAt })
    if (trip.duration > availableSeconds) {
      return { terminal: { ...robot, batteryPercent: 0, status: 'error', position: trip.positionAt(availableSeconds) } satisfies Robot,
        station, repeats: false }
    }
    const arrivalBattery = Math.max(0, remaining - trip.duration * movementDrainPerSecond)
    phases.push({ duration: (100 - arrivalBattery) / chargingGainPerSecond, status: 'charging',
      battery: arrivalBattery, positionAt: () => station })
    return { terminal: { ...robot, batteryPercent: 100, status: 'moving', position: station } satisfies Robot,
      station, repeats: true }
  }

  const first = workingTrip(initial, robot.position, battery)
  const initialDuration = duration(initial)
  if (!first.repeats || !first.station) {
    return (seconds: number) => sample(initial, seconds, robot, first.terminal)
  }
  // Returning to the same work start and assigned station makes each full cycle
  // repeatable. Skip complete cycles arithmetically after a delayed timer tick.
  const cycle: Phase[] = []
  const repeated = workingTrip(cycle, first.station, 100, first.station)
  const cycleDuration = duration(cycle)
  return (seconds: number): Robot => {
    if (seconds < initialDuration) return sample(initial, seconds, robot, first.terminal)
    const elapsed = seconds - initialDuration
    return sample(cycle, repeated.repeats ? elapsed % cycleDuration : elapsed, robot, repeated.terminal)
  }
}

function duration(phases: Phase[]) {
  return phases.reduce((total, phase) => total + phase.duration, 0)
}

function sample(phases: Phase[], seconds: number, robot: Robot, terminal: Robot): Robot {
  for (const phase of phases) {
    if (seconds < phase.duration) {
      const change = phase.status === 'charging' ? chargingGainPerSecond : -movementDrainPerSecond
      return { ...robot, status: phase.status,
        batteryPercent: Math.max(0, Math.min(100, phase.battery + seconds * change)),
        position: phase.positionAt(seconds) }
    }
    seconds -= phase.duration
  }
  return terminal
}
