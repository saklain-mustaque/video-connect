import { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Circle, Square, Loader2, AlertCircle, Monitor, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRecording } from "@/hooks/useRecording";

interface RecordingButtonProps {
  roomId: string;
  roomCode: string;
  roomName: string;
  mediaStream: MediaStream | null;
  userName: string;
}

export function RecordingButton({
  roomId,
  roomCode,
  roomName,
  mediaStream,
  userName,
}: RecordingButtonProps) {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [recordingType, setRecordingType] = useState<'camera' | 'screen'>('screen');
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const {
    isRecording,
    isUploading,
    startRecording: startRecordingHook,
    stopAndUpload,
  } = useRecording();

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(async (type: 'camera' | 'screen') => {
    try {
      let streamToRecord: MediaStream | null = null;

      if (type === 'screen') {
        // Request screen capture
        try {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface: 'browser', // or 'window', 'monitor'
              width: { ideal: 1920, max: 1920 },
              height: { ideal: 1080, max: 1080 },
              frameRate: { ideal: 30, max: 30 }
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              sampleRate: 44100
            }
          });

          // Combine screen video with mic audio
          const combinedStream = new MediaStream();
          
          // Add video from screen
          displayStream.getVideoTracks().forEach(track => {
            combinedStream.addTrack(track);
          });

          // Add audio from mediaStream (microphone) if available
          if (mediaStream) {
            mediaStream.getAudioTracks().forEach(track => {
              combinedStream.addTrack(track);
            });
          }

          streamToRecord = combinedStream;
          setScreenStream(displayStream);

          // Handle user stopping screen share
          displayStream.getVideoTracks()[0].addEventListener('ended', () => {
            console.log('Screen sharing stopped by user');
            handleStopRecording();
          });

        } catch (error) {
          console.error('Screen capture failed:', error);
          toast({
            title: "Screen Capture Failed",
            description: "Please allow screen sharing permission",
            variant: "destructive",
          });
          return;
        }
      } else {
        // Use camera stream
        streamToRecord = mediaStream;
      }

      if (!streamToRecord || streamToRecord.getTracks().length === 0) {
        toast({
          title: "No Media Available",
          description: `Please enable your ${type === 'screen' ? 'screen sharing' : 'camera and microphone'}`,
          variant: "destructive",
        });
        return;
      }

      await startRecordingHook(roomId, roomCode, roomName, streamToRecord);

      // Start timer
      setRecordingTime(0);
      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      setTimerInterval(interval);

      toast({
        title: "Recording Started",
        description: `Recording ${type === 'screen' ? 'screen' : 'camera feed'}...`,
      });

      setShowDialog(false);
    } catch (error) {
      console.error('Failed to start recording:', error);
      
      // Clean up any stale recording state
      try {
        await fetch(`/api/recordings/cleanup/${roomId}`, {
          method: 'POST',
          credentials: 'include'
        });
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError);
      }

      toast({
        title: "Recording Failed",
        description: error instanceof Error ? error.message : "Failed to start recording",
        variant: "destructive",
      });
    }
  }, [roomId, roomCode, roomName, mediaStream, startRecordingHook, toast]);

  const handleStopRecording = useCallback(async () => {
    try {
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }

      // Stop screen stream if it exists
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
      }

      toast({
        title: "Processing Recording",
        description: "Stopping and uploading recording...",
      });

      await stopAndUpload();

      toast({
        title: "Recording Saved",
        description: "Your recording has been saved successfully!",
      });

      setRecordingTime(0);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      
      toast({
        title: "Upload Failed",
        description: "Recording stopped but upload failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShowStopDialog(false);
    }
  }, [stopAndUpload, toast, timerInterval, screenStream]);

  if (isRecording) {
    return (
      <>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowStopDialog(true)}
          className="gap-2 animate-pulse"
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Square className="w-4 h-4 fill-current" />
              Stop ({formatTime(recordingTime)})
            </>
          )}
        </Button>

        <AlertDialog open={showStopDialog} onOpenChange={setShowStopDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Stop Recording?</AlertDialogTitle>
              <AlertDialogDescription>
                Recording duration: {formatTime(recordingTime)}
                <br />
                The recording will be processed and saved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Continue Recording</AlertDialogCancel>
              <AlertDialogAction onClick={handleStopRecording} disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Stop & Save'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="gap-2"
      >
        <Circle className="w-4 h-4 text-red-500 fill-red-500" />
        Record
      </Button>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start Recording</AlertDialogTitle>
            <AlertDialogDescription>
              Choose what you want to record:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="flex flex-col gap-3 my-4">
            <Button
              variant="outline"
              className="h-auto p-4 justify-start"
              onClick={() => {
                setRecordingType('screen');
                startRecording('screen');
              }}
            >
              <Monitor className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Record Screen</div>
                <div className="text-xs text-muted-foreground">
                  Record entire meeting interface (Recommended)
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 justify-start"
              onClick={() => {
                setRecordingType('camera');
                startRecording('camera');
              }}
            >
              <Video className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Record Camera</div>
                <div className="text-xs text-muted-foreground">
                  Record only your camera feed
                </div>
              </div>
            </Button>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-800 dark:text-yellow-200">
                <strong>Screen Recording:</strong> Captures the entire meeting including all participants.
                <br />
                <strong>Camera Recording:</strong> Only captures your video feed.
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}