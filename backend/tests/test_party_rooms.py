from contextlib import ExitStack
from fastapi.testclient import TestClient
from app.main import app
from app.party_rooms import rooms
from app.party_engine import resolve

def test_party_full_match():
    rooms.clear()
    with TestClient(app) as client:
        host=client.post("/party/rooms",json={"name":"A","h":3}).json()
        code=host["code"]
        sessions=[host]+[client.post("/party/rooms/join",json={"name":str(i),"code":code}).json() for i in range(1,6)]
        assert client.post("/party/rooms/join",json={"name":"extra","code":code}).status_code==409
        assert len({s["token"] for s in sessions})==6
        with ExitStack() as stack:
            sockets=[]
            for s in sessions:
                sockets.append(stack.enter_context(client.websocket_connect("/party/ws/"+code+"?token="+s["token"])))
                for ws in sockets:
                    assert ws.receive_json()["type"]=="party.state"
            scores=[0]*6
            for r in range(1,11):
                actions={i:"C" if i%2 else "D" for i in range(6)}
                for i,ws in enumerate(sockets):
                    ws.send_json({"type":"action.submit","round_number":r,"action":actions[i]})
                    states=[peer.receive_json() for peer in sockets]
                    if i<5:
                        assert all(len(s["history"])==r-1 and len(s["submitted"])==i+1 for s in states)
                    else:
                        expected=resolve(r,actions,3)
                        for match in expected:
                            for seat,points in zip(match["seats"],match["points"]):
                                scores[seat]+=points
                        assert all(s["history"][-1]["matches"]==expected and s["scores"]==scores for s in states)
            assert all(s["finished"] for s in states)
    rooms.clear()
