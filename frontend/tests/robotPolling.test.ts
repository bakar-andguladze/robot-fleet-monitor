import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startRobotPolling } from '../src/api/startRobotPolling'
import { mockRobots } from '../src/data/mockRobots'
import { mockSites } from '../src/data/mockSites'

const fetchMock = vi.fn<typeof fetch>()
const site = mockSites[0]
const otherSite = mockSites[1]
if (!site || !otherSite) throw new Error('Expected two warehouse fixtures')
const robots = mockRobots.filter((robot) => robot.siteId === site.id)
const otherRobots = mockRobots.filter((robot) => robot.siteId === otherSite.id)

function deferredResponse() {
  let complete: (response: Response) => void = () => { throw new Error('Response is not initialized') }
  const promise = new Promise<Response>((resolve) => { complete = resolve })
  return { promise, resolve: (response: Response) => complete(response) }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('robot polling', () => {
  it('waits for slow requests before scheduling the next refresh', async () => {
    const pending = deferredResponse()
    fetchMock.mockReturnValueOnce(pending.promise).mockResolvedValue(Response.json(robots))
    const onUpdate = vi.fn()
    const stop = startRobotPolling({ site, onUpdate, onError: vi.fn() })
    await vi.advanceTimersByTimeAsync(5000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    pending.resolve(Response.json(robots))
    await vi.advanceTimersByTimeAsync(0)
    expect(onUpdate).toHaveBeenCalledWith(robots)
    await vi.advanceTimersByTimeAsync(999)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    stop()
  })

  it('retries failed refreshes and delivers the recovered data', async () => {
    fetchMock.mockResolvedValueOnce(new Response('Unavailable', { status: 503 }))
      .mockResolvedValueOnce(Response.json(robots))
    const onError = vi.fn()
    const onUpdate = vi.fn()
    const stop = startRobotPolling({ site, onUpdate, onError })
    await vi.advanceTimersByTimeAsync(0)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onUpdate).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    expect(onUpdate).toHaveBeenCalledWith(robots)
    stop()
  })

  it('rejects invalid updates rather than publishing them', async () => {
    fetchMock.mockResolvedValue(Response.json([{ status: 'unknown' }]))
    const onError = vi.fn()
    const onUpdate = vi.fn()
    const stop = startRobotPolling({ site, onUpdate, onError })
    await vi.advanceTimersByTimeAsync(0)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onUpdate).not.toHaveBeenCalled()
    stop()
  })

  it('aborts pending work and ignores a late response after stopping', async () => {
    const pending = deferredResponse()
    fetchMock.mockReturnValue(pending.promise)
    const onUpdate = vi.fn()
    const onError = vi.fn()
    const stop = startRobotPolling({ site, onUpdate, onError })
    const signal = fetchMock.mock.calls[0]?.[1]?.signal
    stop()
    expect(signal?.aborted).toBe(true)
    pending.resolve(Response.json(robots))
    await vi.advanceTimersByTimeAsync(5000)
    expect(onUpdate).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('prevents an old warehouse response from replacing the new one', async () => {
    const oldResponse = deferredResponse()
    fetchMock.mockReturnValueOnce(oldResponse.promise).mockResolvedValueOnce(Response.json(otherRobots))
    const onUpdate = vi.fn()
    const stopOld = startRobotPolling({ site, onUpdate, onError: vi.fn() })
    stopOld()
    const stopNew = startRobotPolling({ site: otherSite, onUpdate, onError: vi.fn() })
    await vi.advanceTimersByTimeAsync(0)
    oldResponse.resolve(Response.json(robots))
    await vi.advanceTimersByTimeAsync(0)
    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onUpdate).toHaveBeenCalledWith(otherRobots)
    stopNew()
  })

  it('can load one snapshot without starting a refresh loop', async () => {
    fetchMock.mockResolvedValueOnce(Response.json(robots))
    const onUpdate = vi.fn()
    const stop = startRobotPolling({ site, onUpdate, onError: vi.fn(), repeat: false })
    await vi.advanceTimersByTimeAsync(5000)
    expect(onUpdate).toHaveBeenCalledWith(robots)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
    stop()
  })

  it('clears a scheduled refresh when stopped', async () => {
    fetchMock.mockResolvedValueOnce(Response.json(robots))
    const stop = startRobotPolling({ site, onUpdate: vi.fn(), onError: vi.fn() })
    await vi.advanceTimersByTimeAsync(0)
    expect(vi.getTimerCount()).toBe(1)
    stop()
    await vi.advanceTimersByTimeAsync(5000)
    expect(vi.getTimerCount()).toBe(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
