import ParticipantsList from '../ParticipantsList';

export default function ParticipantsListExample() {
  const mockParticipants = [
    { 
      id: '1', 
      name: 'John Doe', 
      username: 'johndoe', 
      isOnline: true, 
      isMuted: false, 
      hasVideo: true, 
      isHost: true,
      isSpeaking: true
    },
    { 
      id: '2', 
      name: 'Alice Johnson', 
      username: 'alice', 
      isOnline: true, 
      isMuted: true, 
      hasVideo: true 
    },
    { 
      id: '3', 
      name: 'Bob Smith', 
      username: 'bob', 
      isOnline: true, 
      isMuted: false, 
      hasVideo: false 
    },
    { 
      id: '4', 
      name: 'Carol Wilson', 
      username: 'carol', 
      isOnline: false, 
      isMuted: true, 
      hasVideo: false 
    },
  ];

  const handleClose = () => {
    console.log('Participants list closed');
  };

  return (
    <div className="h-96 w-80">
      <ParticipantsList 
        participants={mockParticipants}
        onClose={handleClose}
      />
    </div>
  );
}