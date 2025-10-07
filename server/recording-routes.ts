import type { Express, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { recordingStorage } from './recording-storage';
import { azureBlobService } from './azure-blob-service';
import { recordingCleanupService } from './recording-cleanup-service';

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './recordings';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'recording-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (req, file, cb) => {
    // Allow video formats
    const allowedTypes = /webm|mp4|mkv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only video files are allowed (webm, mp4, mkv)'));
    }
  }
});

/**
 * Helper function to get authenticated user from session
 */
function getAuthenticatedUser(req: Request): { id: string; username: string } | null {
  // Check if user is in session
  if (req.session && (req.session as any).user) {
    return (req.session as any).user;
  }
  return null;
}

/**
 * Middleware to require authentication
 */
function requireAuth(req: Request, res: Response, next: Function) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

/**
 * Register recording-related routes
 */
export function registerRecordingRoutes(app: Express) {
  console.log('🎥 Registering recording routes...');

  /**
   * Start a new recording session
   */
  app.post('/api/recordings/start', requireAuth, async (req: Request, res: Response) => {
    try {
      const { roomId, roomCode, roomName } = req.body;
      const user = getAuthenticatedUser(req);

      if (!user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!roomId || !roomCode || !roomName) {
        res.status(400).json({ error: 'Missing required fields: roomId, roomCode, roomName' });
        return;
      }

      // Check if there's already an active recording for this room
      const existingRecording = await recordingStorage.getActiveRecording(roomId);
      if (existingRecording) {
        res.status(409).json({ 
          error: 'A recording is already in progress for this room. Please stop the current recording first.',
          recordingId: existingRecording.id
        });
        return;
      }

      // Create temporary file path
      const timestamp = Date.now();
      const localFilePath = path.join('./recordings', `temp-${timestamp}.webm`);

      // Create recording entry in database
      const recording = await recordingStorage.createRecording(
        roomId,
        roomCode,
        roomName,
        user.id,
        user.username,
        localFilePath
      );

      console.log('✅ Recording session started:', recording.id);

      res.json({
        recordingId: recording.id,
        status: 'started',
        message: 'Recording started successfully'
      });
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      res.status(500).json({ 
        error: 'Failed to start recording',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Stop a recording session
   */
  app.post('/api/recordings/:recordingId/stop', requireAuth, async (req: Request, res: Response) => {
    try {
      const { recordingId } = req.params;
      const { duration } = req.body;

      const recording = await recordingStorage.getRecording(recordingId);
      if (!recording) {
        res.status(404).json({ error: 'Recording not found' });
        return;
      }

      // Update recording with end time and duration
      await recordingStorage.updateRecording(recordingId, {
        endTime: new Date(),
        duration: duration || 0,
        status: 'processing'
      });

      console.log('✅ Recording stopped:', recordingId);

      res.json({
        recordingId,
        status: 'stopped',
        message: 'Recording stopped successfully'
      });
    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      res.status(500).json({ 
        error: 'Failed to stop recording',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Upload recorded video file
   */
  app.post('/api/recordings/:recordingId/upload', requireAuth, upload.single('video'), async (req: Request, res: Response) => {
    try {
      const { recordingId } = req.params;
      const user = getAuthenticatedUser(req);

      if (!user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No video file provided' });
        return;
      }

      const recording = await recordingStorage.getRecording(recordingId);
      if (!recording) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        res.status(404).json({ error: 'Recording not found' });
        return;
      }

      // Verify user owns this recording
      if (recording.userId !== user.id) {
        fs.unlinkSync(req.file.path);
        res.status(403).json({ error: 'Unauthorized to upload this recording' });
        return;
      }

      console.log('📤 Uploading recording to Azure Blob Storage...', {
        recordingId,
        fileSize: req.file.size,
        filename: req.file.filename
      });

      // Upload to Azure Blob Storage
      const blobUrl = await azureBlobService.uploadRecording(
        req.file.path,
        `${recording.roomCode}-${recordingId}.webm`
      );

      // Get participants from form data
      let participants: string[] = [];
      try {
        if (req.body.participants) {
          participants = JSON.parse(req.body.participants);
          console.log('📝 Participants from client:', participants);
        }
      } catch (err) {
        console.warn('Could not parse participants from request:', err);
      }

      // If no participants from client, try to fetch from room (fallback)
      if (participants.length === 0) {
        try {
          const roomResponse = await fetch(`http://localhost:${process.env.PORT || 5000}/api/rooms/${recording.roomId}`, {
            headers: {
              'Cookie': req.headers.cookie || ''
            }
          });
          if (roomResponse.ok) {
            const room = await roomResponse.json();
            participants = room.participants || [];
          }
        } catch (err) {
          console.warn('Could not fetch room participants:', err);
        }
      }

      console.log('✅ Final participants list:', participants);

      // Update recording with blob URL, file size, and participants
      await recordingStorage.updateRecording(recordingId, {
        blobUrl,
        blobName: `${recording.roomCode}-${recordingId}.webm`,
        fileSize: req.file.size,
        status: 'completed',
        participants
      });

      // Clean up local file
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Failed to delete local file:', err);
      }

      console.log('✅ Recording uploaded successfully:', recordingId);

      res.json({
        recordingId,
        blobUrl,
        fileSize: req.file.size,
        duration: recording.duration,
        status: 'completed',
        message: 'Recording uploaded successfully'
      });
    } catch (error) {
      console.error('❌ Failed to upload recording:', error);
      
      // Clean up file if upload failed
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error('Failed to cleanup file after error:', err);
        }
      }

      res.status(500).json({ 
        error: 'Failed to upload recording',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get all recordings for the authenticated user (includes recordings they created or participated in)
   */
  app.get('/api/recordings', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = getAuthenticatedUser(req);

      if (!user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Get recordings where user is creator or participant
      const recordings = await recordingStorage.getRecordingsForUser(user.id);

      res.json(recordings);
    } catch (error) {
      console.error('❌ Failed to get recordings:', error);
      res.status(500).json({ 
        error: 'Failed to get recordings',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get recordings for a specific room
   */
  app.get('/api/rooms/:roomId/recordings', requireAuth, async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;

      const recordings = await recordingStorage.getRecordingsByRoom(roomId);

      res.json(recordings);
    } catch (error) {
      console.error('❌ Failed to get room recordings:', error);
      res.status(500).json({ 
        error: 'Failed to get room recordings',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get a specific recording
   */
  app.get('/api/recordings/:recordingId', requireAuth, async (req: Request, res: Response) => {
    try {
      const { recordingId } = req.params;
      const user = getAuthenticatedUser(req);

      if (!user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const recording = await recordingStorage.getRecording(recordingId);

      if (!recording) {
        res.status(404).json({ error: 'Recording not found' });
        return;
      }

      // Verify user has access to this recording (creator or participant)
      const hasAccess = recording.userId === user.id || 
                        (recording.participants && recording.participants.includes(user.id));
      
      if (!hasAccess) {
        res.status(403).json({ error: 'Unauthorized to access this recording' });
        return;
      }

      res.json(recording);
    } catch (error) {
      console.error('❌ Failed to get recording:', error);
      res.status(500).json({ 
        error: 'Failed to get recording',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get download URL for a recording
   */
  app.get('/api/recordings/:recordingId/download', requireAuth, async (req: Request, res: Response) => {
    try {
      const { recordingId } = req.params;
      const user = getAuthenticatedUser(req);

      if (!user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const recording = await recordingStorage.getRecording(recordingId);

      if (!recording) {
        res.status(404).json({ error: 'Recording not found' });
        return;
      }

      // Verify user has access to this recording (creator or participant)
      const hasAccess = recording.userId === user.id || 
                        (recording.participants && recording.participants.includes(user.id));
      
      if (!hasAccess) {
        res.status(403).json({ error: 'Unauthorized to download this recording' });
        return;
      }

      if (!recording.blobName) {
        res.status(404).json({ error: 'Recording file not found' });
        return;
      }

      // Generate SAS URL for download (valid for 1 hour)
      const downloadUrl = await azureBlobService.generateDownloadUrl(
        recording.blobName,
        60 // 60 minutes
      );

      res.json({
        recordingId,
        downloadUrl,
        expiresIn: 3600, // seconds
        message: 'Download URL generated successfully'
      });
    } catch (error) {
      console.error('❌ Failed to generate download URL:', error);
      res.status(500).json({ 
        error: 'Failed to generate download URL',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Delete a recording
   */
  app.delete('/api/recordings/:recordingId', requireAuth, async (req: Request, res: Response) => {
    try {
      const { recordingId } = req.params;
      const user = getAuthenticatedUser(req);

      if (!user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const recording = await recordingStorage.getRecording(recordingId);

      if (!recording) {
        res.status(404).json({ error: 'Recording not found' });
        return;
      }

      // Verify user owns this recording
      if (recording.userId !== user.id) {
        res.status(403).json({ error: 'Unauthorized to delete this recording' });
        return;
      }

      // Delete from Azure Blob Storage
      if (recording.blobName) {
        try {
          await azureBlobService.deleteRecording(recording.blobName);
        } catch (error) {
          console.error('Failed to delete blob:', error);
          // Continue with database deletion even if blob deletion fails
        }
      }

      // Delete from database
      await recordingStorage.deleteRecording(recordingId);

      console.log('✅ Recording deleted:', recordingId);

      res.json({
        recordingId,
        status: 'deleted',
        message: 'Recording deleted successfully'
      });
    } catch (error) {
      console.error('❌ Failed to delete recording:', error);
      res.status(500).json({ 
        error: 'Failed to delete recording',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Cleanup stale recording for a room (when there's a conflict)
   */
  app.post('/api/recordings/cleanup/:roomId', requireAuth, async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const user = getAuthenticatedUser(req);

      if (!user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Get active recording for this room
      const recording = await recordingStorage.getActiveRecording(roomId);

      if (!recording) {
        res.status(404).json({ error: 'No active recording found for this room' });
        return;
      }

      // Mark as failed and clean up
      await recordingStorage.updateRecording(recording.id, {
        status: 'failed',
        error: 'Cleanup requested by user',
        endTime: new Date()
      });

      console.log('✅ Stale recording cleaned up:', recording.id);

      res.json({
        recordingId: recording.id,
        status: 'cleaned',
        message: 'Stale recording has been cleaned up. You can now start a new recording.'
      });
    } catch (error) {
      console.error('❌ Failed to cleanup recording:', error);
      res.status(500).json({ 
        error: 'Failed to cleanup recording',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Initialize Azure configuration (create container if needed)
   */
  app.post('/api/recordings/config/initialize', async (req: Request, res: Response) => {
    try {
      await azureBlobService.initializeContainer();

      res.json({
        status: 'initialized',
        message: 'Azure Blob Storage container initialized successfully'
      });
    } catch (error) {
      console.error('❌ Failed to initialize Azure container:', error);
      res.status(500).json({ 
        error: 'Failed to initialize Azure container',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Check Azure configuration status
   */
  app.get('/api/recordings/config/status', async (req: Request, res: Response) => {
    try {
      const isConfigured = azureBlobService.isConfigured();

      res.json({
        configured: isConfigured,
        message: isConfigured 
          ? 'Azure Blob Storage is properly configured' 
          : 'Azure Blob Storage configuration is missing. Please check environment variables.'
      });
    } catch (error) {
      console.error('❌ Failed to check Azure config:', error);
      res.status(500).json({ 
        error: 'Failed to check configuration status',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Manually trigger cleanup (admin/testing endpoint)
   */
  app.post('/api/recordings/cleanup-old', requireAuth, async (req: Request, res: Response) => {
    try {
      await recordingCleanupService.manualCleanup();

      res.json({
        status: 'success',
        message: 'Cleanup completed successfully'
      });
    } catch (error) {
      console.error('❌ Failed to run cleanup:', error);
      res.status(500).json({ 
        error: 'Failed to run cleanup',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  console.log('✅ Recording routes registered successfully');
}
