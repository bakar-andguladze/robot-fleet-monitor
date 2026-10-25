import { en } from '../content/en'
import { RobotStatus } from './RobotStatus'
import type { Robot } from '../types/robot'
import type { Site } from '../types/site'

type RobotMarkerProps = {
  robot: Robot
  site: Site
  isSelected: boolean
  animate: boolean
  onSelectRobot: (robotId: string) => void
}

export function RobotMarker({
  robot,
  site,
  isSelected,
  animate,
  onSelectRobot,
}: RobotMarkerProps) {
  const namePosition = robot.position.y < site.height / 3 ? 'top-full' : 'bottom-full'

  return (
    <button
      type="button"
      aria-label={robot.name}
      title={en.robotStatus[robot.status]}
      aria-pressed={isSelected}
      aria-controls="robot-details"
      onClick={() => onSelectRobot(robot.id)}
      style={{
        left: `${(robot.position.x / site.width) * 100}%`,
        top: `${(robot.position.y / site.height) * 100}%`,
      }}
      className={`absolute flex size-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full transition-none hover:z-20 focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${isSelected ? 'z-10' : ''} ${animate ? 'motion-safe:transition-[left,top] motion-safe:duration-1000 motion-safe:ease-linear' : ''}`}
    >
      <span className={isSelected ? 'rounded-full ring-2 ring-teal-800 ring-offset-2' : ''}>
        <RobotStatus status={robot.status} variant="marker" />
      </span>
      <span className={`absolute ${namePosition} left-1/2 -translate-x-1/2 rounded bg-white/90 px-1 text-xs leading-5 font-semibold whitespace-nowrap text-slate-900`}>
        {robot.name}
      </span>
    </button>
  )
}
