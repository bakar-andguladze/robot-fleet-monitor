# Application flow

In Docker, Nginx serves React and forwards API requests to Express; the diagram shows those forwarded requests directly for readability. Express and the simulator share one Node.js process.

## Startup and live updates

```mermaid
sequenceDiagram
    participant UI as React dashboard
    participant API as Express + simulator

    Note over API: Startup: read and validate JSON seed files,<br/>then prepare routes and charging cycles.
    Note over API: One shared simulation updates position,<br/>battery and status about once per second.

    UI->>API: GET /api/sites
    API-->>UI: Warehouse layouts
    UI->>UI: Validate layouts and select a warehouse

    loop Visible tab with live updates enabled
        UI->>API: GET /api/robots?siteId=selectedSiteId
        API->>API: Read latest snapshot for this warehouse
        API-->>UI: Robot positions, battery and status
        alt Valid response
            UI->>UI: Update map, list and robot details
        else Failed request or invalid data
            UI->>UI: Keep last snapshot and show warning
        end
        Note over UI: Wait one second after the request finishes,<br/>then poll again. Requests do not overlap.
    end

    Note over UI: Warehouse switch: cancel old polling,<br/>clear selection and fetch the new site.<br/>Late responses from the old site are ignored.
    Note over UI: Selecting a robot stays local.<br/>Pause or hidden tab cancels polling.<br/>Resuming live updates fetches fresh data.
    Note over API: Simulation continues independently of polling.<br/>State stays in memory and resets on restart.
```

Requests never overlap within a polling session. Switching warehouses while paused fetches one snapshot for the new warehouse and stays paused. A hidden tab makes no requests. Seed files are read at startup; simulation changes stay in memory and reset when the backend restarts.

## Automatic charging

This is a simulated cycle for a robot with a work route and a reachable charging area. The simulator calculates these phases from elapsed time; there are no commands sent to physical robots or charging services.

```mermaid
sequenceDiagram
    participant Sim as In-process simulator
    participant Fleet as Shared in-memory fleet
    participant UI as React dashboard

    loop Approximately every second
        Sim->>Sim: Determine phase from elapsed time
        alt Working
            Sim->>Sim: Follow work route and drain battery
            Note over Sim: At 20% or less, start travelling to a charging area.
        else Travelling to charger
            Sim->>Sim: Move toward charging area and drain battery
            Note over Sim: Status stays moving until arrival, then becomes charging.
        else Charging
            Sim->>Sim: Stay in place and increase battery
            Note over Sim: At 100%, start moving back to the work route.
        end
        Sim->>Fleet: Publish position, battery and status
    end
    Note over Fleet,UI: UI polling runs independently of simulation ticks.
    UI->>Fleet: Read latest snapshot through the API
    Fleet-->>UI: Current robot state
```

Moving drains 0.5 battery percentage points per second; charging restores 1 percentage point per second. Robots seeded as idle or error stay unchanged. A charging robot without a work route becomes idle when full. A moving robot that runs out of battery before reaching a charger becomes an error; charging areas have no capacity limits or queues.
