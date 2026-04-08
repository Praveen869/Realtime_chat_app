from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

rooms = {}

@app.get("/")
def home():
    return {"message": "Server chal raha hai!"}

@app.get("/rooms")
def get_rooms():
    return {
        room: len(users)
        for room, users in rooms.items()
    }

@app.websocket("/ws/{room_name}/{username}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_name: str,
    username: str
):
    # Security Validation: Enforce input limits
    if len(username) > 20 or len(room_name) > 20:
        await websocket.close(code=1008)
        return

    # Security Validation: Enforce Max Room limits
    if len(rooms) >= 500 and room_name not in rooms:
        await websocket.close(code=1008)
        return

    # Security Validation: Enforce Max Users per Room
    if room_name in rooms and len(rooms[room_name]) >= 50:
        await websocket.close(code=1008)
        return

    await websocket.accept()

    if room_name not in rooms:
        rooms[room_name] = []

    user = {"ws": websocket, "username": username}
    rooms[room_name].append(user)

    # Sabko online users ki list bhejo
    await broadcast_users(room_name)

    # Join message
    await broadcast(room_name, {
        "type": "system",
        "text": f"🟢 {username} room mein aa gaya!",
    })

    try:
        while True:
            data = await websocket.receive_json()

            # Security Validation: Enforce message length
            text_payload = data.get("text", "")
            if len(text_payload) > 500:
                continue # Ignore extremely massive payloads

            now = datetime.now().strftime("%I:%M %p")

            await broadcast(room_name, {
                "type": "message",
                "username": username,
                "text": text_payload,
                "time": now,
            })

    except WebSocketDisconnect:
        rooms[room_name] = [
            u for u in rooms[room_name]
            if u["ws"] != websocket
        ]

        if len(rooms[room_name]) == 0:
            del rooms[room_name]
        else:
            await broadcast_users(room_name)
            await broadcast(room_name, {
                "type": "system",
                "text": f"🔴 {username} room se chala gaya!",
            })


async def broadcast(room_name: str, data: dict):
    if room_name not in rooms:
        return
    for user in rooms[room_name]:
        try:
            await user["ws"].send_json(data)
        except:
            pass


async def broadcast_users(room_name: str):
    if room_name not in rooms:
        return
    user_list = [u["username"] for u in rooms[room_name]]
    for user in rooms[room_name]:
        try:
            await user["ws"].send_json({
                "type": "users",
                "users": user_list,
            })
        except:
            pass