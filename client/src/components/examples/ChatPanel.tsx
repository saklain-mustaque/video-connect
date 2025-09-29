import ChatPanel from '../ChatPanel';

export default function ChatPanelExample() {
  const handleClose = () => {
    console.log('Chat panel closed');
  };

  return (
    <div className="h-96 w-80">
      <ChatPanel 
        roomId="demo-room-123"
        userId="johndoe"
        userName="John Doe"
        onClose={handleClose}
      />
    </div>
  );
}