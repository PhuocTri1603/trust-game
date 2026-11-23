import pytest
from app.game_engine import payoff, ROUNDS

@pytest.mark.parametrize("a,b,expected", [("C", "C", (3, 3)), ("C", "D", (0, 5)), ("D", "C", (5, 0)), ("D", "D", (1, 1))])
def test_payoffs(a, b, expected):
    assert payoff(a, b) == expected

def test_invalid_action():
    with pytest.raises(ValueError):
        payoff("X", "C")

def test_rounds():
    assert ROUNDS == 10
