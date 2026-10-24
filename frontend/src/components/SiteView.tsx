import { useId } from 'react'
import { en } from '../content/en'
import type { Robot } from '../types/robot'
import type { Site, SiteZoneType } from '../types/site'
import { RobotMarker } from './RobotMarker'

type SiteViewProps = {
  site: Site
  robots: readonly Robot[]
  selectedRobotId: string | null
  onSelectRobot: (robotId: string) => void
}

const zoneStyles: Record<SiteZoneType, string> = {
  storage: 'fill-slate-200 stroke-slate-400',
  loading: 'fill-blue-50 stroke-blue-300',
  charging: 'fill-teal-50 stroke-teal-300',
}

export function SiteView({
  site,
  robots,
  selectedRobotId,
  onSelectRobot,
}: SiteViewProps) {
  const titleId = useId()
  const descriptionId = useId()
  const siteRobots = robots.filter((robot) => robot.siteId === site.id)
  const robotPositions = siteRobots.map((robot) => (
    `${robot.name}: ${en.siteView.position} ${robot.position.x}, ${robot.position.y}.`
  )).join(' ')

  return (
    <figure className="mt-5">
      <figcaption className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span id={titleId} className="text-sm font-semibold">{site.name}</span>
        <span className="text-xs text-slate-600">{en.siteView.schematic}</span>
      </figcaption>
      <p id={descriptionId} className="sr-only">
        {en.siteView.mapDescription} {robotPositions}
      </p>
      <div
        role="group"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative"
      >
        <svg
          viewBox={`0 0 ${site.width} ${site.height}`}
          aria-hidden="true"
          className="block h-auto w-full rounded-lg border border-slate-200 bg-slate-50"
        >
          <rect
            x="12"
            y="12"
            width={site.width - 24}
            height={site.height - 24}
            rx="12"
            className="fill-white stroke-slate-300"
            strokeWidth="2"
          />
          {site.zones.map((zone) => (
            <g key={zone.id}>
              <rect
                x={zone.x}
                y={zone.y}
                width={zone.width}
                height={zone.height}
                rx="8"
                className={zoneStyles[zone.type]}
                strokeWidth="2"
              />
              <text
                x={zone.x + 16}
                y={zone.y + 30}
                className="fill-slate-700 text-[18px] font-semibold"
              >
                {en.siteView.zones[zone.type]}
              </text>
            </g>
          ))}
        </svg>
        {siteRobots.map((robot) => (
          <RobotMarker
            key={robot.id}
            robot={robot}
            site={site}
            isSelected={robot.id === selectedRobotId}
            onSelectRobot={onSelectRobot}
          />
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-600">{en.siteView.mockPositions}</p>
    </figure>
  )
}
