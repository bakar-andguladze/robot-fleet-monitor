import type { Site } from '../types/site'

// Dimensions and positions use local schematic units, not real-world distances.
export const mockSite: Site = {
  name: 'North Warehouse',
  width: 800,
  height: 520,
  zones: [
    {
      id: 'north-storage',
      type: 'storage',
      x: 40,
      y: 56,
      width: 430,
      height: 244,
    },
    {
      id: 'north-loading',
      type: 'loading',
      x: 540,
      y: 56,
      width: 220,
      height: 244,
    },
    {
      id: 'north-charging',
      type: 'charging',
      x: 40,
      y: 362,
      width: 250,
      height: 114,
    },
  ],
}
