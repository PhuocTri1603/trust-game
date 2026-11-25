import pytest
from fastapi.testclient import TestClient
from app.main import app, rooms
from app.game_engine import payoff

@pytest.fixture(autouse=True)
def clear_rooms():
    rooms.clear()
    yield
    rooms.clear()

def test_health():
    assert TestClient(app).get("/health").json()["multiplayer_ready"]

@pytest.mark.parametrize("h", range(1, 7))
def test_create_join_and_hidden_choices(h):
    client = TestClient(app)
    a = client.post("/rooms", json={"h":h}).json()
    b = client.post("/rooms/join", json={"code": a["code"]}).json()
    assert a["h"] == b["h"] == h
    with client.websocket_connect(f'/ws/{a["code"]}?token={a["token"]}') as wa:
        assert wa.receive_json()["h"] == h
        with client.websocket_connect(f'/ws/{b["code"]}?token={b["token"]}') as wb:
            assert wa.receive_json()["players"] == 2
            assert wb.receive_json()["players"] == 2
            wa.send_json({"type":"action.submit","round_number":1,"action":"C"})
            assert wa.receive_json()["type"] == "action.ack"
            sa, sb = wa.receive_json(), wb.receive_json()
            assert sa["submitted"] and sb["opponent_submitted"]
            assert sb["history"] == [] and "a" not in sb and "b" not in sb
            wb.send_json({"type":"action.submit","round_number":1,"action":"D"})
            assert wb.receive_json()["type"] == "action.ack"
            assert wa.receive_json()["type"] == "round.result"
            assert wb.receive_json()["type"] == "round.result"
            sa, sb = wa.receive_json(), wb.receive_json()
            assert sa["scores"] == pytest.approx(payoff("C","D",h))
            assert sb["scores"] == pytest.approx(payoff("C","D",h))
            assert sa["h"] == sb["h"] == h

def test_room_full_and_h_validation():
    client = TestClient(app)
    assert client.post("/rooms",json={"h":0}).status_code == 422
    assert client.post("/rooms",json={"h":7}).status_code == 422
    a = client.post("/rooms",json={"h":4}).json()
    assert client.post("/rooms/join",json={"code":a["code"]}).status_code == 200
    assert client.post("/rooms/join",json={"code":a["code"]}).status_code == 409


def test_matchmaking_pairs_same_h_and_does_not_steal_private_room():
    client = TestClient(app)
    private = client.post("/rooms", json={"h":3}).json()
    first = client.post("/matchmaking/join", json={"h":3}).json()
    second = client.post("/matchmaking/join", json={"h":4}).json()
    partner = client.post("/matchmaking/join", json={"h":3}).json()
    assert first["seat"] == "A" and partner["seat"] == "B"
    assert first["code"] == partner["code"]
    assert first["code"] != private["code"]
    assert second["code"] != first["code"]
    assert first["token"] != partner["token"]
    assert client.post("/matchmaking/join", json={"h":0}).status_code == 422


def test_queue_cancel_and_private_join_isolation():
    client = TestClient(app)
    a = client.post("/matchmaking/join", json={"h":3}).json()
    assert client.post("/rooms/join", json={"code":a["code"]}).status_code == 409
    assert client.post("/matchmaking/cancel", json={"code":a["code"],"token":"wrong"}).status_code == 403
    assert client.post("/matchmaking/cancel", json={"code":a["code"],"token":a["token"]}).status_code == 200
    assert a["code"] not in rooms

def test_stale_queue_and_matched_cancel():
    client = TestClient(app)
    a = client.post("/matchmaking/join", json={"h":3}).json()
    rooms[a["code"]].created_at -= 301
    b = client.post("/matchmaking/join", json={"h":3}).json()
    assert a["code"] not in rooms
    assert b["seat"] == "A"
    c = client.post("/matchmaking/join", json={"h":3}).json()
    assert c["code"] == b["code"]
    assert client.post("/matchmaking/cancel", json={"code":b["code"],"token":b["token"]}).status_code == 409
