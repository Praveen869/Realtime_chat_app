import { useState, useEffect, useRef } from "react"

const PERSONA_LIST = [
    {
        id: "tech_architect",
        name: "Ada (Tech Architect)",
        emoji: "💻",
        tag: "Principal Architect",
        desc: "Provides optimized system design, security tips, and clean code blocks.",
        color: "from-cyan-500 to-blue-600"
    },
    {
        id: "storyteller",
        name: "Chronicler (Storyteller)",
        emoji: "🎭",
        tag: "Epic Narrator",
        desc: "Spins whimsical fantasy adventure logs and atmospheric descriptive tales.",
        color: "from-purple-500 to-pink-600"
    },
    {
        id: "professor",
        name: "Dr. Sage (Professor)",
        emoji: "🎓",
        tag: "Academic Scholar",
        desc: "Delivers deep academic reasoning, structural bullet points, and citations.",
        color: "from-amber-500 to-orange-600"
    },
    {
        id: "travel_guide",
        name: "Atlas (Travel Guide)",
        emoji: "🗺️",
        tag: "Local Explorer",
        desc: "Curates packing suggestions, custom 3-day itineraries, and local secret spots.",
        color: "from-emerald-500 to-teal-600"
    }
]

function AIChatScreen({ username, onLeave }) {
    const [activePersona, setActivePersona] = useState("tech_architect")
    const [customPrompt, setCustomPrompt] = useState("")
    const [appliedCustomPrompt, setAppliedCustomPrompt] = useState("")
    const [isCustomMode, setIsCustomMode] = useState(false)
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState("")
    const [isTyping, setIsTyping] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)

    const POPULAR_EMOJIS = [
        // Smilies & Emotions
        "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", 
        "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", 
        "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓",
        // Hand gestures
        "👍", "👎", "👊", "✊", "🤛", "🤜", "🤞", "✌️", "🤟", "🤘", "👌", "🤌", "🤏", "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", 
        "🖐️", "🖖", "👋", "🤙", "💪", "🦾", "🖕", "✍️", "🙏", "🤝",
        // Hearts, Stars & Celebrations
        "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝",
        "🔥", "✨", "⚡", "💥", "⭐", "🌟", "🎉", "🎊", "🎈", "🎁"
    ]

    const ws = useRef(null)
    const messagesEndRef = useRef(null)

    // Reset chat history when persona changes
    useEffect(() => {
        setMessages([])
    }, [activePersona])

    // Scroll to bottom on new message or typing state change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, isTyping])

    // Handle WebSocket life cycle
    useEffect(() => {
        const wsUrl = import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8000"
        
        let path = `${wsUrl}/ws/ai/`
        if (isCustomMode) {
            path += `custom/${username}?custom_instruction=${encodeURIComponent(appliedCustomPrompt || "A helpful AI assistant")}`
        } else {
            path += `${activePersona}/${username}`
        }

        const socket = new WebSocket(path)
        ws.current = socket

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data)
            if (data.type === "typing") {
                setIsTyping(data.status)
            } else {
                setMessages((prev) => [...prev, data])
            }
        }

        return () => socket.close()
    }, [activePersona, username, isCustomMode, appliedCustomPrompt])

    function sendMessage() {
        if (input.trim() === "") return
        ws.current.send(JSON.stringify({ text: input, time: new Date().toISOString() }))
        setInput("")
    }

    function handlePersonaSelect(id) {
        setIsCustomMode(false)
        setActivePersona(id)
        setSidebarOpen(false)
    }

    function handleApplyCustomPrompt(e) {
        e.preventDefault()
        if (customPrompt.trim() === "") return
        setAppliedCustomPrompt(customPrompt)
        setIsCustomMode(true)
        setSidebarOpen(false)
    }

    function handleClearCustomPrompt() {
        setIsCustomMode(false)
        setCustomPrompt("")
        setAppliedCustomPrompt("")
        setActivePersona("tech_architect")
    }

    function handleAddEmoji(emoji) {
        setInput((prev) => prev + emoji)
        setShowEmojiPicker(false)
    }

    // Mini Markdown & Code renderer
    function renderMarkdown(text) {
        if (!text) return ""
        const parts = text.split(/(```[\s\S]*?```)/g)
        return parts.map((part, i) => {
            if (part.startsWith("```")) {
                const match = part.match(/```(\w*)\n([\s\S]*?)```/)
                const lang = match ? match[1] : ""
                const code = match ? match[2] : part.slice(3, -3)
                return (
                    <div key={i} className="my-3 font-mono text-[13px] bg-gray-950 text-emerald-400 p-4 rounded-xl border border-gray-800/80 overflow-x-auto shadow-inner leading-relaxed">
                        {lang && <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 border-b border-gray-900 pb-1">{lang}</div>}
                        <pre className="whitespace-pre">{code.trim()}</pre>
                    </div>
                )
            }
            
            let rendered = part
            // Escape HTML entities to prevent XSS
            rendered = rendered
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                
            // Inline code: `code`
            rendered = rendered.replace(/`([^`]+)`/g, '<code class="bg-gray-950 text-pink-400 px-1.5 py-0.5 rounded font-mono text-xs">$1</code>')
            
            // Bold: **text** or *text*
            rendered = rendered.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            rendered = rendered.replace(/\*([^*]+)\*/g, '<em>$1</em>')
            
            // Newlines to <br/>
            rendered = rendered.replace(/\n/g, '<br/>')
            
            return (
                <span
                    key={i}
                    dangerouslySetInnerHTML={{ __html: rendered }}
                    className="leading-relaxed break-words text-[14px] md:text-[15px]"
                />
            )
        })
    }

    const currentPersonaObj = PERSONA_LIST.find(p => p.id === activePersona)

    return (
        <div className="h-screen bg-[#0b0f19] flex flex-col font-sans text-gray-100 overflow-hidden">
            
            {/* Header */}
            <div className="h-16 px-4 bg-gray-900 border-b border-gray-800/80 flex justify-between items-center shrink-0 shadow-lg z-20">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onLeave}
                        className="p-2 hover:bg-gray-800 rounded-xl transition-all text-gray-400 hover:text-white flex items-center gap-2 group"
                        title="Return to Room List"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="hidden sm:block text-sm font-semibold">Exit Studio</span>
                    </button>

                    <div className="h-6 w-px bg-gray-800 mx-1"></div>

                    {/* Mobile Sidebar Toggle */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="md:hidden p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300"
                    >
                        🎭 Personas
                    </button>

                    {/* Active Persona Banner */}
                    <div className="hidden sm:flex items-center gap-2.5">
                        <span className="text-xl">
                            {isCustomMode ? "🤖" : currentPersonaObj?.emoji}
                        </span>
                        <div>
                            <h2 className="text-white text-sm font-bold leading-tight">
                                {isCustomMode ? "Custom Persona" : currentPersonaObj?.name}
                            </h2>
                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mt-0.5">
                                {isCustomMode ? "User Defined Instruction" : currentPersonaObj?.tag}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-blue-950/30 border border-blue-500/20 px-3 py-1.5 rounded-full shadow-inner shadow-blue-500/5">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
                    <span className="text-xs font-bold text-blue-300 tracking-wide uppercase">AI Studio Live</span>
                </div>
            </div>

            {/* Workspace Area */}
            <div className="flex flex-1 overflow-hidden relative">

                {/* Left Sidebar - Persona Picker */}
                <div className={`
                    absolute md:static top-0 left-0 h-full w-72 bg-gray-900 border-r border-gray-800/80 z-30 flex flex-col shrink-0 transition-transform duration-300
                    ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
                `}>
                    <div className="p-5 border-b border-gray-800 flex justify-between items-center">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            🎭 Choose Studio Persona
                        </h3>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="md:hidden text-gray-500 hover:text-white"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {PERSONA_LIST.map((p) => {
                            const isSelected = !isCustomMode && activePersona === p.id
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => handlePersonaSelect(p.id)}
                                    className={`
                                        w-full text-left p-3.5 rounded-2xl border transition-all duration-300 relative overflow-hidden group
                                        ${isSelected 
                                            ? "bg-gradient-to-br from-gray-800/90 to-gray-900 border-blue-500/40 shadow-lg shadow-blue-950/10" 
                                            : "bg-gray-800/40 hover:bg-gray-800/70 border-gray-800/60 hover:border-gray-700"}
                                    `}
                                >
                                    {isSelected && (
                                        <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-500"></div>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl group-hover:scale-110 transition-transform duration-300">{p.emoji}</span>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <h4 className="font-bold text-gray-200 text-[13px]">{p.name}</h4>
                                            </div>
                                            <span className="text-[10px] text-gray-500 font-medium block mt-0.5">{p.tag}</span>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                                        {p.desc}
                                    </p>
                                </button>
                            )
                        })}

                        {/* Custom Instruction Box */}
                        <div className="pt-4 border-t border-gray-850">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                                ⚙️ Custom system prompt
                            </h4>
                            {isCustomMode ? (
                                <div className="space-y-2">
                                    <div className="w-full bg-blue-950/20 border border-blue-500/20 rounded-xl px-3 py-2 text-xs text-blue-300 leading-relaxed font-semibold italic shadow-inner">
                                        Active: "{appliedCustomPrompt}"
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleClearCustomPrompt}
                                        className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold py-2.5 rounded-xl shadow-lg shadow-red-500/10 transition-all active:scale-95"
                                    >
                                        CLEAR DYNAMIC PERSONA ❌
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleApplyCustomPrompt} className="space-y-2">
                                    <textarea
                                        placeholder="e.g. Speak like a medieval knight..."
                                        value={customPrompt}
                                        onChange={(e) => setCustomPrompt(e.target.value)}
                                        maxLength={200}
                                        rows={3}
                                        className="w-full bg-gray-950 border border-gray-800/80 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder-gray-600 text-white leading-relaxed"
                                    />
                                    <button
                                        type="submit"
                                        disabled={customPrompt.trim() === ""}
                                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 text-white text-xs font-bold py-2.5 rounded-xl shadow-lg shadow-blue-500/10 transition-all"
                                    >
                                        APPLY DYNAMIC PERSONA ✨
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Chat Workspace */}
                <div className="flex-1 flex flex-col bg-[#0b0e14] overflow-hidden">
                    
                    {/* Message Log */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
                        
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-4xl shadow-xl shadow-blue-500/10 mb-6 animate-bounce">
                                    🤖
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">AI Chatbot Studio</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    Welcome to your premium private AI sandbox. Select a persona in the sidebar or enter your custom system prompt to begin. 
                                </p>
                                <div className="flex gap-1.5 mt-6">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
                                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping delay-200"></span>
                                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping delay-500"></span>
                                </div>
                            </div>
                        ) : (
                            messages.map((msg, index) => {
                                const isMe = msg.username === username
                                return (
                                    <div key={index} className="flex flex-col">
                                        <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isMe ? "self-end items-end" : "self-start items-start"}`}>
                                            
                                            {/* Username Tag */}
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1 ml-1.5">
                                                {isMe ? "You" : msg.username}
                                            </span>

                                            {/* Chat Bubble */}
                                            <div className={`
                                                relative px-4 py-3 shadow-lg rounded-2xl leading-relaxed text-[15px]
                                                ${isMe
                                                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-sm"
                                                    : "bg-gray-900 text-gray-100 rounded-tl-sm border border-gray-800/80 shadow-md"}
                                            `}>
                                                {isMe ? (
                                                    <p className="break-words">{msg.text}</p>
                                                ) : (
                                                    <div className="space-y-1">
                                                        {renderMarkdown(msg.text)}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Timestamp */}
                                            <span className="text-[9px] text-gray-600 mt-1 font-semibold ml-1.5 uppercase">
                                                {msg.time
                                                    ? new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                                    : ""}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })
                        )}

                        {/* Typing Animation */}
                        {isTyping && (
                            <div className="flex flex-col self-start items-start">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1 ml-1.5">
                                    AI Chatbot
                                </span>
                                <div className="bg-gray-900 border border-gray-800/80 rounded-2xl rounded-tl-sm px-4 py-3.5 shadow-md flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"></div>
                                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Glowing SaaS Input Panel */}
                    <div className="p-4 bg-gray-900/60 border-t border-gray-800/60 shrink-0 backdrop-blur-md relative">
                        {showEmojiPicker && (
                            <div className="absolute bottom-20 left-4 z-50 bg-[#0e1322] border border-gray-800/80 p-3.5 rounded-2xl shadow-2xl w-72 backdrop-blur-md shadow-blue-500/5">
                                <div 
                                    className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1"
                                    style={{
                                        scrollbarWidth: "thin",
                                        scrollbarColor: "#1e293b transparent"
                                    }}
                                >
                                    {POPULAR_EMOJIS.map((emoji) => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            onClick={() => handleAddEmoji(emoji)}
                                            className="text-2xl hover:scale-125 transition-transform p-1.5 focus:outline-none active:scale-90"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex gap-2.5 max-w-5xl mx-auto items-center relative">
                            
                            <button
                                type="button"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className="h-14 w-14 shrink-0 bg-gray-950/40 hover:bg-gray-950 text-gray-400 hover:text-white border border-gray-800 rounded-full flex items-center justify-center text-2xl transition-all active:scale-95"
                                title="Add Emoji"
                            >
                                😊
                            </button>

                            <div className="flex-1 relative group rounded-full overflow-hidden p-[1px] bg-gradient-to-r from-transparent hover:from-blue-500/20 hover:to-indigo-500/20 focus-within:from-blue-500 focus-within:to-indigo-500 transition-all duration-300">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                    placeholder={
                                        isCustomMode 
                                            ? "Send Message to Custom Persona..." 
                                            : `Send Message to ${currentPersonaObj?.name}...`
                                    }
                                    maxLength={500}
                                    className="w-full bg-gray-950 text-white placeholder-gray-500 px-6 py-4 rounded-full focus:outline-none text-[15px] border border-gray-800/60 focus:border-transparent transition-all"
                                />
                            </div>

                            <button
                                onClick={sendMessage}
                                disabled={input.trim() === ""}
                                className="h-14 w-14 shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 text-white rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 group"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-0.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                </svg>
                            </button>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    )
}

export default AIChatScreen
