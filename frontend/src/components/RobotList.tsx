import { en } from '../content/en'
import type { Robot, RobotStatus } from '../types/robot'
import { batteryFormatter } from '../utils/formatters'

type RobotListProps = {
  robots: readonly Robot[]
  siteName: string
  selectedRobotId: string | null
  onSelectRobot: (robotId: string) => void
}

const statusStyles: Record<RobotStatus, string> = {
  moving: 'bg-teal-100 text-teal-800',
  idle: 'bg-slate-100 text-slate-700',
  charging: 'bg-amber-100 text-amber-800',
  error: 'bg-rose-100 text-rose-800',
}

export function RobotList({
  robots,
  siteName,
  selectedRobotId,
  onSelectRobot,
}: RobotListProps) {
  if (robots.length === 0) {
    return (
      <p className="mt-5 text-sm text-slate-600">
        {en.robotList.empty}
      </p>
    )
  }

  return (
    <ul role="list" className="mt-5 space-y-3">
      {robots.map((robot) => {
        const isSelected = robot.id === selectedRobotId

        return (
          <li key={robot.id}>
            <button
              type="button"
              aria-pressed={isSelected}
              aria-controls="robot-details"
              onClick={() => onSelectRobot(robot.id)}
              className={`w-full cursor-pointer rounded-lg border p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${isSelected
                ? 'border-teal-700 bg-teal-50'
                : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <span className="flex flex-wrap items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="block font-semibold break-words">{robot.name}</span>
                  <span className="mt-1 block text-xs text-slate-600">{robot.id}</span>
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[robot.status]}`}
                >
                  {en.robotStatus[robot.status]}
                </span>
              </span>
              <span className="mt-3 block text-sm text-slate-600">{siteName}</span>
              <span className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium text-teal-800">
                  {isSelected ? en.robotList.selected : ''}
                </span>
                <span className="text-slate-600">
                  {en.robotFields.battery}{' '}
                  <span className="font-medium text-slate-900 tabular-nums">
                    {batteryFormatter.format(robot.batteryPercent / 100)}
                  </span>
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
