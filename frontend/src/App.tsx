import { useRef } from 'react'
import { FleetDashboard } from './components/FleetDashboard'
import { useSites } from './hooks/useSites'
import { en } from './content/en'
import './App.css'

function App() {
  const { state, retry } = useSites()
  const headingRef = useRef<HTMLHeadingElement>(null)

  function handleRetry() {
    retry()
    headingRef.current?.focus()
  }

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="border-b border-slate-200 pb-6">
          <p className="mb-2 text-xs font-semibold tracking-widest text-teal-700 uppercase">
            {en.dashboard.eyebrow}
          </p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="rounded text-3xl font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:text-4xl"
          >
            {en.dashboard.title}
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            {en.dashboard.description}
          </p>
        </header>

        {state.status === 'loading' && (
          <p role="status" className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
            {en.fleetData.loading}
          </p>
        )}

        {state.status === 'error' && (
          <section aria-labelledby="fleet-error-heading" className="rounded-xl border border-rose-200 bg-white p-5">
            <div role="alert">
              <h2 id="fleet-error-heading" className="text-base font-semibold">{en.fleetData.errorTitle}</h2>
              <p className="mt-2 text-sm text-slate-600">{en.fleetData.errorDescription}</p>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-4 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              {en.fleetData.retry}
            </button>
          </section>
        )}

        {state.status === 'success' && <FleetDashboard sites={state.sites} />}
      </div>
    </main>
  )
}

export default App
