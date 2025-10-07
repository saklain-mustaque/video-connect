import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Video, 
  Download, 
  Trash2, 
  Share2, 
  Play, 
  Search, 
  Clock, 
  Users, 
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, formatDuration, intervalToDuration } from 'date-fns';
import { motion } from 'framer-motion';

interface Recording {
  id: string;
  roomId: string;
  roomCode: string;
  roomName: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  blobUrl?: string;
  fileSize?: number;
  status: 'recording' | 'processing' | 'completed' | 'failed';
  daysUntilDeletion?: number;
}

export function RecordingsTab() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordingToDelete, setRecordingToDelete] = useState<string | null>(null);
  const [playingRecording, setPlayingRecording] = useState<Recording | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadRecordings();
  }, []);

  const loadRecordings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/recordings', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load recordings');
      }

      const data = await response.json();
      
      // Calculate days until deletion for each recording
      const recordingsWithDeletion = data.map((rec: Recording) => {
        const startDate = new Date(rec.startTime);
        const now = new Date();
        const daysPassed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysUntilDeletion = Math.max(0, 3 - daysPassed);
        
        return {
          ...rec,
          daysUntilDeletion
        };
      });

      setRecordings(recordingsWithDeletion);
    } catch (error) {
      console.error('Failed to load recordings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load recordings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay = async (recording: Recording) => {
    if (recording.status !== 'completed') {
      toast({
        title: 'Recording not available',
        description: 'This recording is not ready to play yet',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Get the download URL which we'll use for playing
      const response = await fetch(`/api/recordings/${recording.id}/download`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to get playback URL');
      }

      const { downloadUrl } = await response.json();
      
      // Create a recording object with the playback URL
      setPlayingRecording({
        ...recording,
        blobUrl: downloadUrl
      });
    } catch (error) {
      console.error('Play error:', error);
      toast({
        title: 'Playback failed',
        description: 'Failed to load recording for playback',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async (recording: Recording) => {
    try {
      toast({
        title: 'Preparing download',
        description: 'Generating download link...',
      });

      const response = await fetch(`/api/recordings/${recording.id}/download`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to generate download link');
      }

      const { downloadUrl } = await response.json();
      
      // Open download in new tab
      window.open(downloadUrl, '_blank');

      toast({
        title: 'Download started',
        description: 'Your recording is being downloaded',
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download failed',
        description: 'Failed to download recording',
        variant: 'destructive',
      });
    }
  };

  const handleShare = async (recording: Recording) => {
    try {
      const shareUrl = `${window.location.origin}/room/${recording.roomCode}?recording=${recording.id}`;
      
      await navigator.clipboard.writeText(shareUrl);
      
      toast({
        title: 'Link copied!',
        description: 'Share link copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Share failed',
        description: 'Failed to copy share link',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!recordingToDelete) return;

    try {
      const response = await fetch(`/api/recordings/${recordingToDelete}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete recording');
      }

      toast({
        title: 'Recording deleted',
        description: 'Recording has been permanently deleted',
      });

      setRecordings(recordings.filter(r => r.id !== recordingToDelete));
      setDeleteDialogOpen(false);
      setRecordingToDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete failed',
        description: 'Failed to delete recording',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatRecordingDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
    return formatDuration(duration, { format: ['hours', 'minutes', 'seconds'] });
  };

  const getStatusBadge = (status: Recording['status']) => {
    const variants = {
      recording: { variant: 'default' as const, icon: Video, text: 'Recording', class: 'bg-red-500' },
      processing: { variant: 'secondary' as const, icon: Loader2, text: 'Processing', class: 'bg-yellow-500' },
      completed: { variant: 'default' as const, icon: CheckCircle, text: 'Ready', class: 'bg-green-500' },
      failed: { variant: 'destructive' as const, icon: XCircle, text: 'Failed', class: 'bg-red-500' },
    };

    const config = variants[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1.5">
        <Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
        {config.text}
      </Badge>
    );
  };

  const filteredRecordings = recordings.filter(recording =>
    recording.roomName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recording.roomCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading recordings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">My Recordings</h2>
          <p className="text-muted-foreground">
            View, download, and manage your meeting recordings
          </p>
        </div>
        
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Search recordings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200"
          />
        </div>
      </div>

      {/* Recordings List */}
      {filteredRecordings.length === 0 ? (
        <Card className="modern-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-muted/50 rounded-2xl flex items-center justify-center mb-6">
              <Video className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {searchQuery ? 'No recordings found' : 'No recordings yet'}
            </h3>
            <p className="text-muted-foreground text-center max-w-md">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Recordings from your meetings will appear here. Start a meeting and begin recording to see them here.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRecordings.map((recording, index) => (
            <motion.div
              key={recording.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="modern-card overflow-hidden group">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    {/* Recording Info */}
                    <div className="flex-1 space-y-4">
                      {/* Title and Status */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-foreground mb-1 truncate">
                            {recording.roomName}
                          </h3>
                          <p className="text-sm text-muted-foreground font-mono truncate">
                            Room: {recording.roomCode}
                          </p>
                        </div>
                        {getStatusBadge(recording.status)}
                      </div>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-muted-foreground truncate">
                            {formatDistanceToNow(new Date(recording.startTime), { addSuffix: true })}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-muted-foreground">
                            {formatRecordingDuration(recording.duration)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-muted-foreground truncate">
                            {recording.userName}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Download className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-muted-foreground">
                            {formatFileSize(recording.fileSize)}
                          </span>
                        </div>
                      </div>

                      {/* Auto-deletion Warning */}
                      {recording.status === 'completed' && recording.daysUntilDeletion !== undefined && recording.daysUntilDeletion <= 1 && (
                        <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 px-3 py-2 rounded-lg">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span>
                            {recording.daysUntilDeletion === 0
                              ? 'Deletes today'
                              : `Deletes in ${recording.daysUntilDeletion} day`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex lg:flex-col gap-2 lg:w-auto w-full">
                      <Button
                        onClick={() => handlePlay(recording)}
                        disabled={recording.status !== 'completed'}
                        className="flex-1 lg:flex-none btn-primary"
                        size="sm"
                      >
                        <Play className="w-4 h-4 lg:mr-2" />
                        <span className="hidden sm:inline">Play</span>
                      </Button>
                      
                      <Button
                        onClick={() => handleDownload(recording)}
                        disabled={recording.status !== 'completed'}
                        variant="outline"
                        size="sm"
                        className="flex-1 lg:flex-none"
                      >
                        <Download className="w-4 h-4 lg:mr-2" />
                        <span className="hidden sm:inline">Download</span>
                      </Button>
                      
                      <Button
                        onClick={() => handleShare(recording)}
                        variant="outline"
                        size="sm"
                        className="flex-1 lg:flex-none"
                      >
                        <Share2 className="w-4 h-4 lg:mr-2" />
                        <span className="hidden sm:inline">Share</span>
                      </Button>
                      
                      <Button
                        onClick={() => {
                          setRecordingToDelete(recording.id);
                          setDeleteDialogOpen(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="flex-1 lg:flex-none text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4 lg:mr-2" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Video Player Dialog */}
      {playingRecording && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-2xl max-w-5xl w-full overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-foreground">{playingRecording.roomName}</h3>
                  <p className="text-sm text-muted-foreground">Room: {playingRecording.roomCode}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPlayingRecording(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Close
                </Button>
              </div>
            </div>
            <div className="p-6">
              <video
                src={playingRecording.blobUrl}
                controls
                autoPlay
                className="w-full rounded-lg bg-black"
                style={{ maxHeight: '70vh' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recording?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the recording
              and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
