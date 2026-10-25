import { en } from '../content/en'
import type { RobotStatus as Status } from '../types/robot'

type RobotStatusProps = {
  status: Status
  variant?: 'badge' | 'marker'
}

const appearance: Record<Status, { badge: string; marker: string; icon: string }> = {
  moving: {
    badge: 'bg-teal-100 text-teal-800',
    marker: 'bg-teal-700 text-white',
    icon: 'M7 4 19 12 7 20Z',
  },
  idle: {
    badge: 'bg-slate-100 text-slate-700',
    marker: 'bg-slate-600 text-white',
    icon: 'M8 5v14M16 5v14',
  },
  charging: {
    badge: 'bg-amber-100 text-amber-800',
    marker: 'bg-amber-700 text-white',
    icon: 'm13 2-8 12h6l-1 8 9-12h-6Z',
  },
  error: {
    badge: 'bg-rose-100 text-rose-800',
    marker: 'bg-rose-700 text-white',
    icon: 'M12 4v10m0 5v1',
  },
}

export function RobotStatus({ status, variant = 'badge' }: RobotStatusProps) {
  const style = appearance[status]
  const isMarker = variant === 'marker'

  return (
    <span
      aria-hidden={isMarker ? true : undefined}
      className={isMarker
        ? 'flex size-6 items-center justify-center rounded-full border-2 border-white shadow-sm ' + style.marker
        : 'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ' + style.badge}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="size-3 shrink-0"
      >
        <path d={style.icon} />
      </svg>
      {!isMarker && en.robotStatus[status]}
    </span>
  )
}
