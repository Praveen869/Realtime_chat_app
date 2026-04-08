import { useState } from "react"
import UsernameScreen from "./components/UsernameScreen"
import RoomList from "./components/RoomList"
import ChatScreen from "./components/ChatScreen"

function App() {
  const [username, setUsername] = useState("")
  const [currentRoom, setCurrentRoom] = useState("")

  if (!username) {
    return <UsernameScreen onUsernameSet={setUsername} />
  }

  if (!currentRoom) {
    return (
      <RoomList
        username={username}
        onJoinRoom={setCurrentRoom}
      />
    )
  }

  return (
    <ChatScreen
      username={username}
      room={currentRoom}
      onLeaveRoom={() => setCurrentRoom("")}
    />
  )
}
export default App