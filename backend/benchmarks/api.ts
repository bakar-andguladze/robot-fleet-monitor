import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import { createRobotSimulator } from '../src/simulation/createRobotSimulator.js'
import { createBenchmarkFleet, delay, distribution, environment, fleetSizes, startBenchmarkApi } from './fixture.js'

const results = []
for (const count of fleetSizes) {
  const { fleet, routes } = createBenchmarkFleet(count)
  const simulate = createRobotSimulator(fleet, routes)
  // Keep sampled times inside the active battery window for this movement check.
  for (let tick = 0; tick < 200; tick++) fleet.robots = simulate(tick / 60)
  const ticks = []
  for (let tick = 0; tick < 2000; tick++) {
    const started = performance.now()
    fleet.robots = simulate((tick + 200) / 60)
    ticks.push(performance.now() - started)
  }
  assert.equal(fleet.robots.length, count)
  assert.ok(fleet.robots.every(robot => robot.status === 'moving'), 'Benchmark robots must still be moving')
  const simulationMs = distribution(ticks)
  const api = await startBenchmarkApi(count)
  try {
    const url = api.url + '/api/robots?siteId=benchmark-site'
    const warmup = await fetch(url)
    assert.equal(warmup.status, 200)
    await warmup.arrayBuffer()
    for (const viewers of [1, 10, 50]) {
      const latencies: number[] = []
      let bytes = 0
      let errors = 0
      const started = performance.now()
      const deadline = started + 8000
      await Promise.all(Array.from({ length: viewers }, async () => {
        // Match the dashboard: one request, consume its body, then wait a second.
        do {
          const requested = performance.now()
          try {
            const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
            const body = await response.arrayBuffer()
            if (!response.ok) throw new Error('HTTP ' + response.status)
            // A successful but incorrect response must not be counted as fast.
            const decoded: unknown = JSON.parse(Buffer.from(body).toString('utf8'))
            assert.ok(Array.isArray(decoded) && decoded.length === count)
            bytes += body.byteLength
            latencies.push(performance.now() - requested)
          } catch {
            errors++
          }
          await delay(1000)
        } while (performance.now() < deadline)
      }))
      const seconds = (performance.now() - started) / 1000
      results.push({ robots: count, viewers, simulationMs, responseMs: distribution(latencies), errors,
        seconds: Number(seconds.toFixed(2)), meanBodyKiB: Number((bytes / latencies.length / 1024).toFixed(2)),
        bodyKiBPerSecond: Number((bytes / seconds / 1024).toFixed(2)),
      })
      assert.equal(errors, 0, 'Benchmark requests failed')
    }
  } finally {
    await api.close()
  }
}
console.log(JSON.stringify({ environment: environment(), results }, null, 2))
