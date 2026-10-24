import { useId } from 'react'
import { en } from '../content/en'
import type { Robot } from '../types/robot'
import type { Site, SiteZoneType } from '../types/site'

type SiteViewProps = {
  site: Site
  robots: readonly Robot[]
}

const zoneStyles: Record<SiteZoneType, string> = {
  storage: 'fill-slate-200 stroke-slate-400',
  loading: 'fill-blue-50 stroke-blue-300',
  charging: 'fill-teal-50 stroke-teal-300',
}

export function SiteView({ site, robots }: SiteViewProps) {
  const titleId = useId()
  const descriptionId = useId()
  const siteRobots = robots.filter((robot) => robot.siteId === site.id)
  const robotPositions = siteRobots.map((robot) => (
    `${robot.name}: ${en.siteView.position} ${robot.position.x}, ${robot.position.y}.`
  )).join(' ')

  return (
    <figure className="mt-5">
      <figcaption className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">{site.name}</span>
        <span className="text-xs text-slate-600">{en.siteView.schematic}</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${site.width} ${site.height}`}
        role="img"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="block h-auto w-full rounded-lg border border-slate-200 bg-slate-50"
      >
        <title id={titleId}>{site.name}: {en.siteView.layout}</title>
        <desc id={descriptionId}>
          {en.siteView.mapDescription} {robotPositions}
        </desc>
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
        {siteRobots.map((robot) => (
          <g
            key={robot.id}
            transform={`translate(${robot.position.x} ${robot.position.y})`}
          >
            <circle r="12" className="fill-teal-700 stroke-white" strokeWidth="3" />
            <text
              y="-22"
              textAnchor="middle"
              paintOrder="stroke"
              strokeWidth="5"
              strokeLinejoin="round"
              className="fill-slate-900 stroke-white text-[18px] font-semibold"
            >
              {robot.name}
            </text>
          </g>
        ))}
      </svg>
      <p className="mt-3 text-xs text-slate-600">{en.siteView.mockPositions}</p>
    </figure>
  )
}
