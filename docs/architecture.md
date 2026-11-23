# Architecture — Canonical MVP

## Implemented prototype
- Frontend: React/TypeScript/Vite, GitHub Pages.
- Backend: FastAPI with `POST /rooms`, `POST /rooms/join`, `GET /health`, `WS /ws/{code}?token=...`.
- A random guest seat token identifies A or B. The server calculates payoff and never reveals a choice until both players submit.
- Repeated submissions are rejected; each seat can submit only once per round. `room.state` and `round.result` synchronize clients.
- Reconnect using same token while the same backend process remains alive.
- CORS restricts HTTP frontend origins.

## Critical limitations before public multiplayer release
- Rooms and history are **in-memory**, not PostgreSQL. Restarting the server loses rooms; multiple workers would create inconsistent games. Deploy exactly one worker for prototype.
- Room join concurrency, session expiration, persistent reconnect, abuse limits, authenticated WebSocket origin checks, and five-minute grace-period cancellation require hardening.
- Do not treat guest tokens as account login; they are short-lived bearer credentials. Avoid production logging of WebSocket query strings.
- GitHub Pages hosts frontend only; deploy backend separately with HTTPS/WSS and set `VITE_API_URL` at build time.
- This milestone is an end-to-end **prototype**, not a production-grade realtime service.

## Locked rules
Ten rounds, simultaneous hidden actions C/D, payoff C/C=3/3, C/D=0/5, D/C=5/0, D/D=1/1.
