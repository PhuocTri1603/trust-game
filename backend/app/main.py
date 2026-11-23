"""Single-process realtime prototype. Durable persistence is a later milestone."""
import asyncio
import secrets
import string
from dataclasses import dataclass, field
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .game_engine import payoff, ROUNDS

app = FastAPI(title="Trust Garden API", version="0.2.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "https://phuoctri1603.github.io"], allow_methods=["GET", "POST"], allow_headers=["Content-Type"])
ALPHABET = string.ascii_uppercase + string.digits

@dataclass
class Room:
    code: str
    tokens: dict = field(default_factory=dict)
    clients: dict = field(default_factory=dict)
    choices: dict = field(default_factory=dict)
    history: list = field(default_factory=list)
    round: int = 1
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)

rooms: dict[str, Room] = {}

class JoinRequest(BaseModel):
    code: str

def state(room: Room, seat: str) -> dict:
    scores = [sum(t["points"][i] for t in room.history) for i in (0, 1)]
    return {"type": "room.state", "code": room.code, "seat": seat, "players": len(room.tokens),
            "round": room.round, "total_rounds": ROUNDS, "submitted": seat in room.choices,
            "opponent_submitted": ("B" if seat == "A" else "A") in room.choices,
            "scores": scores, "history": room.history,
            "finished": len(room.history) == ROUNDS}

async def send_state(room: Room):
    for seat, ws in list(room.clients.items()):
        try:
            await ws.send_json(state(room, seat))
        except Exception:
            room.clients.pop(seat, None)

@app.get("/health")
def health():
    return {"status": "ok", "multiplayer_ready": True, "storage": "in_memory"}

@app.post("/rooms")
def create_room():
    code = "".join(secrets.choice(ALPHABET) for _ in range(6))
    while code in rooms:
        code = "".join(secrets.choice(ALPHABET) for _ in range(6))
    token = secrets.token_urlsafe(32)
    room = Room(code=code, tokens={"A": token})
    rooms[code] = room
    return {"code": code, "seat": "A", "token": token}

@app.post("/rooms/join")
def join_room(request: JoinRequest):
    room = rooms.get(request.code.strip().upper())
    if room is None:
        raise HTTPException(404, "Room not found")
    if "B" in room.tokens:
        raise HTTPException(409, "Room full")
    token = secrets.token_urlsafe(32)
    room.tokens["B"] = token
    return {"code": room.code, "seat": "B", "token": token}

@app.websocket("/ws/{code}")
async def game_socket(ws: WebSocket, code: str):
    room = rooms.get(code.upper())
    token = ws.query_params.get("token")
    seat = next((s for s, t in room.tokens.items() if secrets.compare_digest(t, token or "")), None) if room else None
    if seat is None:
        await ws.close(code=1008)
        return
    await ws.accept()
    old = room.clients.get(seat)
    if old:
        await old.close(code=4000)
    room.clients[seat] = ws
    await send_state(room)
    try:
        while True:
            msg = await ws.receive_json()
            if msg.get("type") != "action.submit":
                await ws.send_json({"type": "error", "message": "Unknown event"})
                continue
            async with room.lock:
                action = msg.get("action")
                if action not in ("C", "D") or msg.get("round_number") != room.round or len(room.tokens) < 2 or len(room.history) == ROUNDS:
                    await ws.send_json({"type": "error", "message": "Invalid action or round"})
                    continue
                if seat in room.choices:
                    await ws.send_json({"type": "action.ack", "accepted": False, "round": room.round})
                    continue
                room.choices[seat] = action
                await ws.send_json({"type": "action.ack", "accepted": True, "round": room.round})
                if len(room.choices) == 2:
                    a, b = room.choices["A"], room.choices["B"]
                    points = list(payoff(a, b))
                    result = {"round": room.round, "a": a, "b": b, "points": points}
                    room.history.append(result)
                    room.choices.clear()
                    room.round += 1
                    for client in list(room.clients.values()):
                        await client.send_json({"type": "round.result", **result})
                await send_state(room)
    except WebSocketDisconnect:
        pass
    finally:
        if room.clients.get(seat) is ws:
            room.clients.pop(seat, None)
            await send_state(room)
