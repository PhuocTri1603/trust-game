# The Trust Garden

An original, story-driven repeated Prisoner's Dilemma game for two online human players.

## MVP scope
Two players, private room code, 10 rounds, simultaneous hidden choices, payoff rules, reconnect, round history, and a final reflection. Original artwork and narrative.

**Current status:** starter scaffold. Realtime multiplayer and database persistence are not implemented yet.

## Development
- Frontend: `cd frontend && npm install && npm run dev`
- Backend: `cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload`
- Tests: `cd backend && pytest -q`

The frontend is deployed to GitHub Pages. Realtime multiplayer requires a separately hosted HTTPS/WSS backend and database.

See `docs/game-design.md`, `docs/architecture.md`, `docs/roadmap.md`.
