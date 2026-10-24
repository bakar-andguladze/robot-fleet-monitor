export const en = {
  dashboard: {
    eyebrow: 'Fleet operations',
    title: 'Robot Fleet Monitor',
    description: 'Monitor your robots across sites.',
  },
  fleetSummary: {
    title: 'Fleet summary',
    placeholder: 'Fleet summary placeholder',
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
    layout: 'Warehouse layout',
    schematic: 'Schematic - not to scale',
    mapDescription: 'Static floor plan with storage, loading, and charging areas. Robot positions use local schematic units measured from the top-left corner.',
    position: 'Position',
    mockPositions: 'Mock positions for this warehouse. Select a robot from the fleet list to view its details.',
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
