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

The frontend loads initial warehouse and robot data from the API.
The API now serves current simulated positions.
The frontend still starts its local demo simulation from the fetched state; consuming backend updates continuously is the next integration step.

## Running the dashboard

Start the backend with `npm run dev` from `backend/`. In a second terminal, run `npm install` and `npm run dev` from `frontend/`, then open the Vite URL.

The frontend requests `/api/sites` and `/api/robots` through Vite's local proxy. By default the proxy targets `http://localhost:3000`. If the backend uses a different port, copy `frontend/.env.example` to `frontend/.env`, set `API_PROXY_TARGET` to the backend URL, and restart Vite. The same proxy works with `npm run preview` for a local build preview. A deployed build requires its host to forward `/api` to the backend.

The dashboard waits for both datasets before starting its simulation. Failed requests or invalid response data show an error with a retry button. There is no fallback to frontend fixtures. The old frontend fixtures remain as test data.

Run `npm run lint`, `npm test`, and `npm run build` in `frontend/` to check the UI.


## Backend simulation

One shared simulation runs per backend process and updates robot positions in memory approximately once per second, whether or not a dashboard is connected.
The JSON fixtures seed the initial state; restarting the backend resets the simulation.
Only robots marked `moving` advance; idle, charging, and error robots retain their positions.
Battery levels and statuses remain fixed in this increment.

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

The planned frontend integration uses polling once per second for the selected warehouse, loads static layouts once, and avoids overlapping requests.
Polling will pause while the page is hidden and resume with fresh data when it becomes visible.
This keeps the initial implementation small while limiting unnecessary requests and payloads.

Polling cost depends on robot count, payload size, update frequency, and concurrent viewers; changing transport alone does not reduce the cost of repeatedly sending the same full snapshot.
If measurements justify it, Server-Sent Events could push server-to-browser updates, while batching or sending only changed records could reduce payload size.
Browser rendering should also be measured when displaying large fleets.

No fleet-size or concurrent-viewer performance limit has been established yet.
Before choosing further optimizations, measure simulation time, endpoint latency, transferred bytes, and browser responsiveness with a larger generated fleet and multiple viewers.
