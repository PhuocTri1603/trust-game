# Multiplayer deployment — MVP

## Backend (Render)
1. Open Render Dashboard > New > Blueprint.
2. Connect the public GitHub repository `PhuocTri1603/trust-game`.
3. Select `render.yaml` and create the `trust-garden-api` web service.
4. Wait for the health check to pass, then visit `https://<your-render-host>/health`.
5. Verify the response includes `"status":"ok"` and `"storage":"in_memory"`.

The free plan, if available to your account, may sleep when idle; the first request may take longer. The in-memory prototype requires **one worker and one instance**. Restart/redeploy loses rooms.

## GitHub Pages configuration
1. Copy the HTTPS Render service base URL (no trailing slash).
2. GitHub repository > Settings > Secrets and variables > Actions > Variables.
3. Add repository variable `VITE_API_URL` with the URL, e.g. `https://trust-garden-api.example.com` (example only).
4. Actions > Deploy GitHub Pages > Run workflow on main.
5. Visit `https://phuoctri1603.github.io/trust-game/`. The browser will connect over WSS derived from the HTTPS base URL.

Do not add `/health` to `VITE_API_URL`. This is a **public URL**, not a secret.

## Two-device acceptance test
- Open the GitHub Pages site on two separate devices/browsers.
- Complete the introduction and tutorial on both.
- A creates a room and shares the six-character code; B joins.
- A submits Share; B must only see that A submitted, not the actual choice.
- B submits Keep; both see the same revealed actions and 0/5 payoff.
- Continue through ten rounds and verify identical history and cumulative scores.
- Refresh a browser and verify it reconnects using the saved seat token while the backend process is alive.

## Limitations
- No PostgreSQL yet; a restart clears rooms, tokens and history.
- Do not treat this prototype as production ready or use it for sensitive research participants.
- Automated tests run in one Python process and do not prove deployment or cross-device Internet connectivity.
