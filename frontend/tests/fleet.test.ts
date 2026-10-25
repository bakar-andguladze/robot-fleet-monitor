import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchRobots, fetchSites } from '../src/api/fleet'
import { mockRobots } from '../src/data/mockRobots'
import { mockSites } from '../src/data/mockSites'

const fetchMock = vi.fn<typeof fetch>()
const site = mockSites[0]
if (!site) throw new Error('Expected a warehouse fixture')
const robots = mockRobots.filter((robot) => robot.siteId === site.id)

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function pendingResponse(_path: Parameters<typeof fetch>[0], options?: Parameters<typeof fetch>[1]) {
  return new Promise<Response>((_resolve, reject) => {
    const signal = options?.signal
    if (signal?.aborted) reject(signal.reason)
    else signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
  })
}

describe('fetchSites', () => {
  it('loads warehouse layouts', async () => {
    fetchMock.mockResolvedValue(Response.json(mockSites))
    await expect(fetchSites(new AbortController().signal)).resolves.toEqual(mockSites)
    expect(fetchMock).toHaveBeenCalledWith('/api/sites', expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  it('accepts an empty warehouse list', async () => {
    fetchMock.mockResolvedValue(Response.json([]))
    await expect(fetchSites(new AbortController().signal)).resolves.toEqual([])
  })

  it.each([
    { name: 'a non-array payload', data: {} },
    { name: 'invalid dimensions', data: [{ ...site, width: 0 }] },
    { name: 'an unknown zone type', data: [{ ...site, zones: [{ id: 'zone', type: 'unknown', x: 0, y: 0, width: 10, height: 10 }] }] },
    { name: 'duplicate warehouse IDs', data: [site, site] },
  ])('rejects $name', async ({ data }) => {
    fetchMock.mockResolvedValue(Response.json(data))
    await expect(fetchSites(new AbortController().signal)).rejects.toThrow('warehouse data')
  })
})

describe('fetchRobots', () => {
  it('requests only the selected warehouse', async () => {
    fetchMock.mockResolvedValue(Response.json(robots))
    await expect(fetchRobots(site, new AbortController().signal)).resolves.toEqual(robots)
    expect(fetchMock).toHaveBeenCalledWith('/api/robots?siteId=' + site.id, expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  it('encodes warehouse IDs in the query string', async () => {
    const specialSite = { ...site, id: 'warehouse /?&' }
    fetchMock.mockResolvedValue(Response.json([]))
    await fetchRobots(specialSite, new AbortController().signal)
    expect(fetchMock).toHaveBeenCalledWith('/api/robots?siteId=warehouse%20%2F%3F%26', expect.anything())
  })

  it('accepts a warehouse with no robots', async () => {
    fetchMock.mockResolvedValue(Response.json([]))
    await expect(fetchRobots(site, new AbortController().signal)).resolves.toEqual([])
  })

  it.each([
    { name: 'an unknown status', data: [{ ...robots[0], status: 'unknown' }] },
    { name: 'invalid coordinates', data: [{ ...robots[0], position: null }] },
    { name: 'out-of-bounds positions', data: [{ ...robots[0], position: { x: site.width + 1, y: 0 } }] },
    { name: 'duplicate robot IDs', data: [robots[0], robots[0]] },
    { name: 'robots from another warehouse', data: [{ ...robots[0], siteId: 'other' }] },
  ])('rejects $name', async ({ data }) => {
    fetchMock.mockResolvedValue(Response.json(data))
    await expect(fetchRobots(site, new AbortController().signal)).rejects.toThrow('robot data')
  })
})

describe('request failures', () => {
  it.each(['sites', 'robots'])('rejects an unsuccessful %s request', async (resource) => {
    fetchMock.mockResolvedValue(new Response('Unavailable', { status: 503 }))
    const signal = new AbortController().signal
    const request = resource === 'sites' ? fetchSites(signal) : fetchRobots(site, signal)
    await expect(request).rejects.toThrow('status 503')
  })

  it('rejects network failures', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(fetchSites(new AbortController().signal)).rejects.toThrow('Failed to fetch')
  })

  it('rejects a response that is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Not the API</html>'))
    await expect(fetchSites(new AbortController().signal)).rejects.toThrow()
  })

  it('cancels requests when the caller aborts', async () => {
    fetchMock.mockImplementation(pendingResponse)
    const controller = new AbortController()
    const request = fetchRobots(site, controller.signal)
    controller.abort()
    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('bounds request duration with a ten-second timeout', async () => {
    const deadline = new AbortController()
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline.signal)
    fetchMock.mockImplementation(pendingResponse)
    const request = fetchRobots(site, new AbortController().signal)
    deadline.abort(new DOMException('Request timed out', 'TimeoutError'))
    await expect(request).rejects.toMatchObject({ name: 'TimeoutError' })
    expect(timeout).toHaveBeenCalledWith(10_000)
  })
})
