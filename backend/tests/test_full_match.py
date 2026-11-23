import pytest
from fastapi.testclient import TestClient
from app.main import app, rooms

@pytest.fixture(autouse=True)
def clear_rooms():
    rooms.clear()
    yield
    rooms.clear()

def test_ten_rounds_and_hidden_action():
    client = TestClient(app)
    host = client.post("/rooms").json()
    guest = client.post("/rooms/join", json={"code": host["code"]}).json()
    with client.websocket_connect(f'/ws/{host["code"]}?token={host["token"]}') as a:
        assert a.receive_json()["players"] == 2
        with client.websocket_connect(f'/ws/{guest["code"]}?token={guest["token"]}') as b:
            a.receive_json()
            b.receive_json()
            for i in range(1, 11):
                ca = "C" if i % 2 else "D"
                cb = "C" if i % 3 else "D"
                a.send_json({"type": "action.submit", "round_number": i, "action": ca})
                assert a.receive_json()["type"] == "action.ack"
                sa = a.receive_json()
                sb = b.receive_json()
                assert sa["type"] == sb["type"] == "room.state"
                assert sa["submitted"] and sb["opponent_submitted"]
                assert len(sb["history"]) == i - 1
                assert "a" not in sb and "b" not in sb
                b.send_json({"type": "action.submit", "round_number": i, "action": cb})
                assert b.receive_json()["type"] == "action.ack"
                ra = a.receive_json()
                rb = b.receive_json()
                assert ra == rb
                assert ra["type"] == "round.result"
                assert ra["round"] == i
                sa = a.receive_json()
                sb = b.receive_json()
                assert sa["scores"] == sb["scores"]
                assert len(sa["history"]) == i
                assert sa["history"] == sb["history"]
            assert sa["finished"] and sb["finished"]
            assert sa["scores"] == [26, 11]
