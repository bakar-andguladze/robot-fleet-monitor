import { useEffect, useState } from 'react'
import { fetchFleetData } from '../api/fleet'
import type { FleetData } from '../types/fleet'

type FleetDataState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; data: FleetData }

export function useFleetData() {
  const [state, setState] = useState<FleetDataState>({ status: 'loading' })
  const [requestId, setRequestId] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    fetchFleetData(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: 'success', data })
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
