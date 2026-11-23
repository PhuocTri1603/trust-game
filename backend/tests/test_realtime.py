import pytest
from fastapi.testclient import TestClient
from app.main import app, rooms

@pytest.fixture(autouse=True)
def clear_rooms():
    rooms.clear()
    yield
    rooms.clear()

def test_health():
    assert TestClient(app).get("/health").json()["multiplayer_ready"]

def test_create_join_and_hidden_choices():
    client = TestClient(app)
    a = client.post("/rooms").json()
    b = client.post("/rooms/join", json={"code": a["code"]}).json()
    with client.websocket_connect(f'/ws/{a["code"]}?token={a["token"]}') as wa:
        assert wa.receive_json()["type"] == "room.state"
        with client.websocket_connect(f'/ws/{b["code"]}?token={b["token"]}') as wb:
            assert wa.receive_json()["players"] == 2
            assert wb.receive_json()["players"] == 2
            wa.send_json({"type": "action.submit", "round_number": 1, "action": "C"})
            assert wa.receive_json()["type"] == "action.ack"
            state_a = wa.receive_json()
            state_b = wb.receive_json()
            assert state_a["submitted"] is True
            assert state_b["opponent_submitted"] is True
            assert state_b["history"] == []
            wb.send_json({"type": "action.submit", "round_number": 1, "action": "D"})
            assert wb.receive_json()["type"] == "action.ack"
            assert wa.receive_json()["type"] == "round.result"
            assert wb.receive_json()["type"] == "round.result"
            assert wa.receive_json()["scores"] == [0, 5]
            assert wb.receive_json()["scores"] == [0, 5]

def test_room_full():
    client = TestClient(app)
    a = client.post("/rooms").json()
    assert client.post("/rooms/join", json={"code": a["code"]}).status_code == 200
    assert client.post("/rooms/join", json={"code": a["code"]}).status_code == 409
