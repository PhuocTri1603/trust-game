import asyncio
import secrets
import string
import time
from dataclasses import dataclass, field
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from .game_engine import validate_h, ROUNDS
from .party_engine import pairs, resolve, SEATS

router = APIRouter(prefix="/party")
@dataclass
class PartyRoom:
    code: str
    h: int
    names: dict = field(default_factory=dict)
    tokens: dict = field(default_factory=dict)
    clients: dict = field(default_factory=dict)
    choices: dict = field(default_factory=dict)
    history: list = field(default_factory=list)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    touched: float = field(default_factory=time.monotonic)

rooms = {}
lobby_lock = asyncio.Lock()
class Create(BaseModel):
    name: str = Field(min_length=1,max_length=20)
    h: int = 3
class Join(BaseModel):
    name: str = Field(min_length=1,max_length=20)
    code: str

def add(room, name):
    name = name.strip()
    if not name:
        raise HTTPException(422,"Name required")
    seat = len(room.tokens)
    token = secrets.token_urlsafe(32)
    room.names[seat] = name
    room.tokens[seat] = token
    room.touched = time.monotonic()
    return {"code":room.code,"seat":seat,"token":token,"h":room.h}

@router.post("/rooms")
async def create(req: Create):
    try:
        validate_h(req.h)
    except ValueError as exc:
        raise HTTPException(422,str(exc)) from exc
    async with lobby_lock:
        for code,room in list(rooms.items()):
            if not room.clients and time.monotonic()-room.touched > 3600:
                del rooms[code]
        code = ''.join(secrets.choice(string.ascii_uppercase+string.digits) for _ in range(6))
        while code in rooms:
            code = ''.join(secrets.choice(string.ascii_uppercase+string.digits) for _ in range(6))
        room = PartyRoom(code,req.h)
        session = add(room,req.name)
        rooms[code] = room
        return session

@router.post("/rooms/join")
async def join(req: Join):
    async with lobby_lock:
        room = rooms.get(req.code.strip().upper())
        if room is None:
            raise HTTPException(404,"Room not found")
        async with room.lock:
            if len(room.tokens)>=SEATS:
                raise HTTPException(409,"Room full")
            session = add(room,req.name)
            await broadcast(room)
            return session

def state(room,seat):
    scores = [0]*SEATS
    for turn in room.history:
        for match in turn["matches"]:
            for i,p in zip(match["seats"],match["points"]):
                scores[i]+=p
    finished = len(room.history)==ROUNDS
    round_number = min(len(room.history)+1,ROUNDS)
    return {"type":"party.state","code":room.code,"seat":seat,"h":room.h,
            "names":[room.names.get(i) for i in range(SEATS)],
            "connected":sorted(room.clients),"submitted":sorted(room.choices),
            "round":round_number,"pairs":pairs(round_number),"scores":scores,
            "history":room.history,"finished":finished}

async def broadcast(room):
    for seat,ws in list(room.clients.items()):
        try:
            await ws.send_json(state(room,seat))
        except Exception:
            if room.clients.get(seat) is ws:
                room.clients.pop(seat,None)

@router.websocket("/ws/{code}")
async def socket(ws: WebSocket,code: str):
    room = rooms.get(code.upper())
    token = ws.query_params.get("token","")
    seat = next((i for i,t in room.tokens.items() if secrets.compare_digest(t,token)),None) if room else None
    if seat is None:
        await ws.close(code=1008)
        return
    await ws.accept()
    async with room.lock:
        if rooms.get(room.code) is not room:
            await ws.close(code=1008)
            return
        old = room.clients.get(seat)
        room.clients[seat]=ws
        if old:
            try:
                await old.close(code=4000)
            except Exception:
                pass
        await broadcast(room)
    try:
        while True:
            msg = await ws.receive_json()
            async with room.lock:
                if room.clients.get(seat) is not ws:
                    break
                r = len(room.history)+1
                if (not isinstance(msg,dict) or msg.get("type")!="action.submit"
                    or msg.get("action") not in ("C","D") or msg.get("round_number")!=r
                    or r>ROUNDS or len(room.clients)!=SEATS or seat in room.choices):
                    await ws.send_json({"type":"error","message":"Invalid action, round or room not ready"})
                    await ws.send_json(state(room,seat))
                    continue
                room.choices[seat]=msg["action"]
                if len(room.choices)==SEATS:
                    room.history.append({"round":r,"matches":resolve(r,room.choices,room.h)})
                    room.choices.clear()
                room.touched=time.monotonic()
                await broadcast(room)
    except WebSocketDisconnect:
        pass
    finally:
        async with room.lock:
            if room.clients.get(seat) is ws:
                room.clients.pop(seat,None)
                room.touched=time.monotonic()
                await broadcast(room)
