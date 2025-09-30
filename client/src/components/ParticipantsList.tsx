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
  MessageSquare
} from "lucide-react";
import { 
  useParticipants,
  useLocalParticipant,
} from '@livekit/components-react';
import type { Participant, ConnectionQuality } from 'livekit-client';

interface ParticipantsListProps {
  onClose: () => void;
}

// Helper function to get connection quality color
function getConnectionQualityColor(quality: ConnectionQuality): string {
  switch (quality) {
    case 'excellent':
      return 'text-green-600 dark:text-green-400';
    case 'good':
      return 'text-blue-600 dark:text-blue-400';
    case 'poor':
      return 'text-yellow-600 dark:text-yellow-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

// Helper function to get connection quality label
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

// Enhanced participant tile with working controls and more options
function ParticipantTile({ participant, isLocal, localParticipant }: { 
  participant: Participant; 
  isLocal: boolean;
  localParticipant?: any;
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

  // Handle microphone toggle (only for local participant)
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

  // Handle camera toggle (only for local participant)
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

  // Handle more actions
  const handleCopyParticipantId = () => {
    navigator.clipboard.writeText(participant.identity).then(() => {
      toast({
        title: "Copied!",
        description: "Participant ID copied to clipboard",
      });
    });
  };

  const handlePrivateMessage = () => {
    // Placeholder for private messaging functionality
    toast({
      title: "Feature Coming Soon",
      description: "Private messaging will be available in a future update",
    });
  };

  const handlePinParticipant = () => {
    // Placeholder for pinning participant (focusing their video)
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
    
    // This would require admin privileges in a real implementation
    toast({
      title: "Feature Coming Soon",
      description: "Remote participant control will be available for room moderators",
    });
  };

  return (
    <div 
      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors" 
      data-testid={`participant-${participant.sid}`}
    >
      {/* Avatar */}
      <div className="relative">
        <Avatar className={`w-10 h-10 ${isSpeaking ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
          <AvatarFallback className="text-sm font-medium">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        
        {/* Speaking indicator */}
        {isSpeaking && (
          <div className="absolute -top-1 -right-1">
            <Volume2 className="w-4 h-4 text-primary animate-pulse" />
          </div>
        )}
      </div>

      {/* Participant Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate" data-testid={`participant-name-${participant.sid}`}>
            {displayName} {isLocal && '(You)'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="text-xs">{participant.sid.slice(0, 8)}</span>
          {connectionQuality && connectionQuality !== 'unknown' && (
            <div className="flex items-center gap-1">
              <Signal className={`w-3 h-3 ${getConnectionQualityColor(connectionQuality)}`} />
              <Badge variant="outline" className="text-xs h-5">
                {getConnectionQualityLabel(connectionQuality)}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Status Indicators and Controls */}
      <div className="flex items-center gap-1">
        {/* Microphone Control */}
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 hover:bg-accent/80 transition-colors"
          onClick={handleMicToggle}
          disabled={!isLocal}
          data-testid={`control-audio-${participant.sid}`}
          title={isLocal ? (isAudioEnabled ? 'Mute Microphone' : 'Unmute Microphone') : 'Microphone Status'}
        >
          {isAudioEnabled ? (
           <Mic className={`w-4 h-4 ${
              isLocal 
                ? 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300' 
                : 'text-green-600/60 dark:text-green-400/60'
            }`} />
          ) : (
           <MicOff className={`w-4 h-4 ${
              isLocal 
                ? 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300' 
                : 'text-red-600/60 dark:text-red-400/60'
            }`} />
          )}
        </Button>
        
        {/* Camera Control */}
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 hover:bg-accent/80 transition-colors"
          onClick={handleCameraToggle}
          disabled={!isLocal}
          data-testid={`control-video-${participant.sid}`}
          title={isLocal ? (isVideoEnabled ? 'Turn Off Camera' : 'Turn On Camera') : 'Camera Status'}
        >
          {isVideoEnabled ? (
            <VideoOff className={`w-4 h-4 ${
              isLocal 
                ? 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300' 
                : 'text-red-600/60 dark:text-red-400/60'
            }`} />
          ) : (
            <VideoOff className={`w-4 h-4 ${
              isLocal 
                ? 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300' 
                : 'text-red-600/60 dark:text-red-400/60'
            }`} />
          )}
        </Button>
        
        {/* More Options Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 hover:bg-accent/80 transition-colors"
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
            
            {isLocal && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-blue-600 dark:text-blue-400">
                  <Shield className="mr-2 h-4 w-4" />
                  You (Host)
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function ParticipantsList({ onClose }: ParticipantsListProps) {
  // Get all participants from LiveKit
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  return (
    <Card className="h-full flex flex-col border-0 rounded-none">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
        <CardTitle className="text-lg">
          Participants ({participants.length})
        </CardTitle>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onClose}
          data-testid="button-close-participants"
        >
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-3">
          {participants.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No participants yet</p>
            </div>
          ) : (
            participants.map((participant) => (
              <ParticipantTile 
                key={participant.sid} 
                participant={participant}
                isLocal={participant.sid === localParticipant?.sid}
                 localParticipant={localParticipant}
              />
            ))
          )}
        </div>

        {/* Footer Stats */}
        <div className="mt-6 pt-4 border-t space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Participants</span>
            <Badge variant="secondary">
              {participants.length}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Audio Active</span>
            <Badge variant="secondary">
              {participants.filter(p => p.isMicrophoneEnabled).length}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Video Active</span>
            <Badge variant="secondary">
              {participants.filter(p => p.isCameraEnabled).length}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Speaking</span>
            <Badge variant="secondary">
              {participants.filter(p => p.isSpeaking).length}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}