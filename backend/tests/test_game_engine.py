import pytest
from app.game_engine import payoff, matrix, ROUNDS, validate_h

@pytest.mark.parametrize("h", range(1, 7))
def test_all_four_states(h):
    assert payoff("C", "C", h) == (round(64*h/9), round(64*h/9))
    assert payoff("C", "D", h) == (round(49*h/9), round(100*h/9-10))
    assert payoff("D", "C", h) == (round(100*h/9-10), round(49*h/9))
    assert payoff("D", "D", h) == (9*h-10, 9*h-10)
    assert len(matrix(h)) == 4

@pytest.mark.parametrize("h", [0, 7, 3.5, "3", True])
def test_invalid_h(h):
    with pytest.raises(ValueError):
        validate_h(h)

def test_invalid_action():
    with pytest.raises(ValueError):
        payoff("X", "C")

def test_rounds():
    assert ROUNDS == 10
