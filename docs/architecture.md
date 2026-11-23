# Architecture — Canonical MVP

- Frontend: React + TypeScript + Vite, deployed to GitHub Pages at `/trust-game/`.
- Backend: Python FastAPI, hosted separately on an HTTPS/WSS-capable service.
- Database: PostgreSQL for durable rooms, seat ownership, actions and results.
- Authentication: opaque guest session token per seat; never trust player identity or scores sent by the browser.
- WebSocket events: `room.join`, `room.state`, `game.start`, `action.submit`, `action.ack`, `round.result`, `game.finished`.
- Submission: `{match_id, round_number, action, request_id}`; server validates token, room, round, and action. A unique `(match_id, round_number, seat)` constraint and transaction enforce first-write-wins.
- Only broadcast the `submitted` flag until both actions are committed; then atomically compute and publish results.
- On reconnect, authenticate seat and fetch authoritative snapshot; never replay hidden opponent actions.
- CORS and allowed WebSocket origins must be limited to configured frontend origins in deployment.
- No secrets in GitHub Pages or repository; deploy credentials are GitHub Actions secrets.

This scaffold does not implement the realtime server or persistence yet. These are milestones, not completed features.
