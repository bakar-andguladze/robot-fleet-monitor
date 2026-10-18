# Robot Fleet Monitor

A robot fleet monitoring project based on a take-home engineering challenge.

## Problem

Robots operate across multiple sites and report telemetry, such as battery level
and position, approximately once per second. A fleet management system receives
and stores these updates, then presents the current state of the fleet and
individual robots to an operator.

## Challenge overview

The system is divided into three areas:

1. **Robot simulator:** generate robot telemetry and send it to the system.
2. **Backend:** receive and store telemetry, apply business logic, and expose
   data through an interface for the frontend.
3. **Frontend:** display the fleet overview and details of a selected robot.

The brief leaves specific features and implementation choices open. Choosing a
useful scope, deciding which cases to handle, and making deliberate tradeoffs
are part of the challenge.

## Scope

At least one area should be implemented and runnable. The remaining areas may
be mocked, stubbed, or omitted.

- A frontend-focused implementation can use fixtures or mocked telemetry.
- A backend-focused implementation can simulate incoming data and omit the UI.
- Implementing all three areas is optional.

## Practical expectations

- Keep the initial effort to a few hours; further development is optional.
- Any technology or tooling may be used, including AI assistance.
- The developer should understand the implementation and be able to explain
  its decisions and limitations.
- Deliver the project through a repository link.
- The resulting project may be published, reused, or included in a portfolio.

## Implementation notes

As the project develops, this `README` will document:

- The implemented scope and the reasons for choosing it.
- What is mocked or omitted and the tradeoffs involved.
- Improvements that would be made with more time or for production use.
