import { useState, useEffect } from "react"

function RoomList({ username, onJoinRoom }) {
    const [rooms, setRooms] = useState({})
    const [newRoomName, setNewRoomName] = useState("")
    const [error, setError] = useState("")

    useEffect(() => {
        fetchRooms()
        const interval = setInterval(fetchRooms, 2000)
        return () => clearInterval(interval)
    }, [])

    async function fetchRooms() {
        try {
            // Using logic that connects to environment variable OR locally fallback
            const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
            const res = await fetch(`${apiUrl}/rooms`)
            const data = await res.json()
            setRooms(data)
        } catch (err) {
            console.log("Server cannot reach")
        }
    }

    function handleCreateRoom() {
        if (newRoomName.trim() === "") {
            setError("Please Enter Room_Name! 😅")
            return
        }
        onJoinRoom(newRoomName.trim().toLowerCase())
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-100 p-4">
            <div className="bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-gray-700 bg-gray-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Hey, {username}! 👋</h2>
                        <p className="text-gray-400 text-sm mt-1">Which room do you want to join?</p>
                    </div>
                    {/* User Avatar Placeholder */}
                    <div className="w-11 h-11 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-inner">
                        {username.charAt(0).toUpperCase()}
                    </div>
                </div>

                {/* Active Rooms */}
                <div className="p-6 flex-1 overflow-y-auto">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">🟢 Live Rooms</h3>

                    {Object.keys(rooms).length === 0 ? (
                        <div className="text-center p-6 bg-gray-900 rounded-xl border border-gray-700 border-dashed">
                            <p className="text-gray-500 text-sm">No rooms available — create the first room! 🎉</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {Object.entries(rooms).map(([roomName, count]) => (
                                <button
                                    key={roomName}
                                    onClick={() => onJoinRoom(roomName)}
                                    className="w-full flex items-center justify-between p-4 bg-gray-900 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-xl transition-all duration-200 group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-800 group-hover:bg-blue-600/20 text-blue-400 rounded-lg flex items-center justify-center font-bold text-xl transition-colors">
                                            #
                                        </div>
                                        <span className="font-semibold text-gray-200 group-hover:text-white transition-colors">{roomName}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-gray-800 px-3 py-1.5 rounded-full border border-gray-600">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        <span className="text-xs text-gray-300 font-medium">{count} online</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Create Room Section */}
                <div className="p-6 bg-gray-900 border-t border-gray-700">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">➕ Create New Room</h3>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Enter Room Name"
                                value={newRoomName}
                                onChange={(e) => setNewRoomName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
                                maxLength={20}
                                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm placeholder-gray-500"
                            />
                        </div>
                        <button
                            onClick={handleCreateRoom}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-xl font-semibold transition-colors shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                        >
                            Create
                        </button>
                    </div>
                    {error && <p className="text-red-400 text-sm mt-3 font-medium">{error}</p>}
                </div>

            </div>
        </div>
    )
}

export default RoomList