import pytest
from fastapi.testclient import TestClient
from app.main import app, rooms
from app.game_engine import payoff, ROUNDS

@pytest.fixture(autouse=True)
def clear_rooms():
    rooms.clear()
    yield
    rooms.clear()

def test_ten_rounds_and_hidden_action():
    client = TestClient(app)
    host = client.post("/rooms",json={"h":4}).json()
    guest = client.post("/rooms/join",json={"code":host["code"]}).json()
    totals = [0.0,0.0]
    with client.websocket_connect(f'/ws/{host["code"]}?token={host["token"]}') as a:
        assert a.receive_json()["players"] == 2
        with client.websocket_connect(f'/ws/{guest["code"]}?token={guest["token"]}') as b:
            a.receive_json()
            b.receive_json()
            for i in range(1, ROUNDS+1):
                ca = "C" if i%2 else "D"
                cb = "C" if i%3 else "D"
                a.send_json({"type":"action.submit","round_number":i,"action":ca})
                assert a.receive_json()["type"] == "action.ack"
                sa,sb = a.receive_json(),b.receive_json()
                assert sa["type"] == sb["type"] == "room.state"
                assert sa["submitted"] and sb["opponent_submitted"]
                assert len(sb["history"]) == i-1
                assert "a" not in sb and "b" not in sb
                b.send_json({"type":"action.submit","round_number":i,"action":cb})
                assert b.receive_json()["type"] == "action.ack"
                ra,rb = a.receive_json(),b.receive_json()
                assert ra == rb and ra["type"] == "round.result"
                expected = payoff(ca,cb,4)
                assert ra["points"] == pytest.approx(expected)
                totals = [totals[j]+expected[j] for j in (0,1)]
                sa,sb = a.receive_json(),b.receive_json()
                assert sa["scores"] == pytest.approx(totals)
                assert sa["history"] == sb["history"]
                assert len(sa["history"]) == i
            assert sa["finished"] and sb["finished"]
            assert sa["h"] == sb["h"] == 4
