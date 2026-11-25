"""Six-seat party schedule; each pair meets twice."""
from .game_engine import payoff, validate_h, ROUNDS

SEATS = 6
SCHEDULE = (
    ((0,5),(1,4),(2,3)),
    ((0,4),(5,3),(1,2)),
    ((0,3),(4,2),(5,1)),
    ((0,2),(3,1),(4,5)),
    ((0,1),(2,5),(3,4)),
)

def pairs(round_number):
    if type(round_number) is not int or not 1 <= round_number <= ROUNDS:
        raise ValueError("Invalid round")
    return SCHEDULE[(round_number-1)%len(SCHEDULE)]

def resolve(round_number, actions, h):
    validate_h(h)
    if set(actions) != set(range(SEATS)) or any(a not in ("C","D") for a in actions.values()):
        raise ValueError("Six valid choices required")
    return [{"seats":[a,b], "actions":[actions[a],actions[b]],
             "points":list(payoff(actions[a],actions[b],h))}
            for a,b in pairs(round_number)]
