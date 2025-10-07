import { useState, useRef, useCallback } from 'react';

export function useRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [participantIds, setParticipantIds] = useState<Set<string>>(new Set());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  // Add a participant to the recording
  const addParticipant = useCallback((participantId: string) => {
    if (isRecording) {
      setParticipantIds(prev => {
        const newSet = new Set(prev);
        newSet.add(participantId);
        return newSet;
      });
    }
  }, [isRecording]);

  const startRecording = useCallback(async (
    roomId: string,
    roomCode: string,
    roomName: string,
    stream: MediaStream,
    initialParticipants: string[] = []
  ) => {
    try {
      // Validate stream has tracks before starting
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      console.log('Stream tracks:', {
        video: videoTracks.length,
        audio: audioTracks.length,
        totalTracks: stream.getTracks().length
      });

      if (stream.getTracks().length === 0) {
        throw new Error('No audio or video tracks available in the media stream');
      }

      // Check if MediaRecorder is supported with this stream
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.warn('vp9,opus not supported, trying vp8,opus');
        mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          console.warn('vp8,opus not supported, trying default');
          mimeType = 'video/webm';
        }
      }

      console.log('Using mimeType:', mimeType);

      const response = await fetch('/api/recordings/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, roomCode, roomName }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to start recording' }));
        throw new Error(errorData.error || 'Failed to start recording');
      }
      
      const data = await response.json();
      setRecordingId(data.recordingId);
      startTimeRef.current = Date.now();
      chunksRef.current = [];
      
      // Initialize participants list
      setParticipantIds(new Set(initialParticipants));

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log('Recorded chunk:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      
      console.log('✅ Recording started successfully:', data.recordingId);
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }, []);

  const stopRecording = useCallback(async () => {
    return new Promise<Blob>((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        reject(new Error('No active recording'));
        return;
      }

      mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

          if (recordingId) {
            await fetch(`/api/recordings/${recordingId}/stop`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ duration }),
              credentials: 'include'
            });
          }

          setIsRecording(false);
          mediaRecorderRef.current = null;
          resolve(blob);
        } catch (error) {
          reject(error);
        }
      };

      mediaRecorder.stop();
    });
  }, [recordingId]);

  const uploadRecording = useCallback(async (blob: Blob) => {
    if (!recordingId) throw new Error('No recording ID');

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('video', blob, `recording-${recordingId}.webm`);
      
      // Add participants list to the upload
      formData.append('participants', JSON.stringify(Array.from(participantIds)));

      const response = await fetch(`/api/recordings/${recordingId}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setIsUploading(false);
      setRecordingId(null);
      setParticipantIds(new Set()); // Clear participants
      return data;
    } catch (error) {
      setIsUploading(false);
      throw error;
    }
  }, [recordingId, participantIds]);

  const stopAndUpload = useCallback(async () => {
    const blob = await stopRecording();
    return await uploadRecording(blob);
  }, [stopRecording, uploadRecording]);

  return {
    isRecording,
    isUploading,
    recordingId,
    startRecording,
    stopRecording,
    uploadRecording,
    stopAndUpload,
    addParticipant
  };
}
