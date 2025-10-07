import { Video, Square, Loader2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRecording } from '@/hooks/useRecording';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useCallback } from 'react';
import { useDataChannel, useParticipants } from '@livekit/components-react';

interface RecordingButtonProps {
  roomId: string;
  roomCode: string;
  roomName: string;
  mediaStream: MediaStream | null;
  userName?: string;
}

export function RecordingButton({
  roomId,
  roomCode,
  roomName,
  mediaStream,
  userName = 'Someone'
}: RecordingButtonProps) {
  const { toast } = useToast();
  const { isRecording, isUploading, startRecording, stopAndUpload, addParticipant } = useRecording();
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [remoteRecordingActive, setRemoteRecordingActive] = useState(false);
  const [recordingStartedBy, setRecordingStartedBy] = useState<string>('');
  const participants = useParticipants();

  // Track new participants joining during recording
  useEffect(() => {
    if (isRecording && participants.length > 0) {
      participants.forEach(participant => {
        addParticipant(participant.identity);
      });
    }
  }, [participants, isRecording, addParticipant]);

  // Handle incoming recording status messages from other participants
  const handleIncomingRecordingStatus = useCallback((data: any) => {
    try {
      const statusData = JSON.parse(new TextDecoder().decode(data.payload));
      
      if (statusData.type === 'recording_status') {
        console.log('📹 Received recording status:', statusData);
        
        if (statusData.status === 'started') {
          setRemoteRecordingActive(true);
          setRecordingStartedBy(statusData.userName);
          
          // Show toast notification to all participants
          toast({
            title: 'Recording Started',
            description: `${statusData.userName} started recording this meeting`,
          });
        } else if (statusData.status === 'stopped') {
          setRemoteRecordingActive(false);
          setRecordingStartedBy('');
          
          toast({
            title: 'Recording Stopped',
            description: `${statusData.userName} stopped the recording`,
          });
        }
      }
    } catch (error) {
      console.error('Failed to parse recording status:', error);
    }
  }, [toast]);

  const { send: sendRecordingStatus } = useDataChannel('recording_status', handleIncomingRecordingStatus);

  // Broadcast recording status to all participants
  const broadcastRecordingStatus = async (status: 'started' | 'stopped') => {
    if (!sendRecordingStatus) return;
    
    try {
      const statusMessage = {
        type: 'recording_status',
        status,
        userName,
        timestamp: new Date().toISOString(),
        roomId,
      };
      
      await sendRecordingStatus(new TextEncoder().encode(JSON.stringify(statusMessage)), {
        reliable: true,
      });
      
      console.log('✅ Broadcast recording status:', status);
    } catch (error) {
      console.error('❌ Failed to broadcast recording status:', error);
    }
  };

  // Timer for recording duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecording || remoteRecordingActive) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, remoteRecordingActive]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleRecording = async () => {
    try {
      if (isRecording) {
        toast({
          title: 'Stopping recording',
          description: 'Processing and uploading...'
        });

        const result = await stopAndUpload();
        
        // Broadcast stopped status
        await broadcastRecordingStatus('stopped');
        
        toast({
          title: 'Recording saved',
          description: `Uploaded successfully (${(result.fileSize / 1024 / 1024).toFixed(2)} MB)`,
        });
      } else {
        if (!mediaStream) {
          toast({
            title: 'Cannot start recording',
            description: 'Please wait for your camera and microphone to be ready, then try again.',
            variant: 'destructive'
          });
          return;
        }

        // Check if stream has tracks
        const tracks = mediaStream.getTracks();
        if (tracks.length === 0) {
          toast({
            title: 'Cannot start recording',
            description: 'No audio or video tracks available. Please check your camera and microphone permissions.',
            variant: 'destructive'
          });
          return;
        }

        console.log('Starting recording with stream:', {
          videoTracks: mediaStream.getVideoTracks().length,
          audioTracks: mediaStream.getAudioTracks().length
        });

        // Get current participant IDs
        const participantIds = participants.map(p => p.identity);
        console.log('Recording participants:', participantIds);

        await startRecording(roomId, roomCode, roomName, mediaStream, participantIds);
        
        // Broadcast started status with room info for participant tracking
        await broadcastRecordingStatus('started');
        
        toast({
          title: 'Recording started',
          description: 'Your call is now being recorded'
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to toggle recording';
      
      console.error('Recording toggle error:', error);
      
      // If there's a conflict error, offer to cleanup
      if (errorMessage.includes('already in progress')) {
        toast({
          title: 'Recording conflict',
          description: errorMessage,
          variant: 'destructive',
          action: (
            <button
              onClick={handleCleanupStaleRecording}
              className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded"
            >
              Clear & Retry
            </button>
          ),
        });
      } else {
        toast({
          title: 'Recording error',
          description: errorMessage,
          variant: 'destructive'
        });
      }
    }
  };

  const handleCleanupStaleRecording = async () => {
    try {
      const response = await fetch(`/api/recordings/cleanup/${roomId}`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to cleanup recording');

      const data = await response.json();
      toast({
        title: 'Cleanup successful',
        description: data.message,
      });

      // Try starting recording again after cleanup
      if (mediaStream) {
        await startRecording(roomId, roomCode, roomName, mediaStream);
        toast({
          title: 'Recording started',
          description: 'Your call is now being recorded'
        });
      }
    } catch (error) {
      toast({
        title: 'Cleanup failed',
        description: error instanceof Error ? error.message : 'Failed to cleanup recording',
        variant: 'destructive'
      });
    }
  };

  if (isUploading) {
    return (
      <Button
        disabled
        variant="ghost"
        size="sm"
        className="relative"
        title="Uploading Recording"
        data-testid="button-recording"
      >
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        <span className="text-xs font-medium">Uploading...</span>
      </Button>
    );
  }

  if (isRecording) {
    return (
      <Button
        onClick={handleToggleRecording}
        variant="destructive"
        size="sm"
        className="relative group"
        title="Stop Recording"
        data-testid="button-recording"
      >
        {/* Animated recording indicator */}
        <div className="absolute -top-1 -right-1 w-3 h-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </div>
        
        <Circle className="w-4 h-4 mr-2 fill-current" />
        <div className="flex flex-col items-start">
          <span className="text-xs font-bold">Recording</span>
          <span className="text-[10px] font-mono opacity-90">{formatDuration(recordingDuration)}</span>
        </div>
      </Button>
    );
  }

  // Show recording status if someone else is recording
  if (remoteRecordingActive) {
    return (
      <Button
        disabled
        variant="destructive"
        size="sm"
        className="relative opacity-75 cursor-not-allowed"
        title={`Recording by ${recordingStartedBy}`}
        data-testid="button-recording-remote"
      >
        {/* Animated recording indicator */}
        <div className="absolute -top-1 -right-1 w-3 h-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </div>
        
        <Circle className="w-4 h-4 mr-2 fill-current" />
        <div className="flex flex-col items-start">
          <span className="text-xs font-bold">Recording</span>
          <span className="text-[10px] opacity-90">{recordingStartedBy}</span>
        </div>
      </Button>
    );
  }

  return (
    <Button
      onClick={handleToggleRecording}
      variant="ghost"
      size="sm"
      className="hover:bg-red-500/10 hover:text-red-500 transition-all duration-200"
      title="Start Recording"
      data-testid="button-recording"
    >
      <Video className="w-4 h-4 mr-2" />
      <span className="text-xs font-medium">Record</span>
    </Button>
  );
}
