import type { Robot } from '../types/robot'
import type { Site } from '../types/site'

type RobotMarkerProps = {
  robot: Robot
  site: Site
  isSelected: boolean
  onSelectRobot: (robotId: string) => void
}

export function RobotMarker({
  robot,
  site,
  isSelected,
  onSelectRobot,
}: RobotMarkerProps) {
  return (
    <button
      type="button"
      aria-label={robot.name}
      aria-pressed={isSelected}
      aria-controls="robot-details"
      onClick={() => onSelectRobot(robot.id)}
      style={{
        left: `${(robot.position.x / site.width) * 100}%`,
        top: `${(robot.position.y / site.height) * 100}%`,
      }}
      className="absolute flex size-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
    >
      <span
        aria-hidden="true"
        className={`flex size-5 items-center justify-center rounded-full border-2 border-white bg-teal-700 text-xs font-bold text-white shadow-sm ${isSelected ? 'ring-2 ring-teal-800 ring-offset-2' : ''}`}
      >
        {isSelected ? '✓' : ''}
      </span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 rounded bg-white/90 px-1 text-xs leading-5 font-semibold whitespace-nowrap text-slate-900">
        {robot.name}
      </span>
    </button>
  )
}
