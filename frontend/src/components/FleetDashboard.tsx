import { useCallback, useEffect, useRef, useState } from 'react'
import { FleetSummary } from './FleetSummary'
import { RobotDetails } from './RobotDetails'
import { RobotList } from './RobotList'
import { SiteView } from './SiteView'
import { useRobotUpdates } from '../hooks/useRobotUpdates'
import type { Site } from '../types/site'
import { en } from '../content/en'

export function FleetDashboard({ sites }: { sites: readonly Site[] }) {
  const warehouseSelectRef = useRef<HTMLSelectElement>(null)
  const robotListHeadingRef = useRef<HTMLHeadingElement>(null)
  const clearSelectionButtonRef = useRef<HTMLButtonElement>(null)
  const [selectedSiteId, setSelectedSiteId] = useState(sites[0]?.id ?? '')
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null)
  const selectedSite = sites.find((site) => site.id === selectedSiteId) ?? null
  const { robots: siteRobots, hasSnapshot, hasError, isLoading, isPaused, isVisible, togglePause, retry } = useRobotUpdates(selectedSite)
  const selectedRobot = siteRobots.find((robot) => robot.id === selectedRobotId) ?? null

  const retryButtonRef = useCallback((button: HTMLButtonElement | null) => {
    if (!button) return
    // Keep focus in the controls if automatic recovery removes the retry button.
    return () => {
      if (document.activeElement === button) warehouseSelectRef.current?.focus()
    }
  }, [])

  useEffect(() => {
    if (selectedRobotId === null) return

    function handleEscape(event: KeyboardEvent) {
      if (
        event.key !== 'Escape'
        || event.defaultPrevented
        || event.isComposing
        || event.target instanceof HTMLSelectElement
      ) return

      setSelectedRobotId(null)
      if (event.target === clearSelectionButtonRef.current) {
        robotListHeadingRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [selectedRobotId])

  function clearSelection() {
    setSelectedRobotId(null)
  }

  function clearSelectionFromList() {
    clearSelection()
    robotListHeadingRef.current?.focus()
  }

  function handleSiteChange(siteId: string) {
    setSelectedSiteId(siteId)
    setSelectedRobotId(null)
  }

  return (
    <>
      {(hasSnapshot || !selectedSite) && (
        <FleetSummary robots={siteRobots} siteName={selectedSite?.name ?? en.siteView.empty} />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="warehouse-select" className="text-sm font-semibold">
          {en.siteView.warehouse}
        </label>
        <select
          id="warehouse-select"
          ref={warehouseSelectRef}
          value={selectedSiteId}
          disabled={sites.length === 0}
          onChange={(event) => handleSiteChange(event.currentTarget.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        >
          {sites.length === 0 && (
            <option value="">{en.siteView.noWarehouses}</option>
          )}
          {sites.map((site) => (
            <option key={site.id} value={site.id}>{site.name}</option>
          ))}
        </select>
        <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
          <p role="status" className="text-sm text-slate-600">
            {!selectedSite ? en.siteView.empty : isPaused ? en.updates.paused
              : !isVisible ? en.updates.hidden
                : isLoading ? en.updates.loading
                  : hasError ? en.updates.delayed : en.updates.running}
          </p>
          <button
            type="button"
            onClick={togglePause}
            disabled={!selectedSite}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            {isPaused ? en.updates.resume : en.updates.pause}
          </button>
        </div>
      </div>

      {hasError && (
        <section aria-labelledby="updates-error-heading" className="rounded-xl border border-amber-300 bg-white p-5">
          <div role="alert">
            <h2 id="updates-error-heading" className="text-base font-semibold">{en.updates.errorTitle}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {isPaused ? en.updates.pausedErrorDescription
                : hasSnapshot ? en.updates.staleDescription : en.updates.errorDescription}
            </p>
          </div>
          <button
            ref={retryButtonRef}
            type="button"
            onClick={retry}
            className="mt-4 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            {en.fleetData.retry}
          </button>
        </section>
      )}

      {(hasSnapshot || !selectedSite) && (
        <div className="grid items-start gap-5 md:grid-cols-12">
          <section
            aria-labelledby="robot-list-heading"
            className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-5 md:col-span-4 xl:col-span-3"
          >
            <div className="flex min-h-10 flex-wrap items-center justify-between gap-3">
              <h2
                id="robot-list-heading"
                ref={robotListHeadingRef}
                tabIndex={-1}
                className="rounded text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              >
                {en.robotList.title}
              </h2>
              {selectedRobot && (
                <button
                  ref={clearSelectionButtonRef}
                  type="button"
                  onClick={clearSelectionFromList}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                >
                  {en.robotList.clearSelection}
                </button>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {en.robotList.description}
            </p>
            <RobotList
              robots={siteRobots}
              selectedRobotId={selectedRobotId}
              onSelectRobot={setSelectedRobotId}
            />
          </section>

          <section
            aria-labelledby="site-view-heading"
            className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-5 md:col-span-8 xl:col-span-6"
          >
            <h2 id="site-view-heading" className="text-base font-semibold">
              {en.siteView.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {en.siteView.description}
            </p>
            {selectedSite ? (
              <SiteView
                site={selectedSite}
                animate={!isPaused && isVisible && !hasError}
                robots={siteRobots}
                selectedRobotId={selectedRobotId}
                onSelectRobot={setSelectedRobotId}
                onClearSelection={clearSelection}
              />
            ) : (
              <p className="mt-5 text-sm text-slate-600">{en.siteView.empty}</p>
            )}
          </section>

          <aside
            id="robot-details"
            aria-labelledby="robot-details-heading"
            className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-5 md:col-span-12 xl:col-span-3"
          >
            <h2 id="robot-details-heading" className="text-base font-semibold">
              {en.robotDetails.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {en.robotDetails.description}
            </p>
            <RobotDetails
              robot={selectedRobot}
              siteName={selectedSite?.name ?? ''}
            />
          </aside>
        </div>
      )}
    </>
  )
}
