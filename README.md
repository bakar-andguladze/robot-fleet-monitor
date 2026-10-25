# Robot Fleet Monitor

A robot fleet monitoring project based on a take-home engineering challenge.

## Problem

Robots operate across multiple sites and report telemetry, such as battery level and position, approximately once per second.
A fleet management system receives and stores these updates, then presents the current state of the fleet and individual robots to an operator.

## Challenge overview

The system is divided into three areas:

1. **Robot simulator:** generate robot telemetry and send it to the system.
2. **Backend:** receive and store telemetry, apply business logic, and expose data through an interface for the frontend.
3. **Frontend:** display the fleet overview and details of a selected robot.

The brief leaves specific features and implementation choices open.
Choosing a useful scope, deciding which cases to handle, and making deliberate tradeoffs are part of the challenge.

## Scope

At least one area should be implemented and runnable. The remaining areas may be mocked, stubbed, or omitted.

- A frontend-focused implementation can use fixtures or mocked telemetry.
- A backend-focused implementation can simulate incoming data and omit the UI.
- Implementing all three areas is optional.

## Practical expectations

- Keep the initial effort to a few hours; further development is optional.
- Any technology or tooling may be used, including AI assistance.
- The developer should understand the implementation and be able to explain its decisions and limitations.
- Deliver the project through a repository link.
- The resulting project may be published, reused, or included in a portfolio.

## Implementation notes

As the project develops, this `README` will document:

- The implemented scope and the reasons for choosing it.
- What is mocked or omitted and the tradeoffs involved.
- Improvements that would be made with more time or for production use.

## Backend data API

The Express backend loads initial warehouse and robot snapshots from `backend/data/sites.json` and `backend/data/robots.json`.
It validates the files before listening, including IDs, warehouse references, battery levels, and coordinate bounds.
Invalid or missing data prevents startup.

From `backend/`:

```sh
npm install
npm run dev
```

The API defaults to port 3000; set `PORT` in `backend/.env` to override it.

Open [Swagger UI](http://localhost:3000/api/docs/) for endpoint descriptions, query parameters, response schemas, and interactive requests.
The [OpenAPI document](http://localhost:3000/api/openapi.json) is also available for tools such as Postman.
Response schemas are generated from the same Zod schemas used to validate fixtures; endpoint descriptions live in `backend/src/openapi.ts`.


| Endpoint | Response |
| --- | --- |
| `GET /health` | Health status |
| `GET /api/sites` | All warehouse layouts |
| `GET /api/robots` | All robots |
| `GET /api/robots?siteId=site-north` | Robots in the requested warehouse |

An empty warehouse returns `[]`. An unknown warehouse returns 404; an empty or repeated `siteId` returns 400.
Errors use `{ "error": "message" }`.
Coordinates use local schematic units.
Storage, loading, and charging zones are functional areas that robots can enter.

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` in `backend/` to check the API.
After building, `npm start` runs the compiled server.
Keep `backend/data/` alongside `backend/dist/`; fixtures are read at runtime rather than copied into the build.

The frontend loads warehouse layouts once and polls the selected warehouse for current robot snapshots.
All robot movement is simulated by the backend; the browser displays the received positions.

## Running the dashboard

Start the backend with `npm run dev` from `backend/`. In a second terminal, run `npm install` and `npm run dev` from `frontend/`, then open the Vite URL.

The frontend requests `/api/sites` and `/api/robots` through Vite's local proxy. By default the proxy targets `http://localhost:3000`. If the backend uses a different port, copy `frontend/.env.example` to `frontend/.env`, set `API_PROXY_TARGET` to the backend URL, and restart Vite. The same proxy works with `npm run preview` for a local build preview. A deployed build requires its host to forward `/api` to the backend.

Warehouse loading failures show an error with a retry button.
Robot loading and refresh failures show a connection warning and retry automatically while preserving the last valid snapshot for the selected warehouse.
Responses are checked for valid shapes, unique robot IDs, warehouse membership, and position bounds before display.
There is no fallback to frontend fixtures; the remaining frontend fixtures are test data.

Run `npm run lint`, `npm test`, and `npm run build` in `frontend/` to check the UI.


## Backend simulation

One shared simulation runs per backend process and updates robot positions, battery levels, and statuses in memory approximately once per second, whether or not a dashboard is connected.
The JSON fixtures seed the initial state; restarting the backend resets the simulation.
Only robots marked `moving` advance; idle, charging, and error robots retain their positions.
Moving robots lose 0.5 battery percentage points per second, and charging robots gain 1 point per second; these accelerated demo rates live in `backend/src/simulation/createRobotSimulator.ts`.
Idle and error robots retain their battery levels.
Battery levels remain between 0 and 100%, with fractional values kept internally and rounded for display.
At 0%, a moving robot stops at its depletion position and changes to `error` (Needs attention); it stays there until the simulation is restarted.
At 100%, a charging robot becomes `idle` and stays in place.
Battery changes use elapsed time from the initial snapshot, so delayed callbacks do not skip depletion or charging completion, and HTTP requests do not affect the rates.
Already-empty moving robots and already-full charging robots transition at startup.
There is no automatic routing to charging stations, recovery, or restart of completed robots.

Demo routes live in `backend/src/simulation/robotRoutes.ts`, with speeds in schematic units per second.
Each moving robot needs a route for its warehouse; startup rejects missing routes, invalid speeds, out-of-bounds waypoints, and zero-length paths.
Routes begin at the seeded robot position, join the configured waypoints, and loop back to that starting position.
Functional zones remain traversable; collision avoidance and obstacle routing are outside this simulation.

Route geometry is prepared once at startup, and movement uses elapsed monotonic time so delayed timer callbacks do not slow the simulated speed.
HTTP requests read the latest state without advancing the simulation or starting timers.
`GET /api/robots?siteId=site-north` returns the current North Warehouse robots, with `Cache-Control: no-store` to prevent caching old positions.
The simulation timer is cleared during server shutdown.

The simulation is independent of HTTP delivery, so a later streaming transport can reuse it.
This is an in-memory demo with read-only endpoints; real robot telemetry, private fleet data, and commands would require further validation, access control, and persistence.
Multiple backend processes would each run their own simulation; sharing state across replicas is a separate deployment concern.

## Update delivery and scaling

The frontend loads static layouts once and requests robots only for the selected warehouse.
The next refresh is scheduled one second after the previous request finishes, so slow responses do not create overlapping requests.
Requests time out after ten seconds; failed refreshes retain the last valid snapshot and show a warning while retrying.
Switching warehouses cancels the previous request, and late responses cannot replace the current warehouse data.
Polling pauses while the page is hidden and resumes immediately when it becomes visible.
The Pause updates control freezes this browser's view while the backend simulation continues; Resume updates fetches fresh data immediately.
Switching warehouses while paused loads one snapshot for the new warehouse.
Try again restarts live updates, including when updates were paused.
This keeps the initial implementation small while limiting unnecessary requests and payloads.

Polling cost depends on robot count, payload size, update frequency, and concurrent viewers; changing transport alone does not reduce the cost of repeatedly sending the same full snapshot.
If measurements justify it, Server-Sent Events could push server-to-browser updates, while batching or sending only changed records could reduce payload size.
Browser rendering should also be measured when displaying large fleets.

## Local performance checks

Repeatable checks generate fleets of 100 and 1,000 moving robots in one warehouse, without changing the demo fixtures.
They start their own loopback servers on available ports and close them when finished.
Both projects' dependencies must be installed.
Run these commands from the repository root, one at a time:

```sh
npm --prefix frontend run build
npm --prefix backend run bench:api
npm --prefix backend run bench:ui
```

The browser check uses an installed Chromium browser and a temporary profile, which it removes afterwards.
It defaults to Edge's usual Windows installation path or `/usr/bin/google-chrome` on other systems; set `BROWSER_PATH` to the executable path if needed.
It uses the frontend's existing Vite installation to serve the production build, so no browser automation package or browser download is required.
On Windows, use npm.cmd if PowerShell blocks npm.ps1.
The checks print JSON results; failed requests, incomplete fleets, missing refreshes, browser exceptions, or broken selection cause a failure, while timings have no machine-dependent pass/fail threshold.

### Method

The API check measures 2,000 simulation steps after 200 warm-up steps, then runs separate eight-second cases with 1, 10, and 50 polling viewers.
Simulation sample times stay within the first minute so the generated robots remain moving throughout the measurement.
Each viewer consumes and checks the complete response before waiting one second, matching the dashboard's request cadence.
Viewers start together, and the shared backend simulation continues independently of their requests.
Response timings include receiving and parsing the body in the load client; the client and API share a Node process, so these are local round-trip measurements rather than isolated server timings.
Body sizes and throughput count uncompressed JSON bytes, excluding HTTP headers and transport overhead.
Position precision can change the serialized body size between samples.

The browser check uses a 1440 x 1000 viewport, headless mode, disabled GPU acceleration, and no CPU or network throttling.
After initial rendering and a 1.5-second warm-up, it observes roughly ten seconds of live updates and selects alternating robots eight times using keyboard input.
It checks that movement continues, warehouse layouts load once, selection works, and keyboard focus survives subsequent updates.
It records DOM element count, animation-frame intervals, main-thread busy time, and [long tasks of at least 50 ms](https://w3c.github.io/longtasks/).
Selection timings include browser automation round trips and two animation frames; they are not INP measurements.
Initial rendering includes navigation and waiting for the complete robot list, rather than a Core Web Vitals loading metric.

### Observed baseline

This historical baseline was recorded before battery simulation and the dashboard status indicators were added; rerun the checks to measure the current implementation.
One local run on 26 October 2026 used Windows 10.0.26300, an Intel Core i7-13700H, Node 25.0.0, and Edge 156.0.4314.42.
All 976 measured API requests succeeded, and the browser checks passed for both fleet sizes.

| Robots | Simulation step p95 |
| --- | --- |
| 100 | 0.0083 ms |
| 1,000 | 0.0730 ms |

| Robots | Viewers | Requests | Response p95 | Mean body | Total body throughput |
| --- | --- | --- | --- | --- | --- |
| 100 | 1 | 8 | 2.82 ms | 13.78 KiB | 13.65 KiB/s |
| 100 | 10 | 80 | 12.02 ms | 14.13 KiB | 139.71 KiB/s |
| 100 | 50 | 400 | 31.98 ms | 14.14 KiB | 687.07 KiB/s |
| 1,000 | 1 | 8 | 6.44 ms | 141.47 KiB | 140.31 KiB/s |
| 1,000 | 10 | 80 | 22.28 ms | 144.92 KiB | 1,423.12 KiB/s |
| 1,000 | 50 | 400 | 72.48 ms | 143.50 KiB | 6,897.71 KiB/s |

| Robots | Initial rendering | DOM elements | Observation | Frame interval p95 / max | Long tasks / longest | Main-thread busy time | Selection round trip p95 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 100 | 235 ms | 1,592 | 9.92 s | 16.8 / 16.8 ms | 0 / n/a | 2.36 s | 38 ms |
| 1,000 | 489 ms | 15,092 | 10.70 s | 33.4 / 66.7 ms | 4 / 73 ms | 9.70 s | 114 ms |

In this run, simulation work was small compared with the UI work needed to display 1,000 continuously moving robots.
The current UI renders every robot in both the list and the map, and animates marker positions using `left`/`top` transitions.
The browser results justify profiling those render and animation costs before choosing an optimization, such as reducing visible list rows or changing marker animation.
At 1,000 robots and 50 viewers, full snapshots also produced about 6.7 MiB/s of JSON bodies; filtering, batching, or changed-record updates would address that cost if it becomes a deployment constraint.

These short local checks do not establish a supported fleet size or a production capacity limit.
Headless rendering with GPU acceleration disabled is not representative of every real device, and eight selection samples do not establish a user-facing latency percentile.
Network latency, compression, sustained load, multiple backend processes, and slower client devices require separate measurements.
