# Game Design — Canonical Human Axelrod–Cournot MVP

## Research basis
Vo and Luu (2026), *Economic Incentives and Behavioral Strategy Performance in an Axelrod–Cournot AI Adoption Tournament*, Section 2.1. This website collects free human decisions; it does **not** implement or reproduce the seventeen behavioral strategies or tournament results.

## Economic rules
Two human firms (Milo A and Luna B) simultaneously choose C = no AI subscription (N), shown to players as **Đồng lòng**, or D = subscribe to AI (I), shown as **Âm thầm**. These are narrative labels only; the economic actions and formula do not change. For each move:
- m = 8, d = 1, F = 10; H is an integer 1–6 selected by the host before room creation and fixed for all 10 rounds.
- x_i = 1 if D, otherwise 0.
- Payoff_i = H * (m + 2*d*x_i - d*x_j)^2 / 9 - F*x_i.
- R = 64H/9; S = 49H/9; T = 100H/9 - 10; P = 9H - 10.
- Each move represents H operating periods; F is paid once per move, not per operating period. Stage payoff is rounded to the nearest integer before recording and accumulation; this is a game adaptation, whereas the paper reports unrounded analytical values.
- H=3,4 satisfy strict PD and 2R>T+S. H=5 satisfies strict PD only. H=1,2,6 are not strict PD at this baseline.
- This is a Cournot-equilibrium payoff adapter, not a separate quantity-choice simulator.

## Human versus bot mode
A third, explicitly labeled mode lets one human control Milo (A) against Luna (B), a disclosed algorithmic opponent. The player selects one of four deterministic/simple bots before starting: Random (independent 50/50 C/D), Always Cooperate (always C), Always Defect (always D), and Tit-for-Tat (C first, then repeat the human's previous action). The bot's choice is made after the human clicks but depends only on its predefined rule and previous completed rounds, never on the human's current choice. Both choices are revealed together. The bot mode runs locally in the browser and does not use a multiplayer room or persist results. It shares the existing 10-round Cournot payoff calculation, integer rounding, H selection, and winner/loser expressions. This is a distinct human-versus-algorithm experiment, not a recreation of the manuscript's full 17-strategy tournament.

## Multiplayer behavior
Exactly two humans on different devices; six-character private room code and per-seat token. First valid decision per round is immutable; each action remains secret until both submit. Server computes both payoffs and advances the round. The server exposes the room's locked H, parameters, payoff matrix, history and cumulative scores. Refresh reconnects using the saved seat token.

## Narrative and presentation
Two competing firms decide whether to subscribe to cost-reducing AI. Tutorial explains H, subscription fee and simultaneous choices. Lobby displays the selected payoff matrix and allows H selection before creating a room. Gameplay reports profit per round and cumulative profit. Character expressions react to observed payoff comparisons: higher payoff = smug grin, lower payoff = furious expression, tie = thinking/neutral. Final character expressions compare cumulative profits. The expressions are cosmetic and do not affect choices or rewards. Final screen reports AI-use counts and all 10 round outcomes. The one-device local demo remains exploratory and does not provide independent secrecy.

## Data and limitations
The backend keeps room histories in memory only; a restart erases rooms. No database or durable research export is implemented. The prototype must **not** be presented as an approved human-subject research protocol or durable research dataset. No player demographics or identifying information are collected. Formal human-subject research requires consent, privacy safeguards, sampling and preregistered analyses as applicable.

## Source consistency note
The manuscript's Table 2.1 H=4 S and P entries conflict with its Section 2.1 formulas. This implementation follows the derived formulas (S=196/9=21.7778; P=26), consistent with later direct-match calculations.
