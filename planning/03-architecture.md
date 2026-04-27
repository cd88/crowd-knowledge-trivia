# 03 — Architecture

## Baseline stack

- Node.js
- Express
- MongoDB / Mongoose
- Server-rendered HTML or lightweight client app
- Minimal client-side JavaScript
- Optional WebSocket layer only for host display / timer sync if polling feels bad

## Realtime recommendation

Start with **stateless 1-second polling** for player clients.

Use endpoint responses that include:

- session version
- current phase
- current question id
- timer state
- player/team state relevant to the requester
- any aggregate results currently visible

Avoid each client polling many endpoints. Every client should call one compact state endpoint:

```txt
GET /api/session/:joinCode/state?sinceVersion=123
```

The server returns either:

```json
{
  "changed": false,
  "serverTime": "2026-04-27T20:00:00.000Z",
  "nextPollMs": 1000
}
```

or:

```json
{
  "changed": true,
  "version": 124,
  "serverTime": "2026-04-27T20:00:00.000Z",
  "nextPollMs": 1000,
  "session": {},
  "team": {},
  "player": {},
  "question": {},
  "visibleAggregates": {}
}
```

## Polling protection

To avoid accidental self-DDoS:

- Use one polling endpoint per client.
- Use `sinceVersion` to avoid returning full state when nothing changed.
- Add jitter on the client: poll every `900–1300ms`, not exactly every 1000ms.
- Let the server return `nextPollMs` so it can slow clients during pre-game or intermission.
- Use phase-sensitive polling:
  - pre-game waiting: 3000–5000ms
  - countdown/question active: 1000ms
  - answer reveal: 1000ms
  - end-game dashboard: 3000ms
- Apply simple IP/session rate limiting.
- Keep payloads small.
- Do not recalculate heavy aggregates on every poll.

## Aggregate computation strategy

When a player submits or locks an answer, update a lightweight aggregate snapshot for that question.

Do **not** recompute every aggregate from scratch on every GET request.

Suggested pattern:

- writes mutate canonical submission records
- writes trigger aggregate snapshot update
- reads return the latest aggregate snapshot

Prototype can keep aggregate recomputation simple, but it should happen on submission/write events, not on polling reads.

## Stateless-ish session strategy

The app can be mostly stateless at the server instance level if all durable state lives in MongoDB.

Avoid in-memory session-critical state unless it is a cache.

Use:

- signed cookies for host/player tokens
- Mongo records for session/team/player state
- session `version` integer for polling change detection
- aggregate snapshots for read performance
- TTL cleanup for abandoned draft/test sessions

Timer should be derived from stored timestamps, not a server process countdown.

Example:

```txt
remainingMs = durationMs - (now - phaseStartedAt - accumulatedPausedMs)
```

This makes timers survive server restart and avoids needing one interval per session.

## Host display strategy

Host TV can use the same polling endpoint but with a host-display view.

```txt
GET /api/session/:joinCode/host-display-state?sinceVersion=123
```

The host display does not need member-private data.

Optional later:

Use WebSockets only for host display and host control events. Keep player clients on polling.

## Security / abuse basics

Prototype basics:

- random join codes
- random team invite codes
- signed player token cookie
- signed host token cookie
- rate limit polling and writes
- validate phase before accepting actions
- validate team role before leader actions
- sanitize display names and team names
- cap team/player/session sizes
- cap answer length

No account system required for first prototype.
