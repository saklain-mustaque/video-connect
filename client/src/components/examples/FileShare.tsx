import FileShare from '../FileShare';

export default function FileShareExample() {
  const handleClose = () => {
    console.log('File share panel closed');
  };

  return (
    <div className="h-96 w-80">
      <FileShare 
        roomId="demo-room-123"
        onClose={handleClose}
      />
    </div>
  );
}