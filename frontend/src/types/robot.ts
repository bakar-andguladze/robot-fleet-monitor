export type RobotStatus = 'moving' | 'idle' | 'charging' | 'error'

export type Robot = {
  id: string
  name: string
  siteName: string
  status: RobotStatus
  batteryPercent: number
}
