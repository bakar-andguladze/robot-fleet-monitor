export const en = {
  dashboard: {
    eyebrow: 'Fleet operations',
    title: 'Robot Fleet Monitor',
    description: 'Monitor your robots across sites.',
  },
  fleetSummary: {
    title: 'Fleet summary',
    total: 'Total robots',
  },
  simulation: {
    running: 'Simulation running',
    paused: 'Simulation paused',
    pause: 'Pause simulation',
    resume: 'Resume simulation',
  },
  robotList: {
    title: 'Robots',
    description: 'Browse the fleet.',
    selected: 'Selected',
    empty: 'No robots to display.',
  },
  robotFields: {
    id: 'Robot ID',
    site: 'Warehouse',
    status: 'Status',
    battery: 'Battery',
    position: 'Position (schematic units)',
  },
  robotStatus: {
    moving: 'Moving',
    idle: 'Idle',
    charging: 'Charging',
    error: 'Needs attention',
  },
  siteView: {
    title: 'Site view',
    warehouse: 'Warehouse',
    noWarehouses: 'No warehouses available.',
    empty: 'No warehouse selected.',
    description: 'Site layout and robot positions.',
    schematic: 'Schematic - not to scale',
    mapDescription: 'Warehouse floor plan with storage, loading, and charging areas. Use Tab to focus robots and Enter or Space to select them. Robot positions use local schematic units measured from the top-left corner.',
    mockPositions: 'Simulated positions update once per second. Select a robot on the map or in the fleet list to view its details.',
    zones: {
      storage: 'Storage',
      loading: 'Loading',
      charging: 'Charging',
    },
  },
  robotDetails: {
    title: 'Robot details',
    description: 'A closer look at a selected robot.',
    empty: 'Select a robot to view its details.',
    selected: 'Selected robot',
  },
} as const
