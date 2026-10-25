# Performance checks

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

## Method

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

## Observed baseline

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
