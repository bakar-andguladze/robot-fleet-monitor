import { useState } from 'react'
import { RobotDetails } from './components/RobotDetails'
import { RobotList } from './components/RobotList'
import { SiteView } from './components/SiteView'
import { mockRobots } from './data/mockRobots'
import { mockSite } from './data/mockSite'
import { en } from './content/en'
import './App.css'

function App() {
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null)
  const selectedRobot = mockRobots.find((robot) => robot.id === selectedRobotId) ?? null

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

        <section
          aria-labelledby="fleet-summary-heading"
          className="rounded-xl border border-slate-200 bg-white p-5"
        >
          <h2 id="fleet-summary-heading" className="text-base font-semibold">
            {en.fleetSummary.title}
          </h2>
          <div className="mt-4 flex min-h-24 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6">
            <p className="text-center text-sm text-slate-500">
              {en.fleetSummary.placeholder}
            </p>
          </div>
        </section>

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
              robots={mockRobots}
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
            <SiteView site={mockSite} robots={mockRobots} />
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
            <RobotDetails robot={selectedRobot} />
          </aside>
        </div>
      </div>
    </main>
  )
}

export default App
