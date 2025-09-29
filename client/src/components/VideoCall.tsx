import { useState, useEffect } from "react";
import { 
  ControlBar,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  RoomContext,
  useParticipants,
} from '@livekit/components-react';
import { Room, Track } from 'livekit-client';
import '@livekit/components-styles';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Phone, 
  MessageSquare, 
  Users, 
  Share2, 
  Settings,
  PhoneOff,
  Minimize2,
  Maximize2,
  UserRoundIcon
} from "lucide-react";
import ChatPanel from "./ChatPanel";
import ParticipantsList from "./ParticipantsList";
import FileShare from "./FileShare";
import SettingsPanel from "./SettingsPanel";
import { useLiveKitToken } from "../hooks/use-livekit-token";
import { useToast } from "../hooks/use-toast";

interface VideoCallProps {
  roomCode: string;
  roomName: string;
  username: string;
  displayName: string;
  onLeaveCall: () => void;
}


export default function VideoCall({ roomCode, roomName, username, displayName, onLeaveCall }: VideoCallProps) {
  const [room] = useState(() => new Room({
    adaptiveStream: true,
    dynacast: true,
  }));
  
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showFileShare, setShowFileShare] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const { generateToken, isLoading: tokenLoading, error: tokenError } = useLiveKitToken();
  const { toast } = useToast();

  // Remove useParticipants from here - it will be called inside RoomContext

useEffect(() => {
    let mounted = true;
    
    const connect = async () => {
      try {
        if (!mounted) return;
        
        console.log('🔄 Connecting to LiveKit room...', { roomCode, userId: username, displayName });
        setConnectionError(null);
        
        // Generate token from server
        const tokenData = await generateToken({
          roomCode,
          userId: username,
          displayName,
          metadata: {
            username,
            joinedAt: new Date().toISOString(),
          },
        });
        
        if (!tokenData || !mounted) {
          console.error('❌ Failed to get token data');
          setConnectionError('Failed to generate access token');
          return;
        }
        
        console.log('✅ Token received, connecting to room...');
        
        // Connect to LiveKit room
        await room.connect(tokenData.serverUrl, tokenData.token);
        
        if (mounted) {
          setIsConnected(true);
          console.log('✅ Connected to LiveKit room successfully');
          
          toast({
            title: "Connected!",
            description: `Joined ${tokenData.roomName} successfully.`,
          });
        }
      } catch (error) {
        console.error('❌ Failed to connect to room:', error);
        if (mounted) {
          const errorMessage = error instanceof Error ? error.message : 'Connection failed';
          setConnectionError(errorMessage);
          
          toast({
            title: "Connection Error",
            description: errorMessage,
            variant: "destructive",
          });
        }
      }
    };

    connect();

    return () => {
      mounted = false;
      room.disconnect();
    };
  }, [room]);

  const handleLeaveCall = () => {
    console.log('Leave call triggered');
    room.disconnect();
    onLeaveCall();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    console.log('Fullscreen toggle triggered');
  };

  return (
    <RoomContext.Provider value={room}>
      <div data-lk-theme="default" className="h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <Phone className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold" data-testid="text-room-name">{roomName}</h1>
              <p className="text-sm text-muted-foreground">Room: {roomCode}</p>
            </div>
            <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
              {isConnected ? "Connected" : "Connecting..."}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <ParticipantCountBadge />
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowParticipants(!showParticipants)}
              data-testid="button-participants"
            >
              <Users className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowChat(!showChat)}
              data-testid="button-chat"
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowFileShare(!showFileShare)}
              data-testid="button-file-share"
            >
              <Share2 className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleFullscreen}
              data-testid="button-fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
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
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Video Area */}
          <div className="flex-1 relative">
            <MyVideoConference />
            <RoomAudioRenderer />
            
            {/* Floating Control Bar */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
              <Card className="p-2">
                <ControlBar />
              </Card>
            </div>
          </div>

          {/* Side Panels */}
          {(showChat || showParticipants || showFileShare || showSettings) && (
            <div className="w-80 border-l bg-card flex flex-col">
              {showChat && (
                <ChatPanel 
                  roomId={roomCode}
                  userId={username}
                  userName={displayName}
                  onClose={() => setShowChat(false)}
                />
              )}
              {showParticipants && isConnected && (
                <ParticipantsList 
                  onClose={() => setShowParticipants(false)}
                />
              )}
              {showFileShare && (
                <FileShare 
                  roomId={roomCode}
                  userName={displayName}
                  onClose={() => setShowFileShare(false)}
                />
              )}
              {showSettings && (
                <SettingsPanel 
                  onClose={() => setShowSettings(false)}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </RoomContext.Provider>
  );
}

// Component to display participant count badge (must be inside RoomContext)
function ParticipantCountBadge() {
  const participants = useParticipants();
  
  return (
    <Badge variant="secondary" className="text-xs">
      <Users className="w-3 h-3 mr-1" />
      {participants.length}
    </Badge>
  );
}

function MyVideoConference() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  
  return (
    <GridLayout 
      tracks={tracks} 
      style={{ height: 'calc(100vh - 80px)' }}
      className="p-4"
    >
      <ParticipantTile />
    </GridLayout>
  );
}