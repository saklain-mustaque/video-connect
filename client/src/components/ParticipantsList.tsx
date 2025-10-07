import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { 
  X, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Volume2,
  Signal,
  MoreVertical,
  UserX,
  Shield,
  VolumeX,
  Pin,
  Copy,
  MessageSquare,
  Users,
  Activity
} from "lucide-react";
import { 
  useParticipants,
  useLocalParticipant,
} from '@livekit/components-react';
import type { Participant, ConnectionQuality } from 'livekit-client';
import { motion, AnimatePresence } from 'framer-motion';

interface ParticipantsListProps {
  onClose: () => void;
}

function getConnectionQualityColor(quality: ConnectionQuality): string {
  switch (quality) {
    case 'excellent':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'good':
      return 'text-blue-600 dark:text-blue-400';
    case 'poor':
      return 'text-amber-600 dark:text-amber-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

function getConnectionQualityLabel(quality: ConnectionQuality): string {
  switch (quality) {
    case 'excellent':
      return 'Excellent';
    case 'good':
      return 'Good';
    case 'poor':
      return 'Poor';
    case 'lost':
      return 'Lost';
    default:
      return 'Unknown';
  }
}

function ParticipantTile({ participant, isLocal, localParticipant, index }: { 
  participant: Participant; 
  isLocal: boolean;
  localParticipant?: any;
  index: number;
}) {
  const { toast } = useToast();
  
  const getInitials = (name: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = participant.name || participant.identity || 'Unknown';
  const isAudioEnabled = participant.isMicrophoneEnabled;
  const isVideoEnabled = participant.isCameraEnabled;
  const isSpeaking = participant.isSpeaking;
  const connectionQuality = participant.connectionQuality || 'unknown';

  const handleMicToggle = async () => {
    if (!isLocal || !localParticipant) {
      toast({
        title: "Action Not Allowed",
        description: "You can only control your own microphone",
        variant: "destructive",
      });
      return;
    }

    try {
      const enabled = localParticipant.isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(!enabled);
      
      toast({
        title: enabled ? "Microphone Off" : "Microphone On",
        description: enabled ? "Your microphone has been muted" : "Your microphone is now active",
      });
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
      toast({
        title: "Error",
        description: "Failed to toggle microphone",
        variant: "destructive",
      });
    }
  };

  const handleCameraToggle = async () => {
    if (!isLocal || !localParticipant) {
      toast({
        title: "Action Not Allowed",
        description: "You can only control your own camera",
        variant: "destructive",
      });
      return;
    }

    try {
      const enabled = localParticipant.isCameraEnabled;
      await localParticipant.setCameraEnabled(!enabled);
      
      toast({
        title: enabled ? "Camera Off" : "Camera On",
        description: enabled ? "Your camera has been turned off" : "Your camera is now active",
      });
    } catch (error) {
      console.error('Failed to toggle camera:', error);
      toast({
        title: "Error",
        description: "Failed to toggle camera",
        variant: "destructive",
      });
    }
  };

  const handleCopyParticipantId = () => {
    navigator.clipboard.writeText(participant.identity).then(() => {
      toast({
        title: "Copied!",
        description: "Participant ID copied to clipboard",
      });
    });
  };

  const handlePrivateMessage = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Private messaging will be available in a future update",
    });
  };

  const handlePinParticipant = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Pin participant will be available in a future update",
    });
  };

  const handleMuteParticipant = () => {
    if (isLocal) {
      toast({
        title: "Not Applicable",
        description: "You cannot mute yourself from here. Use the microphone button instead.",
      });
      return;
    }
    
    toast({
      title: "Feature Coming Soon",
      description: "Remote participant control will be available for room moderators",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`group relative flex items-center gap-3 p-4 rounded-xl border transition-all duration-300 ${
        isSpeaking 
          ? 'border-primary bg-primary/5 shadow-lg' 
          : 'border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 hover:shadow-md'
      } backdrop-blur-sm`}
      data-testid={`participant-${participant.sid}`}
    >
      {/* Speaking Indicator Animation */}
      {isSpeaking && (
        <motion.div
          className="absolute inset-0 rounded-xl border-2 border-primary"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ 
            opacity: [0.5, 1, 0.5],
            scale: [0.98, 1.02, 0.98]
          }}
          transition={{ 
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

      {/* Avatar with Status */}
      <div className="relative flex-shrink-0">
        <Avatar className={`w-12 h-12 ring-2 ring-offset-2 ring-offset-background transition-all duration-300 ${
          isSpeaking ? 'ring-primary shadow-lg shadow-primary/20' : 'ring-border'
        }`}>
          <AvatarFallback className="gradient-primary text-white text-sm font-bold">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        
        {/* Speaking/Active Indicator */}
        {isSpeaking && (
          <motion.div 
            className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-lg"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          >
            <Volume2 className="w-3 h-3 text-white" />
          </motion.div>
        )}
        
        {/* Online Status Dot */}
        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-background shadow-sm" />
      </div>

      {/* Participant Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-semibold text-sm truncate" data-testid={`participant-name-${participant.sid}`}>
            {displayName}
          </p>
          {isLocal && (
            <Badge className="badge-modern text-xs px-2 py-0.5">
              <Shield className="w-3 h-3 mr-1" />
              You
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">{participant.sid.slice(0, 8)}</span>
          
          {connectionQuality && connectionQuality !== 'unknown' && (
            <>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Signal className={`w-3 h-3 ${getConnectionQualityColor(connectionQuality)}`} />
                <span className={getConnectionQualityColor(connectionQuality)}>
                  {getConnectionQualityLabel(connectionQuality)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* Microphone Control */}
        <Button
          variant="ghost"
          size="icon"
          className={`w-9 h-9 rounded-lg transition-all duration-200 ${
            isAudioEnabled
              ? 'hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'hover:bg-red-500/10 text-red-600 dark:text-red-400'
          }`}
          onClick={handleMicToggle}
          disabled={!isLocal}
          data-testid={`control-audio-${participant.sid}`}
          title={isLocal ? (isAudioEnabled ? 'Mute Microphone' : 'Unmute Microphone') : 'Microphone Status'}
        >
          {isAudioEnabled ? (
            <Mic className="w-4 h-4" />
          ) : (
            <MicOff className="w-4 h-4" />
          )}
        </Button>
        
        {/* Camera Control */}
        <Button
          variant="ghost"
          size="icon"
          className={`w-9 h-9 rounded-lg transition-all duration-200 ${
            isVideoEnabled
              ? 'hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'hover:bg-red-500/10 text-red-600 dark:text-red-400'
          }`}
          onClick={handleCameraToggle}
          disabled={!isLocal}
          data-testid={`control-video-${participant.sid}`}
          title={isLocal ? (isVideoEnabled ? 'Turn Off Camera' : 'Turn On Camera') : 'Camera Status'}
        >
          {isVideoEnabled ? (
            <Video className="w-4 h-4" />
          ) : (
            <VideoOff className="w-4 h-4" />
          )}
        </Button>
        
        {/* More Options Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-200"
              data-testid={`button-more-${participant.sid}`}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleCopyParticipantId}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Participant ID
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={handlePinParticipant}>
              <Pin className="mr-2 h-4 w-4" />
              {isLocal ? 'Pin My Video' : 'Pin Participant'}
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={handlePrivateMessage}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Private Message
            </DropdownMenuItem>
            
            {!isLocal && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleMuteParticipant}
                  className="text-orange-600 dark:text-orange-400"
                >
                  <VolumeX className="mr-2 h-4 w-4" />
                  Mute Participant
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  className="text-red-600 dark:text-red-400"
                  onClick={() => {
                    toast({
                      title: "Feature Coming Soon",
                      description: "Participant removal will be available for room moderators",
                    });
                  }}
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Remove Participant
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}

export default function ParticipantsList({ onClose }: ParticipantsListProps) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  const audioActiveCount = participants.filter(p => p.isMicrophoneEnabled).length;
  const videoActiveCount = participants.filter(p => p.isCameraEnabled).length;
  const speakingCount = participants.filter(p => p.isSpeaking).length;

  return (
    <Card className="h-full flex flex-col border-0 rounded-none modern-card">
      {/* Modern Header */}
      <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 border-b bg-card/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold">Participants</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {participants.length} {participants.length === 1 ? 'person' : 'people'} in call
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onClose}
          className="hover:bg-destructive/10 hover:text-destructive transition-all duration-200 flex-shrink-0"
          data-testid="button-close-participants"
          aria-label="Close participants panel"
        >
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 p-4 sm:p-6 overflow-y-auto flex flex-col gap-6">
        {/* Participants List */}
        <div className="space-y-3">
          {participants.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-12 text-muted-foreground"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <p className="text-base font-semibold mb-1">No participants yet</p>
              <p className="text-sm text-muted-foreground">Waiting for others to join...</p>
            </motion.div>
          ) : (
            <AnimatePresence>
              {participants.map((participant, index) => (
                <ParticipantTile 
                  key={participant.sid} 
                  participant={participant}
                  isLocal={participant.sid === localParticipant?.sid}
                  localParticipant={localParticipant}
                  index={index}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Stats Section */}
        {participants.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-auto pt-6 border-t space-y-3"
          >
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Room Statistics</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-card/50 border border-border/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <Badge variant="secondary" className="badge-modern">
                    {participants.length}
                  </Badge>
                </div>
                <p className="text-lg font-bold mt-1">{participants.length}</p>
              </div>
              
              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">Audio On</span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    {audioActiveCount}
                  </Badge>
                </div>
                <p className="text-lg font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                  {audioActiveCount}
                </p>
              </div>
              
              <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-600 dark:text-blue-400">Video On</span>
                  <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                    {videoActiveCount}
                  </Badge>
                </div>
                <p className="text-lg font-bold mt-1 text-blue-600 dark:text-blue-400">
                  {videoActiveCount}
                </p>
              </div>
              
              <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-purple-600 dark:text-purple-400">Speaking</span>
                  <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                    {speakingCount}
                  </Badge>
                </div>
                <p className="text-lg font-bold mt-1 text-purple-600 dark:text-purple-400">
                  {speakingCount}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
