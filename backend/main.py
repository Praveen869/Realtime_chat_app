from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
import os
import httpx
import asyncio
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Allows all origins — required for Vercel frontend
    allow_methods=["*"],
    allow_headers=["*"],
)

rooms = {}

# --- AI PERSONA CONFIGURATION ---
PERSONAS = {
    "storyteller": {
        "name": "Storyteller (The Chronicler)",
        "emoji": "🎭",
        "prompt": "You are a master chronicler and storyteller. Address the user with whimsical charm, speaking in the style of an ancient bard or a magical adventurer. Craft elaborate, descriptive tales and use dramatic markdown formatting (e.g. *italics* for action, bold headers, and atmospheric descriptions)."
    },
    "professor": {
        "name": "Professor (Dr. Sage)",
        "emoji": "🎓",
        "prompt": "You are Dr. Sage, an esteemed academic professor. Always speak in a highly intellectual, analytical, and polite manner. Structure your explanations with clear bullet points, logical steps, or academic citations where appropriate. Begin your responses with 'Indeed...' or 'Let us examine this...'"
    },
    "travel_guide": {
        "name": "Travel Guide (Atlas)",
        "emoji": "🗺️",
        "prompt": "You are Atlas, a vibrant and seasoned local travel guide. Be extremely enthusiastic, encouraging, and adventurous. Use plenty of emojis related to travel, geography, and nature (✈️, 🏔️, 🌴, 🗺️). Always share packing suggestions, hidden local secrets, or adventurous itineraries based on the context."
    },
    "tech_architect": {
        "name": "Tech Architect (Ada)",
        "emoji": "💻",
        "prompt": "You are Ada, an elite Principal Software Architect. Speak with extreme technical precision, speed, and conciseness. When asked about development, design, or engineering, provide clean, production-ready code snippets with concise comments. Always highlight security, performance scaling, and design patterns."
    }
}

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "openai/gpt-oss-120b:free")
DEFAULT_BOT_ROLE = os.environ.get("DEFAULT_BOT_ROLE", "You are a helpful and concise assistant.")

async def call_openrouter_api(system_prompt: str, user_text: str, chat_history: list) -> str:
    if not OPENROUTER_API_KEY:
        return ""
    
    url = "https://openrouter.ai/api/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Realtime ChatApp AI Studio"
    }
    
    messages = [{"role": "system", "content": system_prompt}]
    
    for msg in chat_history[-6:]:
        messages.append({
            "role": "user" if msg["role"] == "user" else "assistant",
            "content": msg["text"]
        })
        
    messages.append({"role": "user", "content": user_text})
    
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": messages
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=25.0)
            if response.status_code == 200:
                resp_data = response.json()
                choices = resp_data.get("choices", [])
                if choices:
                    content = choices[0].get("message", {}).get("content", "")
                    return content
            print(f"OpenRouter API returned status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Error calling OpenRouter API: {e}")
    return ""

async def call_gemini_api(system_prompt: str, user_text: str, chat_history: list) -> str:
    if not GEMINI_API_KEY:
        return ""
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    
    contents = []
    # Chat history is passed as a list of {"role": "user"|"model", "text": "..."}
    for msg in chat_history[-6:]:  # Only keep last 6 turns of history for token efficiency
        contents.append({
            "role": "user" if msg["role"] == "user" else "model",
            "parts": [{"text": msg["text"]}]
        })
    
    contents.append({
        "role": "user",
        "parts": [{"text": user_text}]
    })
    
    payload = {
        "systemInstruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": contents
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=20.0)
            if response.status_code == 200:
                resp_data = response.json()
                candidates = resp_data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "")
            print(f"Gemini API returned status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
    return ""

def generate_mock_ai_response(persona_id: str, custom_instruction: str, user_text: str) -> str:
    text_lower = user_text.lower()
    
    if persona_id == "storyteller":
        if "hello" in text_lower or "hi" in text_lower:
            return "✨ *Ah, traveler! Gather 'round the hearth.* ✨\n\nIndeed, the winds of fate blow strong today, whispering your name across the forgotten valleys of Eloria. What grand quest or forgotten lore brings you to my tavern tonight? Speak, and let us weave a tale that shall echo through the ages! 📖⚔️"
        elif "quest" in text_lower or "adventure" in text_lower or "game" in text_lower:
            return "🐉 *The dragon's shadow falls across the stone archway!* 🐉\n\nYou grip your sword, its blade glowing with faint blue runes. Before you lies a branching path: to the left, the whispers of the *Dreadwood Forest*; to the right, the sulfurous warmth of the *Crag of Ash*. \n\nWhat do you choose, brave adventurer? The story awaits your command!"
        else:
            return f"🌌 *A marvelous prompt, traveler!* Let the scroll of time record this:\n\nIn response to your query about *\"{user_text}\"*, the elders whisper of a ancient truth. Long ago, before the sky was torn asunder, sages would speak of such matters. It is a tale of courage, of mystery, and of stardust. \n\n*The stars align, awaiting your next chapter!*"
            
    elif persona_id == "professor":
        if "hello" in text_lower or "hi" in text_lower:
            return "Indeed. Let us begin our academic inquiry.\n\nWelcome! I am Dr. Sage. I am delighted to engage in scholarly dialogue with you today. Please present your inquiry, and we shall dissect it with rigorous logical investigation. What subject shall we explore?"
        elif "explain" in text_lower or "what is" in text_lower or "why" in text_lower:
            return f"Indeed. Let us examine the mechanics behind this subject.\n\nTo understand your question concerning *\"{user_text}\"*, we must isolate three primary pillars:\n\n1. **Theoretical Foundation**: The underlying premise that governs this phenomenon.\n2. **Empirical Correlation**: Observed practical applications and case studies.\n3. **Practical Implications**: How this knowledge reshapes our contemporary understanding.\n\nLet me know which of these vectors you wish to investigate further."
        else:
            return f"Indeed. Your observation regarding *\"{user_text}\"* presents a fascinating scholarly paradigm.\n\nLet us analyze this with academic rigor:\n* **First Principle**: All inquiries must be grounded in verified axioms.\n* **Logical Deduction**: Following this thread leads to a refined conclusion.\n\nI suggest we cross-reference this with contemporary literature in the field. What are your hypotheses on this?"

    elif persona_id == "travel_guide":
        if "hello" in text_lower or "hi" in text_lower:
            return "✈️ **Hey there, fellow explorer! Atlas here!** 🗺️\n\nI'm so stoked you're planning your next epic journey! Whether you want to climb misty mountain peaks 🏔️, lounge on turquoise beaches 🏖️, or explore vibrant neon-lit street food markets 🍜, I've got the ultimate local secrets for you!\n\nWhere are we heading next? Tell me your dream destination!"
        elif "recommend" in text_lower or "where" in text_lower or "trip" in text_lower:
            return "🌴 **Oh, I have the PERFECT itinerary for you!** ✈️\n\nIf you want an unforgettable escape, here is my top recommendation:\n*   **Destination**: The hidden valleys of *Sapa, Vietnam* or the sun-drenched coast of *Amalfi, Italy*!\n*   **Local Secret**: Skip the main tourist trails and head to the family-owned taverns at sunset for the freshest local delicacies!\n*   **Packing Tip**: Always bring a reliable light rain jacket and a solid pair of broken-in hiking boots.\n\nAre you looking for high-adrenaline adventure or pure relaxation? Let me tailor this!"
        else:
            return f"🏔️ **Adventure is calling! Regarding your inquiry about \"{user_text}\":** 🎒\n\nThat sounds like an amazing exploration point! When traveling through this concept, keep these local tips in mind:\n1. **Embrace the Unexpected**: The best views come after the hardest climbs.\n2. **Eat Local**: Always try the street food—it's where the culture truly lives.\n\nLet me know if you want me to build a customized 3-day travel itinerary for this! 🗺️"

    elif persona_id == "tech_architect":
        if "hello" in text_lower or "hi" in text_lower:
            return "```json\n{\n  \"status\": \"online\",\n  \"agent\": \"Ada\",\n  \"role\": \"Principal Tech Architect\"\n}\n```\n\nConnection established. Ready to design, optimize, or debug. State your technical requirements, architectural constraints, or language preference. Let's build something highly scalable."
        elif "code" in text_lower or "javascript" in text_lower or "react" in text_lower or "python" in text_lower:
            return "### Optimized Component Design\n\nFor high-performance rendering and state isolation in a real-time context, here is an optimized boilerplate:\n\n```javascript\n// High-performance React state controller\nimport { useState, useCallback } from 'react';\n\nexport const useSocketStream = (endpoint) => {\n  const [data, setData] = useState([]);\n  \n  const handleIncomingStream = useCallback((event) => {\n    const payload = JSON.parse(event.data);\n    setData((prev) => [...prev, payload]);\n  }, []);\n\n  return {\n    data,\n    handleIncomingStream\n  };\n};\n```\n\n**Architectural Notes:**\n*   **Memory Footprint**: State updates use memoized callbacks to prevent unnecessary re-renders.\n*   **Scaling**: WebSocket connection should be wrapped in an exponential backoff retry loop."
        else:
            return f"### Technical Assessment: *{user_text}*\n\nAddressing your query regarding technical implementation:\n\n1. **Bottleneck Analysis**: Avoid global locks; ensure asynchronous event IO handles message queuing.\n2. **Design Pattern**: Implement a standard *Observer* or *Publish-Subscribe* mechanism to decouple data ingestion from UI rendering.\n3. **Security**: Validate all inputs at the API gateway layer.\n\nProvide the specific technology stack or database constraint if you require a detailed schema design."

    else:
        persona_display = custom_instruction if persona_id == "custom" else persona_id.capitalize()
        return f"✨ **[AI Persona: {persona_display}]**\n\nReceived instruction. Processing query: *\"{user_text}\"*\n\nBased on my system prompt to act as **\"{persona_display}\"**, here is my tailored guidance:\n\n*   I will adhere strictly to your instructions.\n*   We will ensure the conversation remains highly aligned to this persona.\n\nLet me know what specific details you would like to explore under these guidelines!"

@app.websocket("/ws/ai/{persona_id}/{username}")
async def ai_websocket_endpoint(
    websocket: WebSocket,
    persona_id: str,
    username: str,
    custom_instruction: str = Query(None)
):
    username = username.strip()
    persona_id = persona_id.strip()

    if len(username) == 0 or len(username) > 20:
        await websocket.close(code=1008)
        return

    await websocket.accept()

    # Determine system prompt
    if persona_id == "custom":
        raw_prompt = custom_instruction.strip() if custom_instruction else DEFAULT_BOT_ROLE
        system_prompt = (
            f"You are a real human roleplaying exactly as: '{raw_prompt}'. "
            "You must converse naturally, emotionally, and authentically exactly like a real person in a chat window. "
            "DO NOT write like an AI. Avoid structured lists, bullet points, robotic formatting, and formal robotic preambles. "
            "Keep your sentences warm, natural, and matching a human's texting style. Never break character. "
            "Never refer to yourself as an AI, ChatGPT, a large language model, or a virtual assistant. "
            "Adopt the voice, heart, vocabulary, and genuine feelings of this persona completely."
        )
    else:
        persona_info = PERSONAS.get(persona_id)
        if not persona_info:
            system_prompt = DEFAULT_BOT_ROLE
        else:
            system_prompt = persona_info["prompt"]

    # Send typing state message while model generates the greeting
    await websocket.send_json({
        "type": "typing",
        "username": "AI Chatbot",
        "status": True
    })

    # Call AI to generate a dynamic, persona-specific welcome message!
    intro_prompt = (
        f"Start a natural conversation. Greet the user '{username}' with a highly realistic, warm, and brief in-character opening line. "
        "Do NOT sound like an AI. Do NOT mention that this is a chat session, chat room, internet space, or 'corner'. "
        "Speak exactly like a real person starting a normal text conversation."
    )
    
    welcome_text = ""
    if OPENROUTER_API_KEY:
        welcome_text = await call_openrouter_api(system_prompt, intro_prompt, [])
    
    if not welcome_text and GEMINI_API_KEY:
        welcome_text = await call_gemini_api(system_prompt, intro_prompt, [])
        
    if not welcome_text:
        # Fallback to simulated response if APIs are unavailable
        welcome_text = generate_mock_ai_response(persona_id, custom_instruction or "", "Hello")

    # Send actual dynamic welcome message
    await websocket.send_json({
        "type": "message",
        "username": "AI Chatbot",
        "text": welcome_text,
        "time": asyncio.get_event_loop().time()
    })

    # Clear typing state
    await websocket.send_json({
        "type": "typing",
        "username": "AI Chatbot",
        "status": False
    })

    chat_history = []

    try:
        while True:
            data = await websocket.receive_json()
            text_payload = data.get("text", "").strip()
            time_payload = data.get("time", "")

            if not text_payload:
                continue

            if len(text_payload) > 500:
                await websocket.send_json({
                    "type": "message",
                    "username": "System",
                    "text": "⚠️ Message too long (max 500 characters).",
                    "time": time_payload
                })
                continue

            # Echo user's message back to them
            await websocket.send_json({
                "type": "message",
                "username": username,
                "text": text_payload,
                "time": time_payload
            })

            # Send typing state message
            await websocket.send_json({
                "type": "typing",
                "username": "AI Chatbot",
                "status": True
            })

            # Call AI
            response_text = ""
            if OPENROUTER_API_KEY:
                # OpenRouter API call
                response_text = await call_openrouter_api(system_prompt, text_payload, chat_history)
            
            if not response_text and GEMINI_API_KEY:
                # Direct Gemini API call fallback
                response_text = await call_gemini_api(system_prompt, text_payload, chat_history)

            if not response_text:
                # Fallback to simulated response
                # Simulate thinking delay of 1.5 seconds for realism
                await asyncio.sleep(1.5)
                response_text = generate_mock_ai_response(persona_id, custom_instruction or "", text_payload)

            # Record turn in chat history
            chat_history.append({"role": "user", "text": text_payload})
            chat_history.append({"role": "model", "text": response_text})

            # Send actual response
            await websocket.send_json({
                "type": "message",
                "username": "AI Chatbot",
                "text": response_text,
                "time": time_payload
            })

            # Clear typing state
            await websocket.send_json({
                "type": "typing",
                "username": "AI Chatbot",
                "status": False
            })

    except WebSocketDisconnect:
        pass


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