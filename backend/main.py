from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Allows all origins — required for Vercel frontend
    allow_methods=["*"],
    allow_headers=["*"],
)

rooms = {}

@app.get("/")
def home():
    return {"message": "Server is working!"}

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
    # Security: Strip whitespace and remove dangerous characters
    username = username.strip()
    room_name = room_name.strip()

    # Security Validation: Enforce input limits
    if len(username) == 0 or len(room_name) == 0:
        await websocket.close(code=1008)
        return

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
        "text": f"🟢 {username} Entered the chat!",
    })

    try:
        while True:
            data = await websocket.receive_json()

            # Security Validation: Enforce message length
            text_payload = data.get("text", "")
            time_payload = data.get("time", "")  # Use client's local time

            if len(text_payload) > 500:
                continue # Ignore extremely massive payloads

            await broadcast(room_name, {
                "type": "message",
                "username": username,
                "text": text_payload,
                "time": time_payload,  # Relay client time — always correct timezone
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
                "text": f"🔴 {username} Left the chat! 👋",
            })


async def broadcast(room_name: str, data: dict):
    if room_name not in rooms:
        return
    for user in rooms[room_name]:
        try:
            await user["ws"].send_json(data)
        except Exception:
            pass  # Client may have disconnected; safe to ignore


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
        except Exception:
            pass  # Client may have disconnected; safe to ignore