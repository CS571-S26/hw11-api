# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

- **Build:** `npm run build` (compiles TypeScript to `dist/`)
- **Dev:** `npm run dev` (TypeScript watch + nodemon on `dist/index.js`)
- **Start:** `npm start` (runs compiled `dist/index.js`)
- **Lint:** `npm run lint` (ESLint on `src/`)
- **Type-check only:** `npx tsc --noEmit`
- **Docker build:** `docker build . -t ctnelson1997/cs571-s26-hw11-ai-api`

## Architecture

This is an Express API that proxies requests to Azure-hosted GPT-4o Mini. It runs on port 58111 and is part of the CS571 course infrastructure (`@cs571/api-framework`).

### Single unified endpoint: `POST /completions`

All AI functionality is served through one route. The request body is always a JSON object with:
- `messages` (required) — array of `{role, content}` chat objects
- `response_schema` (optional) — JSON Schema object; when present, the response is structured JSON instead of `{msg: string}`

The route handles: message validation, content length checks, DB logging, OpenAI API call construction, and response formatting. Schema preparation (`prepareSchema`) recursively adds `additionalProperties: false` and `required` arrays to make schemas strict-compatible with OpenAI.

### Config system

Two config interfaces extend the framework defaults:
- `HW11PublicConfig` — `IS_REMOTELY_HOSTED` (enables DB logging), `MAX_INPUT_LENGTH` (content length cap)
- `HW11SecretConfig` — Azure OpenAI credentials (`AI_COMPLETIONS_URL`, `AI_COMPLETIONS_SECRET`, `AI_COMPLETIONS_MAX_RESPONSE`), MySQL connection params

Config files are loaded from paths set by env vars `CS571_PUBLIC_CONFIG_PATH` and `CS571_PRIVATE_CONFIG_PATH`. Dev configs are `config.dev.public` / `config.dev.secret` in the repo root.

### Database logging

`CS571HW11DbConnector` logs all message exchanges to a MySQL `BadgerLogs` table via Sequelize. Logging is conditional — only runs when `IS_REMOTELY_HOSTED` is true (production). In dev, the connector is a no-op.

### Route pattern

Routes implement `CS571Route` from the framework (with `addRoute(app)` and `getRouteName()`). They receive the DB connector and both config objects via constructor injection. Routes are registered in `index.ts` via `appBundle.router.addRoutes([...])`.
