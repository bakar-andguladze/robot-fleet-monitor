import { en } from '../content/en'
import type { Robot, RobotStatus } from '../types/robot'

type RobotListProps = {
  robots: readonly Robot[]
}

const statusStyles: Record<RobotStatus, string> = {
  moving: 'bg-teal-100 text-teal-800',
  idle: 'bg-slate-100 text-slate-700',
  charging: 'bg-amber-100 text-amber-800',
  error: 'bg-rose-100 text-rose-800',
}

const batteryFormatter = new Intl.NumberFormat('en', {
  style: 'percent',
  maximumFractionDigits: 0,
})

export function RobotList({ robots }: RobotListProps) {
  if (robots.length === 0) {
    return (
      <p className="mt-5 text-sm text-slate-600">
        {en.robotList.empty}
      </p>
    )
  }

  return (
    <ul role="list" className="mt-5 space-y-3">
      {robots.map((robot) => (
        <li key={robot.id} className="rounded-lg border border-slate-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold break-words">{robot.name}</h3>
              <p className="mt-1 text-xs text-slate-600">{robot.id}</p>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[robot.status]}`}
            >
              {en.robotStatus[robot.status]}
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-600">{robot.siteName}</p>
          <dl className="mt-3 flex items-center justify-between gap-2 text-sm">
            <dt className="text-slate-600">{en.robotList.battery}</dt>
            <dd className="font-medium tabular-nums">
              {batteryFormatter.format(robot.batteryPercent / 100)}
            </dd>
          </dl>
        </li>
      ))}
    </ul>
  )
}
