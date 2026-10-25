import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { preview } from '../../frontend/node_modules/vite/dist/node/index.js'
import { openBrowser, until } from './browserSession.js'
import { delay, distribution, environment, fleetSizes, startBenchmarkApi } from './fixture.js'

const frontendRoot = fileURLToPath(new URL('../../frontend/', import.meta.url))
const metricSchema = z.object({ metrics: z.array(z.object({ name: z.string(), value: z.number() })) })
const results = []
let browserVersion = ''
for (const count of fleetSizes) {
  const api = await startBenchmarkApi(count)
  try {
    const vite = await preview({
      root: frontendRoot,
      configFile: fileURLToPath(new URL('../../frontend/vite.config.ts', import.meta.url)),
      preview: { host: '127.0.0.1', port: 0, open: false, proxy: { '/api': { target: api.url } } },
    })
    try {
      const address = vite.httpServer.address()
      if (!address || typeof address === 'string') throw new Error('Missing preview port')
      const browser = await openBrowser()
      try {
        browserVersion = z.object({ product: z.string() }).parse(await browser.send('Browser.getVersion')).product
        const started = performance.now()
        await browser.send('Page.navigate', { url: 'http://127.0.0.1:' + address.port })
        await until(async () => await browser.evaluate(
          "document.querySelectorAll('[aria-labelledby=robot-list-heading] li').length === " + count,
        ) === true, 'complete fleet rendering')
        const initialRenderMs = performance.now() - started
        await delay(1500)
        assert.equal(await browser.evaluate('document.visibilityState'), 'visible')
        await browser.evaluate(`{
          window.benchmark = { frames: [], longTasks: [], previousFrame: null };
          window.benchmark.observer = new PerformanceObserver(list => {
            window.benchmark.longTasks.push(...list.getEntries().map(entry => entry.duration));
          });
          window.benchmark.observer.observe({ type: 'longtask' });
          const frame = now => {
            const state = window.benchmark;
            if (state.previousFrame !== null) state.frames.push(now - state.previousFrame);
            state.previousFrame = now;
            state.animation = requestAnimationFrame(frame);
          };
          window.benchmark.animation = requestAnimationFrame(frame);
        }`)
        const before = metricSchema.parse(await browser.send('Performance.getMetrics'))
        const requestsBefore = api.requests.robots
        const markerBefore = await browser.evaluate("document.querySelector('button[aria-label=\"Robot 0\"]').getAttribute('style')")
        const observationStarted = performance.now()
        const selectionMs = []
        // Real keyboard input selects alternating robots while polling continues.
        // Round-trip timings include CDP overhead; these are not INP measurements.
        for (let attempt = 0; attempt < 8; attempt++) {
          const name = 'Robot ' + (attempt % 2)
          await browser.evaluate('document.querySelector(' + JSON.stringify('button[aria-label="' + name + '"]') + ').focus()')
          const selectionStarted = performance.now()
          await browser.send('Input.dispatchKeyEvent', {
            type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r',
          })
          await browser.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
          const selectedName = await browser.evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() =>
            resolve(document.querySelector('#robot-details h3')?.textContent))))`)
          assert.equal(selectedName, name)
          selectionMs.push(performance.now() - selectionStarted)
          await delay(1200)
          assert.equal(await browser.evaluate('document.activeElement?.getAttribute("aria-label")'), name)
        }
        const after = metricSchema.parse(await browser.send('Performance.getMetrics'))
        const observedSeconds = (performance.now() - observationStarted) / 1000
        const telemetry = z.object({ frames: z.array(z.number()), longTasks: z.array(z.number()), nodes: z.number() })
          .parse(await browser.evaluate(`(() => {
            const state = window.benchmark;
            cancelAnimationFrame(state.animation);
            state.longTasks.push(...state.observer.takeRecords().map(entry => entry.duration));
            state.observer.disconnect();
            return { frames: state.frames, longTasks: state.longTasks, nodes: document.querySelectorAll('*').length };
          })()`))
        const metricDelta = (name: string) => {
          const start = before.metrics.find(metric => metric.name === name)?.value
          const end = after.metrics.find(metric => metric.name === name)?.value
          assert.ok(start !== undefined && end !== undefined, 'Missing browser metric: ' + name)
          return Number(((end - start) * 1000).toFixed(2))
        }
        assert.notEqual(await browser.evaluate("document.querySelector('button[aria-label=\"Robot 0\"]').getAttribute('style')"), markerBefore)
        assert.equal(await browser.evaluate('Boolean(document.querySelector("[role=alert]"))'), false)
        assert.equal(api.requests.sites, 1)
        assert.ok(api.requests.robots - requestsBefore >= 5, 'Too few live refreshes')
        assert.deepEqual(browser.exceptions, [])
        results.push({ robots: count, initialRenderMs: Number(initialRenderMs.toFixed(2)),
          observedSeconds: Number(observedSeconds.toFixed(2)), robotRequests: api.requests.robots - requestsBefore,
          domElements: telemetry.nodes, frameIntervalMs: distribution(telemetry.frames),
          longTasks: telemetry.longTasks.length, longestTaskMs: Math.max(0, ...telemetry.longTasks),
          mainThreadBusyMs: metricDelta('TaskDuration'), layoutMs: metricDelta('LayoutDuration'),
          selectionRoundTripMs: distribution(selectionMs),
        })
      } finally {
        await browser.close()
      }
    } finally {
      await vite.close()
    }
  } finally {
    await api.close()
  }
}
console.log(JSON.stringify({ environment: environment(), browser: browserVersion, results }, null, 2))
