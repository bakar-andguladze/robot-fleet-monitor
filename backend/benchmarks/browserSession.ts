import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { z } from 'zod'
import { delay } from './fixture.js'

export async function until(check: () => Promise<boolean>, description: string) {
  const deadline = performance.now() + 30_000
  while (performance.now() < deadline) {
    if (await check()) return
    await delay(50)
  }
  throw new Error('Timed out waiting for ' + description)
}

// A small CDP client keeps this optional local check free of browser downloads.
export async function openBrowser() {
  const executable = process.env.BROWSER_PATH ?? (process.platform === 'win32'
    ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
    : '/usr/bin/google-chrome')
  await access(executable).catch(() => {
    throw new Error('Set BROWSER_PATH to an installed Chromium browser executable')
  })
  const tempRoot = resolve(tmpdir())
  const profile = await mkdtemp(join(tempRoot, 'fleet-benchmark-'))
  const browser = spawn(executable, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
    '--user-data-dir=' + profile, 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' })
  // Observe launch failures immediately, including before the debugger is ready.
  let launchError: Error | undefined
  browser.on('error', (error) => { launchError = error })
  const exited = once(browser, 'exit').catch(() => undefined)
  let socket: WebSocket | undefined
  let nextId = 0
  const pending = new Map<number, {
    resolve: (value: unknown) => void
    reject: (error: Error) => void
    timer: ReturnType<typeof setTimeout>
  }>()
  const exceptions: unknown[] = []
  async function close() {
    for (const entry of pending.values()) {
      clearTimeout(entry.timer)
      entry.reject(new Error('Browser session closed'))
    }
    pending.clear()
    socket?.close()
    if (browser.exitCode === null && browser.pid) browser.kill()
    await exited
    // Only remove this run's uniquely named temporary browser profile.
    assert.equal(dirname(resolve(profile)), tempRoot)
    assert.ok(basename(profile).startsWith('fleet-benchmark-'))
    await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
  }
  try {
    let port = ''
    await until(async () => {
      if (launchError) throw launchError
      if (browser.exitCode !== null) throw new Error('Browser exited before its debugger was ready')
      try {
        port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]?.trim() ?? ''
        return /^\d+$/.test(port)
      } catch { return false }
    }, 'browser debugger')
    const response = await fetch('http://127.0.0.1:' + port + '/json/new?about:blank', {
      method: 'PUT', signal: AbortSignal.timeout(10_000),
    })
    const target = z.object({ webSocketDebuggerUrl: z.string().url() }).parse(await response.json())
    const connection = new WebSocket(target.webSocketDebuggerUrl)
    socket = connection
    connection.addEventListener('message', (event) => {
      if (typeof event.data !== 'string') return
      const message = z.object({ id: z.number().optional(), method: z.string().optional(),
        error: z.unknown().optional(), result: z.unknown().optional(), params: z.unknown().optional(),
      }).parse(JSON.parse(event.data))
      if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params)
      if (message.id === undefined) return
      const entry = pending.get(message.id)
      if (!entry) return
      clearTimeout(entry.timer)
      pending.delete(message.id)
      if (message.error) entry.reject(new Error(JSON.stringify(message.error)))
      else entry.resolve(message.result)
    })
    await Promise.race([
      new Promise<void>((resolve, reject) => {
        connection.addEventListener('open', () => resolve(), { once: true })
        connection.addEventListener('error', () => reject(new Error('Browser connection failed')), { once: true })
      }),
      delay(10_000).then(() => { throw new Error('Browser connection timed out') }),
    ])
    function send(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
      return new Promise((resolve, reject) => {
        const id = ++nextId
        const timer = setTimeout(() => {
          pending.delete(id)
          reject(new Error('Browser command timed out: ' + method))
        }, 15_000)
        pending.set(id, { resolve, reject, timer })
        connection.send(JSON.stringify({ id, method, params }))
      })
    }
    async function evaluate(expression: string) {
      const result = z.object({ exceptionDetails: z.unknown().optional(),
        result: z.object({ value: z.unknown().optional() }),
      }).parse(await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }))
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
      return result.result.value
    }
    await send('Runtime.enable')
    await send('Page.enable')
    await send('Performance.enable')
    await send('Page.bringToFront')
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
    return { send, evaluate, close, exceptions }
  } catch (error) {
    await close()
    throw error
  }
}
