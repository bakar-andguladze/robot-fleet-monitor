import { useEffect, useState } from 'react'
import { fetchSites } from '../api/fleet'
import type { Site } from '../types/site'

type SitesState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; sites: readonly Site[] }

export function useSites() {
  const [state, setState] = useState<SitesState>({ status: 'loading' })
  const [requestId, setRequestId] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    fetchSites(controller.signal)
      .then((sites) => {
        if (!controller.signal.aborted) setState({ status: 'success', sites })
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ status: 'error' })
          controller.abort()
        }
      })

    return () => controller.abort()
  }, [requestId])

  function retry() {
    setState({ status: 'loading' })
    setRequestId((id) => id + 1)
  }

  return { state, retry }
}
