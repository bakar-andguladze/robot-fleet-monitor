import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchFleetData } from '../src/api/fleet'
import { mockRobots } from '../src/data/mockRobots'
import { mockSites } from '../src/data/mockSites'

const fetchMock = vi.fn<typeof fetch>()

function respondWith(sites: unknown = mockSites, robots: unknown = mockRobots) {
  fetchMock.mockResolvedValueOnce(Response.json(sites))
  fetchMock.mockResolvedValueOnce(Response.json(robots))
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => vi.unstubAllGlobals())

describe('fetchFleetData', () => {
  it('loads both datasets and passes cancellation to each request', async () => {
    respondWith()
    const controller = new AbortController()
    await expect(fetchFleetData(controller.signal)).resolves.toEqual({ sites: mockSites, robots: mockRobots })
    expect(fetchMock).toHaveBeenCalledWith('/api/sites', { signal: controller.signal })
    expect(fetchMock).toHaveBeenCalledWith('/api/robots', { signal: controller.signal })
  })

  it('accepts an empty fleet', async () => {
    respondWith([], [])
    await expect(fetchFleetData(new AbortController().signal)).resolves.toEqual({ sites: [], robots: [] })
  })

  it.each(['/api/sites', '/api/robots'])('rejects an unsuccessful %s request', async (failedPath) => {
    fetchMock.mockImplementation(async (path) => path === failedPath
      ? new Response('Service unavailable', { status: 503 })
      : Response.json(path === '/api/sites' ? mockSites : mockRobots))
    await expect(fetchFleetData(new AbortController().signal)).rejects.toThrow('status 503')
  })

  it('rejects network failures', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(fetchFleetData(new AbortController().signal)).rejects.toThrow('Failed to fetch')
  })

  it('rejects a response that is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>Not the API</html>'))
    fetchMock.mockResolvedValueOnce(Response.json(mockRobots))
    await expect(fetchFleetData(new AbortController().signal)).rejects.toThrow()
  })

  it.each([
    { name: 'a non-array payload', sites: {}, robots: mockRobots },
    { name: 'invalid warehouse dimensions', sites: [{ ...mockSites[0], width: 0 }], robots: [] },
    { name: 'an unknown zone type', sites: [{ ...mockSites[0], zones: [{ id: 'zone', type: 'unknown', x: 0, y: 0, width: 10, height: 10 }] }], robots: [] },
    { name: 'an unknown robot status', sites: mockSites, robots: [{ ...mockRobots[0], status: 'unknown' }] },
    { name: 'invalid robot coordinates', sites: mockSites, robots: [{ ...mockRobots[0], position: null }] },
    { name: 'duplicate warehouse IDs', sites: [mockSites[0], mockSites[0]], robots: [] },
    { name: 'duplicate robot IDs', sites: mockSites, robots: [mockRobots[0], mockRobots[0]] },
    { name: 'an unknown warehouse reference', sites: mockSites, robots: [{ ...mockRobots[0], siteId: 'missing' }] },
  ])('rejects $name', async ({ sites, robots }) => {
    respondWith(sites, robots)
    await expect(fetchFleetData(new AbortController().signal)).rejects.toThrow(/fleet data/)
  })

  it('cancels pending requests when aborted', async () => {
    fetchMock.mockImplementation((_path, options) => new Promise<Response>((_resolve, reject) => {
      const signal = options?.signal
      signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
    }))
    const controller = new AbortController()
    const request = fetchFleetData(controller.signal)
    controller.abort()
    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
  })
})
