from collections import Counter
import pytest
from app.party_engine import pairs, resolve
from app.game_engine import payoff

def test_schedule():
    counts = Counter()
    for r in range(1,11):
        p = pairs(r)
        assert sorted(x for pair in p for x in pair) == list(range(6))
        counts.update(tuple(sorted(pair)) for pair in p)
    assert len(counts) == 15
    assert set(counts.values()) == {2}

@pytest.mark.parametrize("h", range(1,7))
def test_payoffs(h):
    actions = {i:"C" if i%2 else "D" for i in range(6)}
    for r in range(1,11):
        for result in resolve(r,actions,h):
            a,b = result["seats"]
            assert result["points"] == list(payoff(actions[a],actions[b],h))

def test_incomplete():
    with pytest.raises(ValueError):
        resolve(1,{0:"C"},3)
