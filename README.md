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
Movement is still simulated in the browser using predefined routes.
The API serves initial snapshots rather than live telemetry.

## Running the dashboard

Start the backend with `npm run dev` from `backend/`. In a second terminal, run `npm install` and `npm run dev` from `frontend/`, then open the Vite URL.

The frontend requests `/api/sites` and `/api/robots` through Vite's local proxy. By default the proxy targets `http://localhost:3000`. If the backend uses a different port, copy `frontend/.env.example` to `frontend/.env`, set `API_PROXY_TARGET` to the backend URL, and restart Vite. The same proxy works with `npm run preview` for a local build preview. A deployed build requires its host to forward `/api` to the backend.

The dashboard waits for both datasets before starting its simulation. Failed requests or invalid response data show an error with a retry button. There is no fallback to frontend fixtures. The old frontend fixtures remain as test data.

Run `npm run lint`, `npm test`, and `npm run build` in `frontend/` to check the UI.
