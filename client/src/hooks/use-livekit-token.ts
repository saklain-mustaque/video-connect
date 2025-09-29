import { useToast } from './use-toast';
import { useState, useEffect } from 'react'

interface LiveKitTokenResponse {
  token: string;
  serverUrl: string;
  roomCode: string;
  roomName: string;
  expiresIn: string;
}

interface LiveKitTokenParams {
  roomCode: string;
  userId: string;
  displayName: string;
  metadata?: Record<string, any>;
}

export function useLiveKitToken() {
  const [isLoading, setIsLoading] = useState(false);
  const [tokenData, setTokenData] = useState<LiveKitTokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generateToken = async (params: LiveKitTokenParams): Promise<LiveKitTokenResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Requesting LiveKit token for:', params.roomCode);
      
      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate token');
      }

      const data: LiveKitTokenResponse = await response.json();
      setTokenData(data);
      
      console.log('✅ LiveKit token generated successfully');
      
      toast({
        title: "Connected to LiveKit",
        description: "Successfully joined the video call room.",
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      
      console.error('❌ Failed to generate LiveKit token:', errorMessage);
      
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const generateScreenShareToken = async (
    params: Omit<LiveKitTokenParams, 'metadata'>
  ): Promise<{ token: string; serverUrl: string; participantId: string } | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Requesting screen share token for:', params.roomCode);
      
      const response = await fetch('/api/livekit/screenshare-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate screen share token');
      }

      const data = await response.json();
      
      console.log('✅ Screen share token generated successfully');
      
      toast({
        title: "Screen Share Ready",
        description: "Screen sharing token generated successfully.",
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      
      console.error('❌ Failed to generate screen share token:', errorMessage);
      
      toast({
        title: "Screen Share Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const validateConfiguration = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/livekit/config');
      
      if (!response.ok) {
        const errorData = await response.json();
        console.warn('LiveKit configuration issue:', errorData.details);
        return false;
      }

      const data = await response.json();
      console.log('✅ LiveKit configuration validated:', data.message);
      return true;
    } catch (err) {
      console.error('❌ Failed to validate LiveKit configuration:', err);
      return false;
    }
  };

  const clearToken = () => {
    setTokenData(null);
    setError(null);
  };

  return {
    isLoading,
    tokenData,
    error,
    generateToken,
    generateScreenShareToken,
    validateConfiguration,
    clearToken,
  };
}

// Hook for checking LiveKit configuration on app start
export function useLiveKitConfiguration() {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkConfiguration = async () => {
      try {
        const response = await fetch('/api/livekit/config');
        setIsConfigured(response.ok);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.warn('LiveKit not configured:', errorData.details);
        }
      } catch (error) {
        console.error('Failed to check LiveKit configuration:', error);
        setIsConfigured(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkConfiguration();
  }, []);

  return { isConfigured, isChecking };
}