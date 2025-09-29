import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Crown, 
  MoreVertical,
  Volume2,
  VolumeX 
} from "lucide-react";
import { 
  useParticipants,
  ParticipantLoop,
  ParticipantName,
  ParticipantAudioTile,
  useLocalParticipant,
  ConnectionQualityIndicator,
} from '@livekit/components-react';
import { Participant } from 'livekit-client';

interface ParticipantsListProps {
  onClose: () => void;
}

// Enhanced participant tile component using LiveKit components
function EnhancedParticipantTile({ participant }: { participant: Participant }) {
  const { localParticipant } = useLocalParticipant();
  const isLocal = participant.sid === localParticipant?.sid;
  
  const getInitials = (name: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleParticipantAction = (action: string) => {
    console.log(`${action} triggered for participant:`, participant.identity);
  };

  const displayName = participant.name || participant.identity || 'Unknown';
  const isAudioEnabled = participant.isMicrophoneEnabled;
  const isVideoEnabled = participant.isCameraEnabled;
  const connectionQuality = participant.connectionQuality;
  const isSpeaking = participant.isSpeaking;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover-elevate" data-testid={`participant-${participant.sid}`}>
      {/* Avatar with LiveKit Audio Tile */}
      <div className="relative">
        <Avatar className="w-10 h-10">
          <AvatarFallback className="text-sm font-medium">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        
        {/* Connection quality indicator */}
        <div className="absolute -bottom-1 -right-1">
          <ConnectionQualityIndicator className="w-3 h-3" />
        </div>
        
        {/* Speaking indicator */}
        {isSpeaking && (
          <div className="absolute inset-0 rounded-full border-2 border-primary animate-pulse" />
        )}
      </div>

      {/* Participant Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate" data-testid={`participant-name-${participant.sid}`}>
            {displayName} {isLocal && '(You)'}
          </p>
          {isSpeaking && (
            <div className="flex items-center">
              <Volume2 className="w-4 h-4 text-primary animate-pulse" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Connected</span>
          {connectionQuality && (
            <Badge variant="outline" className="text-xs">
              {connectionQuality}
            </Badge>
          )}
        </div>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={() => handleParticipantAction('toggle-audio')}
          data-testid={`button-audio-${participant.sid}`}
        >
          {isAudioEnabled ? (
            <Mic className="w-4 h-4 text-green-500" />
          ) : (
            <MicOff className="w-4 h-4 text-red-500" />
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={() => handleParticipantAction('toggle-video')}
          data-testid={`button-video-${participant.sid}`}
        >
          {isVideoEnabled ? (
            <Video className="w-4 h-4 text-green-500" />
          ) : (
            <VideoOff className="w-4 h-4 text-red-500" />
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={() => handleParticipantAction('more-options')}
          data-testid={`button-more-${participant.sid}`}
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function ParticipantsList({ onClose }: ParticipantsListProps) {
  // Get real participants from LiveKit
  const participants = useParticipants();

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
      
      <CardContent className="flex-1 p-4">
        <div className="space-y-3">
          {/* Render each participant with their data */}
          {participants.map((participant) => (
            <EnhancedParticipantTile key={participant.sid} participant={participant} />
          ))}
        </div>

        {/* Footer Stats */}
        <div className="mt-6 pt-4 border-t space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Online</span>
            <Badge variant="secondary">
              {participants.filter(p => p.connectionQuality !== 'unknown').length}/{participants.length}
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
        </div>
      </CardContent>
    </Card>
  );
}