import VideoCall from '../VideoCall';

export default function VideoCallExample() {
  const handleLeaveCall = () => {
    console.log('Leave call triggered');
  };

  return (
    <VideoCall 
      roomCode="demo-room-123"
      roomName="Demo Video Call"
      username="johndoe"
      displayName="John Doe"
      onLeaveCall={handleLeaveCall}
    />
  );
}