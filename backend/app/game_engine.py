"""Pure, deterministic MVP payoff engine."""
PAYOFFS = {("C", "C"): (3, 3), ("C", "D"): (0, 5), ("D", "C"): (5, 0), ("D", "D"): (1, 1)}
ROUNDS = 10

def payoff(action_a: str, action_b: str) -> tuple[int, int]:
    try:
        return PAYOFFS[(action_a, action_b)]
    except KeyError as exc:
        raise ValueError("Actions must be C or D") from exc
