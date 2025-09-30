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
  MoreVertical,
  Volume2,
  Signal,
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

// Simplified participant tile that doesn't rely on participant-specific context
function ParticipantTile({ participant, isLocal }: { participant: Participant; isLocal: boolean }) {
  
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
  const isSpeaking = participant.isSpeaking;
  const connectionQuality = participant.connectionQuality || 'unknown';

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

      {/* Status Indicators */}
      <div className="flex items-center gap-1">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent"
          data-testid={`indicator-audio-${participant.sid}`}
          title={isAudioEnabled ? 'Mic On' : 'Mic Off'}
        >
          {isAudioEnabled ? (
            <Mic className="w-4 h-4 text-green-600 dark:text-green-400" />
          ) : (
            <MicOff className="w-4 h-4 text-red-600 dark:text-red-400" />
          )}
        </div>
        
        <div
          className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent"
          data-testid={`indicator-video-${participant.sid}`}
          title={isVideoEnabled ? 'Camera On' : 'Camera Off'}
        >
          {isVideoEnabled ? (
            <Video className="w-4 h-4 text-green-600 dark:text-green-400" />
          ) : (
            <VideoOff className="w-4 h-4 text-red-600 dark:text-red-400" />
          )}
        </div>
        
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
