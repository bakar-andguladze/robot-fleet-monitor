import { useState } from 'react'
import { FleetSummary } from './components/FleetSummary'
import { RobotDetails } from './components/RobotDetails'
import { RobotList } from './components/RobotList'
import { SiteView } from './components/SiteView'
import { useRobotSimulation } from './hooks/useRobotSimulation'
import { mockSites } from './data/mockSites'
import { en } from './content/en'
import './App.css'

function App() {
  const { robots, isPaused, togglePause } = useRobotSimulation()
  const [selectedSiteId, setSelectedSiteId] = useState(mockSites[0]?.id ?? '')
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null)
  const selectedSite = mockSites.find((site) => site.id === selectedSiteId) ?? null
  const siteRobots = robots.filter((robot) => robot.siteId === selectedSiteId)
  const selectedRobot = siteRobots.find((robot) => robot.id === selectedRobotId) ?? null

  function handleSiteChange(siteId: string) {
    setSelectedSiteId(siteId)
    setSelectedRobotId(null)
  }

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="border-b border-slate-200 pb-6">
          <p className="mb-2 text-xs font-semibold tracking-widest text-teal-700 uppercase">
            {en.dashboard.eyebrow}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {en.dashboard.title}
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            {en.dashboard.description}
          </p>
        </header>

        <FleetSummary
          robots={siteRobots}
          siteName={selectedSite?.name ?? en.siteView.empty}
        />

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="warehouse-select" className="text-sm font-semibold">
            {en.siteView.warehouse}
          </label>
          <select
            id="warehouse-select"
            value={selectedSiteId}
            disabled={mockSites.length === 0}
            onChange={(event) => handleSiteChange(event.currentTarget.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            {mockSites.length === 0 && (
              <option value="">{en.siteView.noWarehouses}</option>
            )}
            {mockSites.map((site) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
          <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
            <p role="status" className="text-sm text-slate-600">
              {isPaused ? en.simulation.paused : en.simulation.running}
            </p>
            <button
              type="button"
              onClick={togglePause}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              {isPaused ? en.simulation.resume : en.simulation.pause}
            </button>
          </div>
        </div>

        <div className="grid items-stretch gap-5 lg:grid-cols-12">
          <section
            aria-labelledby="robot-list-heading"
            className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-5 lg:col-span-3"
          >
            <h2 id="robot-list-heading" className="text-base font-semibold">
              {en.robotList.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {en.robotList.description}
            </p>
            <RobotList
              robots={siteRobots}
              siteName={selectedSite?.name ?? ''}
              selectedRobotId={selectedRobotId}
              onSelectRobot={setSelectedRobotId}
            />
          </section>

          <section
            aria-labelledby="site-view-heading"
            className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-5 lg:col-span-6"
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
                animate={!isPaused}
                robots={siteRobots}
                selectedRobotId={selectedRobotId}
                onSelectRobot={setSelectedRobotId}
              />
            ) : (
              <p className="mt-5 text-sm text-slate-600">{en.siteView.empty}</p>
            )}
          </section>

          <aside
            id="robot-details"
            aria-labelledby="robot-details-heading"
            className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-5 lg:col-span-3"
          >
            <h2 id="robot-details-heading" className="text-base font-semibold">
              {en.robotDetails.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {en.robotDetails.description}
            </p>
            <RobotDetails robot={selectedRobot} siteName={selectedSite?.name ?? ''} />
          </aside>
        </div>
      </div>
    </main>
  )
}

export default App
