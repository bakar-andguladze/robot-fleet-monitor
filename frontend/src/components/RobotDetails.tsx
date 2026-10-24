import { en } from '../content/en'
import type { Robot } from '../types/robot'
import { batteryFormatter, coordinateFormatter } from '../utils/formatters'

type RobotDetailsProps = {
  robot: Robot | null
  siteName: string
}

export function RobotDetails({ robot, siteName }: RobotDetailsProps) {
  return (
    <div className="mt-5">
      <p role="status" className="sr-only">
        {robot ? `${en.robotDetails.selected}: ${robot.name}` : en.robotDetails.notSelected}
      </p>
      {robot ? (
        <>
          <h3 className="text-xl font-semibold break-words">{robot.name}</h3>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-slate-600">{en.robotFields.id}</dt>
              <dd className="mt-1 font-medium">{robot.id}</dd>
            </div>
            <div>
              <dt className="text-slate-600">{en.robotFields.site}</dt>
              <dd className="mt-1 font-medium">{siteName}</dd>
            </div>
            <div>
              <dt className="text-slate-600">{en.robotFields.status}</dt>
              <dd className="mt-1 font-medium">{en.robotStatus[robot.status]}</dd>
            </div>
            <div>
              <dt className="text-slate-600">{en.robotFields.battery}</dt>
              <dd className="mt-1 font-medium tabular-nums">
                {batteryFormatter.format(robot.batteryPercent / 100)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-600">{en.robotFields.position}</dt>
              <dd className="mt-1 font-medium tabular-nums">
                {coordinateFormatter.format(robot.position.x)}, {coordinateFormatter.format(robot.position.y)}
              </dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="text-sm text-slate-600">{en.robotDetails.empty}</p>
      )}
    </div>
  )
}
