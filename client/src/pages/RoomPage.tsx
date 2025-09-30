import React, { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { 
  LiveKitRoom,
  VideoConference,
  useParticipants,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Phone, 
  MessageSquare, 
  Users, 
  Share2, 
  Settings,
  PhoneOff,
  Minimize2,
  Maximize2,
  Copy,
  ExternalLink,
  AlertCircle,
  Loader2,
  Home
} from 'lucide-react';
import ChatPanel from '@/components/ChatPanel';
import ParticipantsList from '@/components/ParticipantsList';
import FileShare from '@/components/FileShare';
import { useLiveKitToken } from '@/hooks/use-livekit-token';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

interface RoomData {
  id: string;
  code: string;
  name: string;
  createdBy: string;
  isActive: boolean;
  shareLink?: string;
}

const RoomPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showFileShare, setShowFileShare] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  
  const { generateToken, isLoading: tokenLoading } = useLiveKitToken();

  // Load room data and generate token
  useEffect(() => {
    if (!roomCode || !user) return;
    
    loadRoomAndConnect();
  }, [roomCode, user]);

  const loadRoomAndConnect = async () => {
    if (!roomCode || !user) return;
    
    try {
      setIsLoading(true);
      setConnectionError(null);
      
      console.log('🔄 Loading room data for:', roomCode);
      
      // First, verify the room exists and get room data
      const roomResponse = await fetch(`/api/rooms/by-code/${encodeURIComponent(roomCode)}`, {
        credentials: 'include',
      });
      
      if (!roomResponse.ok) {
        if (roomResponse.status === 404) {
          setConnectionError('Room not found. Please check the room code.');
        } else {
          setConnectionError('Failed to load room information.');
        }
        setIsLoading(false);
        return;
      }
      
      const roomData = await roomResponse.json();
      setRoomData(roomData);
      
      console.log('✅ Room data loaded:', roomData);
      
      // Join the room (mark as active)
      const joinResponse = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (!joinResponse.ok) {
        setConnectionError('Failed to join room.');
        setIsLoading(false);
        return;
      }
      
      console.log('✅ Room joined successfully');
      
      // Generate LiveKit token
      console.log('🔄 Generating LiveKit token...');
      const tokenData = await generateToken({
        roomCode,
        userId: user.username,
        displayName: user.displayName,
        metadata: {
          username: user.username,
          joinedAt: new Date().toISOString(),
        },
      });
      
      if (!tokenData) {
        console.error('❌ Failed to get token data');
        setConnectionError('Failed to generate access token');
        setIsLoading(false);
        return;
      }
      
      console.log('✅ Token generated successfully');
      
      // Set token and serverUrl for LiveKitRoom
      setToken(tokenData.token);
      setServerUrl(tokenData.serverUrl);
      
      toast({
        title: "Connected!",
        description: `Joined ${roomData.name} successfully.`,
      });
      
    } catch (error) {
      console.error('❌ Failed to load room:', error);
      setConnectionError('Failed to connect to room.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveCall = () => {
    console.log('Leave call triggered');
    setLocation('/home');
  };

  const handleGoHome = () => {
    setLocation('/home');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const copyRoomLink = () => {
    const link = roomData?.shareLink || `${window.location.origin}/room/${roomCode}`;
    navigator.clipboard.writeText(link).then(() => {
      toast({
        title: "Link Copied!",
        description: "Room link copied to clipboard",
      });
    }).catch(() => {
      toast({
        title: "Copy Failed",
        description: "Failed to copy room link",
        variant: "destructive",
      });
    });
  };

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode).then(() => {
        toast({
          title: "Room Code Copied!",
          description: "Room code copied to clipboard",
        });
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Connecting to Room
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we connect you to {roomCode}...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (connectionError && !roomData) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <Card className="p-6 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-xl">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Connection Failed
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {connectionError}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => window.location.reload()}
                  className="flex-1"
                >
                  Try Again
                </Button>
                <Button
                  onClick={handleGoHome}
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // If we don't have token yet, show loading
  if (!token || !serverUrl) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div data-lk-theme="default" className="h-screen bg-background flex flex-col">
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        connect={true}
        onConnected={() => {
          console.log('✅ LiveKitRoom connected!');
          toast({
            title: "Connected",
            description: "Successfully connected to the room",
          });
        }}
        onDisconnected={() => {
          console.log('⚠️ LiveKitRoom disconnected');
        }}
        onError={(error) => {
          console.error('❌ LiveKitRoom error:', error);
          toast({
            title: "Connection Error",
            description: error.message,
            variant: "destructive",
          });
        }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg" data-testid="text-room-name">
                  {roomData?.name || 'Loading...'}
                </h1>
                <Badge variant="default" className="text-xs">
                  Connected
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Room: {roomCode}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyRoomCode}
                  className="h-5 px-1 text-xs"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <ParticipantCount />
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowParticipants(!showParticipants)}
              className={showParticipants ? 'bg-accent' : ''}
              data-testid="button-participants"
            >
              <Users className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowChat(!showChat)}
              className={showChat ? 'bg-accent' : ''}
              data-testid="button-chat"
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowFileShare(!showFileShare)}
              className={showFileShare ? 'bg-accent' : ''}
              data-testid="button-file-share"
            >
              <Share2 className="w-4 h-4" />
            </Button>

            <Button 
              variant="ghost" 
              size="sm"
              onClick={copyRoomLink}
              data-testid="button-share-link"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={toggleFullscreen}
              data-testid="button-fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              data-testid="button-settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleLeaveCall}
              data-testid="button-leave-call"
            >
              <PhoneOff className="w-4 h-4 mr-2" />
              Leave
            </Button>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Video Area */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex-1 relative"
          >
            <div style={{ height: 'calc(100vh - 80px)' }}>
              <VideoConference />
            </div>
          </motion.div>

          {/* Side Panels */}
          {(showChat || showParticipants || showFileShare) && (
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="w-80 border-l bg-card/95 backdrop-blur-sm flex flex-col overflow-hidden"
              style={{ height: 'calc(100vh - 80px)' }}
            >
              {showChat && (
                <ChatPanel 
                  roomId={roomCode || ''}
                  userId={user?.username || ''}
                  userName={user?.displayName || ''}
                  onClose={() => setShowChat(false)}
                />
              )}
              {showParticipants && (
                <ParticipantsList 
                  onClose={() => setShowParticipants(false)}
                />
              )}
              {showFileShare && (
                <FileShare 
                  roomId={roomCode || ''}
                  onClose={() => setShowFileShare(false)}
                />
              )}
            </motion.div>
          )}
        </div>
      </LiveKitRoom>
    </div>
  );
};

// Component to show participant count (must be inside RoomContext)
function ParticipantCount() {
  const participants = useParticipants();
  
  return (
    <Badge variant="secondary" className="text-xs">
      <Users className="w-3 h-3 mr-1" />
      {participants.length}
    </Badge>
  );
}

export default RoomPage;
