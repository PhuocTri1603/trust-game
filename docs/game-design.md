# Game Design — Canonical MVP

## Narrative
Two strangers, Milo and Luna, inherit a shared garden. Every day they independently decide to SHARE (C) or KEEP (D). Original cartoon characters and an interactive story explain reciprocity and temptation.

## User-facing story flow
1. **Opening**: meet both gardeners and learn why trust matters.
2. **Tutorial**: three short interactive story panels teach sharing, keeping and the scoring rule.
3. **Game**: ten rounds, two avatars, decisions and a simultaneous result reveal.
4. **Final reflection**: total scores, mutual cooperation count, and a ten-round action history.

The lobby remains a required future part of the online multiplayer MVP, between tutorial and game.

## Locked rules
- Exactly two human players; 10 scored rounds
- C/C: 3/3; C/D: 0/5; D/C: 5/0; D/D: 1/1
- No timer; first valid action is immutable; no action disclosure before both have committed
- Guest access with private room code; account creation is not required in MVP
- Reconnect resumes same seat; pause on disconnect; 5-minute grace period before cancellation is offered
- No cash stakes, matchmaking, AI opponents, classroom mode, or global rankings

## Implementation status
The frontend now has the four story screens and a **local two-seat demonstration on one device**. It is not online multiplayer and does not offer private independent choices between devices yet. The real backend protocol, lobby, persistence and reconnect remain pending.

## Acceptance
Two separate devices complete ten rounds with matching scores; hidden actions never leak; duplicate submissions do not alter outcomes; refresh preserves match state.
