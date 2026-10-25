import { en } from '../content/en'
import type { Robot, RobotStatus } from '../types/robot'
import { countFormatter } from '../utils/formatters'

type FleetSummaryProps = {
  robots: readonly Robot[]
  siteName: string
}

const metricStyles: Record<RobotStatus | 'total', string> = {
  total: 'border-slate-900 bg-slate-900 text-white',
  moving: 'border-teal-200 bg-teal-50',
  idle: 'border-slate-200 bg-slate-50',
  charging: 'border-amber-200 bg-amber-50',
  error: 'border-rose-200 bg-rose-50',
}

const statuses: readonly RobotStatus[] = ['moving', 'idle', 'charging', 'error']

export function FleetSummary({ robots, siteName }: FleetSummaryProps) {
  const counts: Record<RobotStatus, number> = {
    moving: 0,
    idle: 0,
    charging: 0,
    error: 0,
  }
  for (const robot of robots) {
    counts[robot.status] += 1
  }

  const metrics: { key: RobotStatus | 'total'; label: string; count: number }[] = [
    { key: 'total', label: en.fleetSummary.total, count: robots.length },
    ...statuses.map((status) => ({
      key: status,
      label: en.robotStatus[status],
      count: counts[status],
    })),
  ]

  return (
    <section
      aria-labelledby="fleet-summary-heading"
      className="rounded-xl border border-slate-200 bg-white p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="fleet-summary-heading" className="text-base font-semibold">
          {en.fleetSummary.title}
        </h2>
        <p className="text-sm text-slate-600">{siteName}</p>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {metrics.map((metric) => (
          <div
            key={metric.key}
            className={`rounded-lg border p-4 ${metric.key === 'total' || metric.count > 0 ? metricStyles[metric.key] : 'border-slate-200 bg-slate-50'} ${metric.key === 'total' ? 'col-span-2 sm:col-span-1' : ''}`}
          >
            <dt className={metric.key === 'total' ? 'text-sm text-slate-300' : 'text-sm text-slate-600'}>{metric.label}</dt>
            <dd className="mt-2 text-3xl font-semibold tabular-nums">
              {countFormatter.format(metric.count)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
