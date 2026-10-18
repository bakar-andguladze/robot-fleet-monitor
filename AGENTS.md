# Agent instructions

These instructions apply throughout this repository.

## Project layout

- frontend/: React, TypeScript, and Vite; commit scope: ui.
- backend/: Express and TypeScript; commit scope: api.
- Both applications use npm and ESLint.

## Workflow and scope

- Work in small, agreed steps. Each step must be reviewed by the developer before proceeding to the next.
- Prefer increments the developer can comfortably review and understand.
  Group related changes into coherent steps rather than splitting by file.
- Start with minimal working behavior. Use skeletons and placeholders
  when useful, then extend and refactor as the feature develops.
- Adjust step size to the complexity and uncertainty of the work.
- Approval applies only to the agreed step. Do not treat permission to start as permission to implement the entire application.
- If requirements, scope, or a consequential decision are unclear, ask the
  developer before implementing. Do not invent requirements.
- Check existing code and recorded decisions before asking for information
  that is already available.
- Keep unrelated changes out of the current step.
- After completing a step, summarize the changes and verification results,
  suggest a commit message when appropriate, and stop for review.

## Commands and dependencies

- Provide scaffolding, installation, and cleanup commands for the developer
  to run unless explicitly asked to execute them.
- Do not introduce dependencies or architectural changes outside the agreed scope.
- Keep package.json and package-lock.json consistent when dependencies change.
- Never include local secrets or generated dependencies in source control.

## Git and commits

- Never create commits. All commits must be made by a human developer.
- Do not stage, push, rewrite history, or discard changes unless the developer explicitly requests that action.
- Read-only Git inspection is allowed.
- Keep changes focused enough for a coherent commit.
- Suggest messages using Conventional Commits: 
  type(scope): description.
- Use ui for frontend changes and api for backend changes. 
  Omit the scope for repository-wide changes.
- Use chore for scaffolding and maintenance, feat for features, and fix for bugs.
  Other applicable types include docs, refactor, test, build, and ci.
- When multiple commit types fit, suggest options and let the developer choose.

Examples:
    chore(ui): initialize React app via Vite
    chore(api): initialize Express TypeScript backend
    chore: configure repository ignore rules

## Code quality

- Follow the existing TypeScript and ESLint configuration.
- Prefer readable code and introduce abstractions when they solve a current need.
- Use descriptive names and keep functions and modules focused on clear responsibilities.
- Follow existing patterns before introducing new ones.
- Treat untrusted data as unknown until it has been validated and narrowed.
- Do not use any, type assertions, or error suppressions merely to bypass checks.
  Document necessary exceptions and keep them narrowly scoped.

## Security

- Validate external input on the backend. Frontend validation does not replace
  server-side validation.
- Do not log secrets or include them in client responses.
- Return appropriate client errors without exposing stack traces or internal
  implementation details.

## Configuration

- When adding or changing configuration, keep environment examples, startup
  validation, and relevant documentation consistent.

## Verification

- Verify changes with the checks relevant to the affected code.
- frontend/: npm run lint and npm run build.
- backend/: npm run lint and npm run build; npm run typecheck checks types
  without generating output.
- Add tests when behavior warrants them; do not add a test framework without
  agreeing on it first.
- Test observable behavior, including meaningful failure cases.
- Avoid tests that merely mirror implementation details.
- Report which checks actually ran and any failures or verification limits.
- On Windows PowerShell, use npm.cmd if npm.ps1 is blocked by execution policy.

## Decisions to define

These are open topics, not implementation instructions. Update this section
as decisions are agreed.

- Product scope: initial features, acceptance criteria, and deferred work.
- UI conventions: styling approach, accessibility expectations, and formatting.
- API conventions: endpoints, payloads, and validation rules.
- Data: simulator behavior, storage needs, and update transport.
- Testing: frameworks and the most valuable scenarios to cover.
