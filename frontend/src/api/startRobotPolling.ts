import type { Robot } from '../types/robot'
import type { Site } from '../types/site'
import { fetchRobots } from './fleet'

type RobotPollingOptions = {
  site: Site
  onUpdate: (robots: readonly Robot[]) => void
  onError: () => void
  repeat?: boolean
}

export function startRobotPolling({ site, onUpdate, onError, repeat = true }: RobotPollingOptions) {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined

  async function poll() {
    try {
      const robots = await fetchRobots(site, controller.signal)
      if (!controller.signal.aborted) onUpdate(robots)
    } catch {
      if (!controller.signal.aborted) onError()
    } finally {
      if (!controller.signal.aborted && repeat) timer = setTimeout(poll, 1000)
    }
  }

  void poll()

  return () => {
    controller.abort()
    clearTimeout(timer)
  }
}
