"""Cournot AI-subscription stage payoff from manuscript Section 2.1."""
M = 8
D = 1
F = 10
ROUNDS = 10
H_MIN, H_MAX = 1, 6

def validate_h(h: int) -> int:
    if type(h) is not int or not H_MIN <= h <= H_MAX:
        raise ValueError("H must be an integer from 1 to 6")
    return h

def payoff(a: str, b: str, h: int = 3) -> tuple[int, int]:
    validate_h(h)
    if a not in ("C", "D") or b not in ("C", "D"):
        raise ValueError("Actions must be C (no AI) or D (AI)")
    x, y = int(a == "D"), int(b == "D")
    return (round(h * (M + 2 * D * x - D * y) ** 2 / 9 - F * x),
            round(h * (M + 2 * D * y - D * x) ** 2 / 9 - F * y))

def matrix(h: int) -> dict:
    validate_h(h)
    return {a + b: list(payoff(a, b, h)) for a, b in
            (("C", "C"), ("C", "D"), ("D", "C"), ("D", "D"))}
