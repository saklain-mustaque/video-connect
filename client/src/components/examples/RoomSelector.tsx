import RoomSelector from '../RoomSelector';

export default function RoomSelectorExample() {
  const handleJoinRoom = (roomCode: string, roomName?: string) => {
    console.log('Room join handled:', { roomCode, roomName });
  };

  const handleLogout = () => {
    console.log('Logout triggered');
  };

  return (
    <RoomSelector 
      username="johndoe" 
      displayName="John Doe" 
      onJoinRoom={handleJoinRoom}
      onLogout={handleLogout}
    />
  );
}