import pytest
from app.game_engine import payoff, matrix, ROUNDS, validate_h

@pytest.mark.parametrize("h", range(1, 7))
def test_all_four_states(h):
    assert payoff("C", "C", h) == pytest.approx((64*h/9, 64*h/9))
    assert payoff("C", "D", h) == pytest.approx((49*h/9, 100*h/9-10))
    assert payoff("D", "C", h) == pytest.approx((100*h/9-10, 49*h/9))
    assert payoff("D", "D", h) == pytest.approx((9*h-10, 9*h-10))
    assert len(matrix(h)) == 4

@pytest.mark.parametrize("h", [0, 7, 3.5, "3", True])
def test_invalid_h(h):
    with pytest.raises(ValueError):
        validate_h(h)

def test_invalid_action():
    with pytest.raises(ValueError):
        payoff("X", "C")

def test_rounds():
    assert ROUNDS == 200
