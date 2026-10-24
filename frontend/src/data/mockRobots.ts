import type { Robot } from '../types/robot'

export const mockRobots: Robot[] = [
  {
    id: 'RBT-001',
    name: 'T-800',
    siteName: 'North Warehouse',
    status: 'moving',
    batteryPercent: 84,
  },
  {
    id: 'RBT-002',
    name: 'T-1000',
    siteName: 'North Warehouse',
    status: 'idle',
    batteryPercent: 62,
  },
  {
    id: 'RBT-003',
    name: 'Grendizer',
    siteName: 'South Warehouse',
    status: 'charging',
    batteryPercent: 27,
  },
  {
    id: 'RBT-004',
    name: 'Iron Giant',
    siteName: 'South Warehouse',
    status: 'error',
    batteryPercent: 18,
  },
  {
    id: 'RBT-005',
    name: 'R2-D2',
    siteName: 'South Warehouse',
    status: 'moving',
    batteryPercent: 73,
  },
  {
    id: 'RBT-006',
    name: 'C-3PO',
    siteName: 'South Warehouse',
    status: 'idle',
    batteryPercent: 91,
  },
  {
    id: 'RBT-007',
    name: 'WALL-E',
    siteName: 'North Warehouse',
    status: 'moving',
    batteryPercent: 46,
  },
]
