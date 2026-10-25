import { en } from '../content/en'
import { RobotStatus } from './RobotStatus'
import type { Robot } from '../types/robot'
import { batteryFormatter } from '../utils/formatters'

type RobotListProps = {
  robots: readonly Robot[]
  selectedRobotId: string | null
  onSelectRobot: (robotId: string) => void
}

export function RobotList({
  robots,
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
              className={`w-full cursor-pointer rounded-lg border p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${isSelected
                ? 'border-teal-700 bg-teal-50'
                : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <span className="flex flex-wrap items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="block font-semibold break-words">{robot.name}</span>
                  <span className="mt-1 block text-xs text-slate-600">{robot.id}</span>
                </span>
                <RobotStatus status={robot.status} />
              </span>
              <span className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
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
