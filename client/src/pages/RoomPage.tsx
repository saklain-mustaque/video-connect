import React, { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { 
  LiveKitRoom,
  VideoConference,
  useParticipants,
  useLocalParticipant,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { 
  Phone, 
  MessageSquare, 
  Users, 
  Share2, 
  Settings,
  Minimize2,
  Maximize2,
  Copy,
  ExternalLink,
  AlertCircle,
  Loader2,
  Home,
  Menu,
  X
} from 'lucide-react';
import ChatPanel from '@/components/ChatPanel';
import { CustomVideoConference } from '@/components/CustomVideoConference';
import ParticipantsList from '@/components/ParticipantsList';
import FileShare from '@/components/FileShare';
import { RecordingButton } from '@/components/RecordingButton';
import { useLiveKitToken } from '@/hooks/use-livekit-token';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion } from 'framer-motion';
import ThemeToggle from '@/components/ThemeToggle';

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
  const isMobile = useIsMobile();
  
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [activePanel, setActivePanel] = useState<'chat' | 'participants' | 'fileShare' | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const showChat = activePanel === 'chat';
  const showParticipants = activePanel === 'participants';
  const showFileShare = activePanel === 'fileShare';
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  
  const { generateToken, isLoading: tokenLoading } = useLiveKitToken();

  // Close mobile menu when panel changes
  useEffect(() => {
    if (activePanel && isMobile) {
      setShowMobileMenu(false);
    }
  }, [activePanel, isMobile]);

  // Load room data and generate token
  useEffect(() => {
    if (!roomCode || !user) return;
    
    loadRoomAndConnect();
  }, [roomCode, user]);

  // Listen for fullscreen changes (when user exits with ESC or browser controls)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const loadRoomAndConnect = async () => {
    if (!roomCode || !user) return;
    
    try {
      setIsLoading(true);
      setConnectionError(null);
      
      console.log('🔄 Loading room data for:', roomCode);
      
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

  const togglePanel = (panel: 'chat' | 'participants' | 'fileShare') => {
    setActivePanel(activePanel === panel ? null : panel);
  };


 const MySettingsComponent = () => {
  // You can add state and logic here for your settings
  const [micEnabled, setMicEnabled] = React.useState(true);
  const [cameraEnabled, setCameraEnabled] = React.useState(true);

  return (
    // The 'lk-settings-menu' class is important for styling
    <div className="lk-settings-menu">
      <h3>Settings</h3>
      <p>Configure your audio and video devices here.</p>
      
      <div className="lk-settings-content">
        <label>
          <input
            type="checkbox"
            checked={micEnabled}
            onChange={(e) => setMicEnabled(e.target.checked)}
          />
          Enable Microphone
        </label>
        
        <label>
          <input
            type="checkbox"
            checked={cameraEnabled}
            onChange={(e) => setCameraEnabled(e.target.checked)}
          />
          Enable Camera
        </label>
      </div>

      {/* Note: The close button is handled by the ControlBar's state management,
          so you don't necessarily need to add one here unless you want custom behavior. */}
    </div>
  );
};

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 max-w-sm"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Connecting to Room
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
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
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                  {connectionError}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
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
          setLocation('/home');
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
        {/* Header - Mobile Responsive */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-3 sm:p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0"
        >
          {/* Mobile: Hamburger + Title */}
          {isMobile ? (
            <>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="flex-shrink-0 h-10 w-10">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[280px] sm:w-[350px] p-0">
                    <div className="flex flex-col h-full">
                      <div className="p-4 border-b">
                        <h2 className="font-semibold text-lg">Menu</h2>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-12 text-base"
                          onClick={() => {
                            togglePanel('participants');
                            setShowMobileMenu(false);
                          }}
                        >
                          <Users className="w-5 h-5 mr-3" />
                          Participants
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-12 text-base"
                          onClick={() => {
                            togglePanel('chat');
                            setShowMobileMenu(false);
                          }}
                        >
                          <MessageSquare className="w-5 h-5 mr-3" />
                          Chat
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-12 text-base"
                          onClick={() => {
                            togglePanel('fileShare');
                            setShowMobileMenu(false);
                          }}
                        >
                          <Share2 className="w-5 h-5 mr-3" />
                          File Share
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-12 text-base"
                          onClick={() => {
                            copyRoomLink();
                            setShowMobileMenu(false);
                          }}
                        >
                          <ExternalLink className="w-5 h-5 mr-3" />
                          Share Link
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-12 text-base"
                          onClick={() => {
                            toggleFullscreen();
                            setShowMobileMenu(false);
                          }}
                        >
                          {isFullscreen ? (
                            <>
                              <Minimize2 className="w-5 h-5 mr-3" />
                              Exit Fullscreen
                            </>
                          ) : (
                            <>
                              <Maximize2 className="w-5 h-5 mr-3" />
                              Fullscreen
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="p-4 border-t space-y-2">
                        <div className="text-sm text-muted-foreground">
                          Room Code: {roomCode}
                        </div>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            copyRoomCode();
                            setShowMobileMenu(false);
                          }}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Code
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="font-bold text-base sm:text-lg truncate" data-testid="text-room-name">
                      {roomData?.name || 'Loading...'}
                    </h1>
                    <Badge variant="default" className="text-xs flex-shrink-0">
                      <ParticipantCount />
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* Mobile: Essential controls only */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <MediaStreamCapture 
                  roomId={roomData?.id || ''}
                  roomCode={roomCode || ''}
                  roomName={roomData?.name || ''}
                  userName={user?.displayName || user?.username || 'You'}
                  onStreamReady={setMediaStream}
                />
              </div>
            </>
          ) : (
            /* Desktop: Full header */
            <>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
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
                <ThemeToggle />
                <ParticipantCountBadge />
                
                <MediaStreamCapture 
                  roomId={roomData?.id || ''}
                  roomCode={roomCode || ''}
                  roomName={roomData?.name || ''}
                  userName={user?.displayName || user?.username || 'You'}
                  onStreamReady={setMediaStream}
                />
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => togglePanel('participants')}
                  className={showParticipants ? 'bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30' : 'hover:bg-primary/10'}
                  data-testid="button-participants"
                >
                  <Users className="w-4 h-4" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => togglePanel('fileShare')}
                  className={showFileShare ? 'bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30' : 'hover:bg-primary/10'}
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
              </div>
            </>
          )}
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Video Area */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex-1 relative"
          >
            <div style={{ height: isMobile ? 'calc(100vh - 60px)' : 'calc(100vh - 80px)' }}>
              <CustomVideoConference
                roomId={roomCode}
                userId={user?.username || ''}
                userName={user?.displayName || ''}
              />
            </div>
          </motion.div>

          {/* Side Panels - Desktop */}
          {!isMobile && (showChat || showParticipants || showFileShare) && (
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="w-80 lg:w-96 border-l bg-card/95 backdrop-blur-sm flex flex-col overflow-hidden"
              style={{ height: 'calc(100vh - 80px)' }}
            >
              {/* {showChat && (
                <ChatPanel 
                  roomId={roomCode || ''}
                  userId={user?.username || ''}
                  userName={user?.displayName || ''}
                  onClose={() => setActivePanel(null)}
                />
              )} */}
              {showParticipants && (
                <ParticipantsList 
                  onClose={() => setActivePanel(null)}
                />
              )}
              {showFileShare && (
                <FileShare 
                  roomId={roomCode || ''}
                  onClose={() => setActivePanel(null)}
                />
              )}
            </motion.div>
          )}

          {/* Side Panels - Mobile (Sheet) */}
          {isMobile && (
            <>
              {/* <Sheet open={showChat} onOpenChange={(open) => !open && setActivePanel(null)}>
                <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-2xl">
                  <ChatPanel 
                    roomId={roomCode || ''}
                    userId={user?.username || ''}
                    userName={user?.displayName || ''}
                    onClose={() => setActivePanel(null)}
                  />
                </SheetContent>
              </Sheet> */}

              <Sheet open={showParticipants} onOpenChange={(open) => !open && setActivePanel(null)}>
                <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-2xl">
                  <ParticipantsList 
                    onClose={() => setActivePanel(null)}
                  />
                </SheetContent>
              </Sheet>

              <Sheet open={showFileShare} onOpenChange={(open) => !open && setActivePanel(null)}>
                <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-2xl">
                  <FileShare 
                    roomId={roomCode || ''}
                    onClose={() => setActivePanel(null)}
                  />
                </SheetContent>
              </Sheet>
            </>
          )}
        </div>
      </LiveKitRoom>
    </div>
  );
};

// Component to show participant count (must be inside RoomContext)
function ParticipantCount() {
  const participants = useParticipants();
  return <>{participants.length}</>;
}

// Separate badge component for desktop
function ParticipantCountBadge() {
  const participants = useParticipants();
  
  return (
    <Badge variant="secondary" className="text-xs">
      <Users className="w-3 h-3 mr-1" />
      {participants.length}
    </Badge>
  );
}

// Component to capture media stream and provide recording button
interface MediaStreamCaptureProps {
  roomId: string;
  roomCode: string;
  roomName: string;
  userName: string;
  onStreamReady: (stream: MediaStream | null) => void;
}

function MediaStreamCapture({ roomId, roomCode, roomName, userName, onStreamReady }: MediaStreamCaptureProps) {
  const { localParticipant } = useLocalParticipant();
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (!localParticipant) {
      console.log('Local participant not available yet');
      setMediaStream(null);
      onStreamReady(null);
      return;
    }

    const updateMediaStream = () => {
      const stream = new MediaStream();

      // Add video tracks
      const videoTrackPublications = Array.from(localParticipant.videoTrackPublications.values());
      for (const pub of videoTrackPublications) {
        if (pub.track && pub.track.mediaStreamTrack) {
          stream.addTrack(pub.track.mediaStreamTrack);
          console.log('✅ Added video track to recording stream:', {
            kind: pub.track.kind,
            sid: pub.trackSid,
            enabled: pub.track.mediaStreamTrack.enabled
          });
        }
      }

      // Add audio tracks
      const audioTrackPublications = Array.from(localParticipant.audioTrackPublications.values());
      for (const pub of audioTrackPublications) {
        if (pub.track && pub.track.mediaStreamTrack) {
          stream.addTrack(pub.track.mediaStreamTrack);
          console.log('✅ Added audio track to recording stream:', {
            kind: pub.track.kind,
            sid: pub.trackSid,
            enabled: pub.track.mediaStreamTrack.enabled
          });
        }
      }

      console.log('📹 MediaStream updated for recording:', {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
        totalTracks: stream.getTracks().length,
        allTracksEnabled: stream.getTracks().every(t => t.enabled)
      });

      // Only set stream if it has tracks
      if (stream.getTracks().length > 0) {
        setMediaStream(stream);
        onStreamReady(stream);
      } else {
        console.warn('⚠️ No tracks available in media stream yet');
        setMediaStream(null);
        onStreamReady(null);
      }
    };

    // Initial update
    updateMediaStream();

    // Listen for track publications and updates
    const handleTrackPublished = () => {
      console.log('🔄 Track published, updating media stream');
      updateMediaStream();
    };

    const handleTrackUnpublished = () => {
      console.log('🔄 Track unpublished, updating media stream');
      updateMediaStream();
    };

    localParticipant.on('trackPublished', handleTrackPublished);
    localParticipant.on('trackUnpublished', handleTrackUnpublished);
    localParticipant.on('localTrackPublished', handleTrackPublished);
    localParticipant.on('localTrackUnpublished', handleTrackUnpublished);

    // Also update when track states change
    const handleTrackMuted = () => {
      console.log('🔄 Track muted/unmuted, updating media stream');
      updateMediaStream();
    };

    localParticipant.on('trackMuted', handleTrackMuted);
    localParticipant.on('trackUnmuted', handleTrackMuted);

    // Cleanup listeners
    return () => {
      localParticipant.off('trackPublished', handleTrackPublished);
      localParticipant.off('trackUnpublished', handleTrackUnpublished);
      localParticipant.off('localTrackPublished', handleTrackPublished);
      localParticipant.off('localTrackUnpublished', handleTrackUnpublished);
      localParticipant.off('trackMuted', handleTrackMuted);
      localParticipant.off('trackUnmuted', handleTrackMuted);
    };
  }, [localParticipant, onStreamReady]);

  return (
    <RecordingButton
      roomId={roomId}
      roomCode={roomCode}
      roomName={roomName}
      mediaStream={mediaStream}
      userName={userName}
    />
  );
}

export default RoomPage;
