import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import MongoStore from "connect-mongo";
import { MongoDBStorage } from "./mongodb-storage";
import { liveKitService } from "./livekit-service";
import { recordingStorage } from "./recording-storage";
import { registerChunkedUploadRoutes } from './chunked-upload';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

// Create an instance of MongoDBStorage
const mongoStorage = new MongoDBStorage();

// Session configuration with MongoDB store
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'video-conference-secret-key',
  resave: false,
  saveUninitialized: true, // Changed to true for better session creation
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI!,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60, // 1 day in seconds
    autoRemove: 'native', // Let MongoDB handle session cleanup
    touchAfter: 24 * 3600, // Lazy session update
  }),
  cookie: {
    secure: false, // Set to false to work with HTTP and IP addresses
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' as const, // Use 'lax' for better compatibility with IP access
    // Don't set domain - let it auto-detect
  },
  proxy: true,
  name: 'sessionId' 
};

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(session(sessionConfig));

  if (process.env.NODE_ENV !== 'production') {
    app.use((req: any, res: any, next: any) => {
      next();
    });
  }

  const requireAuth = (req: any, res: any, next: any) => {    
    if (!req.session?.userId) {
      console.error('Authentication failed: No userId in session');
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please log in to continue',
        code: 'AUTH_REQUIRED'
      });
    }
    next();
  };

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, displayName, password, email } = req.body;
      
      if (!username || !displayName || !password) {
        return res.status(400).json({ 
          message: "Username, display name, and password are required" 
        });
      }

      // Check if username already exists
      const existingUser = await mongoStorage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const user = await mongoStorage.createUser({ 
        username, 
        displayName,
        email: email || undefined,
        password: hashedPassword
      });

      // Create session
      (req.session as any).userId = user.id;
      (req.session as any).user = {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email
      };

      // Return user data (without password)
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Get user by username
      const user = await mongoStorage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Create session
      (req.session as any).userId = user.id;
      (req.session as any).user = {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email
      };

      // Update user online status
      await mongoStorage.updateUserOnlineStatus(user.id, true);

      // Return user data (without password)
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      
      if (userId) {
        // Update user online status
        await mongoStorage.updateUserOnlineStatus(userId, false);
      }

      // Destroy session
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
          return res.status(500).json({ message: "Logout failed" });
        }
        res.clearCookie('connect.sid');
        res.json({ message: "Logged out successfully" });
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await mongoStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Return user data (without password)
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: "Failed to get user data" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const { username, displayName, password = 'temp_password' } = req.body;
      
      // Check if username already exists
      const existingUser = await mongoStorage.getUserByUsername(username);
      if (existingUser) {
        res.status(409).json({ error: "Username already exists" });
        return;
      }
      
      // This route is for legacy compatibility - use a default password
      const user = await mongoStorage.createUser({ 
        username, 
        displayName, 
        password: password 
      });
      res.json(user);
    } catch (error) {
      console.error('Create user error:', error);
      if (error instanceof Error && error.message.includes('Username already exists')) {
        res.status(409).json({ error: "Username already exists" });
      } else {
        res.status(500).json({ error: "Failed to create user" });
      }
    }
  });

  app.get("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const user = await mongoStorage.getUser(req.params.id);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.get("/api/users/by-username/:username", async (req, res) => {
    try {
      const user = await mongoStorage.getUserByUsername(req.params.username);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Get user by username error:', error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.post("/api/rooms", requireAuth, async (req, res) => {
    try {
      const { name } = req.body;
      const userId = (req.session as any).userId;
      
      // Generate a unique room code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      
      const room = await mongoStorage.createRoom({ 
        name, 
        code, 
        createdBy: userId 
      });
      
      res.json({
        ...room,
        shareLink: `${req.protocol}://${req.get('host')}/room/${code}`
      });
    } catch (error) {
      console.error('Create room error:', error);
      res.status(500).json({ error: "Failed to create room" });
    }
  });

  app.get("/api/rooms/recent", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const rooms = await mongoStorage.getRoomsByUser(userId);
      res.json(rooms);
    } catch (error) {
      console.error('Get recent rooms error:', error);
      res.status(500).json({ error: "Failed to get recent rooms" });
    }
  });

  app.get("/api/rooms/by-code/:code", requireAuth, async (req, res) => {
    try {
      const room = await mongoStorage.getActiveRoomByCode(req.params.code);
      if (!room) {
        res.status(404).json({ 
          error: "Room not found or not currently active",
          details: "The room may have ended or the code may be incorrect" 
        });
        return;
      }
      
      // Update room activity when someone accesses it
      await mongoStorage.updateRoomActivity(room.id);
      
      res.json(room);
    } catch (error) {
      console.error('Get room by code error:', error);
      res.status(500).json({ error: "Failed to get room" });
    }
  });

  app.get("/api/rooms/:id", requireAuth, async (req, res) => {
    try {
      const room = await mongoStorage.getRoom(req.params.id);
      if (!room) {
        res.status(404).json({ error: "Room not found" });
        return;
      }
      res.json(room);
    } catch (error) {
      console.error('Get room error:', error);
      res.status(500).json({ error: "Failed to get room" });
    }
  });

  // Start/Join a room (marks it as active and updates activity)
  app.post("/api/rooms/:code/join", requireAuth, async (req, res) => {
    try {
      const room = await mongoStorage.getRoomByCode(req.params.code);
      if (!room) {
        res.status(404).json({ error: "Room not found" });
        return;
      }
      
      // Mark room as active and update activity
      await mongoStorage.setRoomStatus(room.id, true);
      
      res.json({ 
        ...room, 
        status: 'joined',
        message: 'Successfully joined the room' 
      });
    } catch (error) {
      console.error('Join room error:', error);
      res.status(500).json({ error: "Failed to join room" });
    }
  });

  // End a room (marks it as inactive)
  app.post("/api/rooms/:code/leave", requireAuth, async (req, res) => {
    try {
      const room = await mongoStorage.getRoomByCode(req.params.code);
      if (!room) {
        res.status(404).json({ error: "Room not found" });
        return;
      }
      
      // For simplicity, we'll keep the room active even when someone leaves
      // In a real app, you'd track participants and deactivate when empty
      await mongoStorage.updateRoomActivity(room.id);
      
      res.json({ 
        status: 'left',
        message: 'Successfully left the room' 
      });
    } catch (error) {
      console.error('Leave room error:', error);
      res.status(500).json({ error: "Failed to leave room" });
    }
  });

  // Additional utility routes for MongoDB

  // Update user online status
  app.post("/api/users/:id/status", requireAuth, async (req, res) => {
    try {
      const { isOnline } = req.body;
      await mongoStorage.updateUserOnlineStatus(req.params.id, isOnline);
      res.json({ success: true, message: 'User status updated' });
    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({ error: "Failed to update user status" });
    }
  });

  // Cleanup inactive rooms (admin utility)
  app.post("/api/rooms/cleanup", requireAuth, async (req, res) => {
    try {
      const { hoursInactive = 24 } = req.body;
      const cleanedCount = await mongoStorage.cleanupInactiveRooms(hoursInactive);
      res.json({ 
        success: true, 
        message: `Cleaned up ${cleanedCount} inactive rooms` 
      });
    } catch (error) {
      console.error('Cleanup rooms error:', error);
      res.status(500).json({ error: "Failed to cleanup inactive rooms" });
    }
  });

  // LiveKit Token Generation Endpoints

  // Generate token for joining a room
  app.post("/api/livekit/token", requireAuth, async (req, res) => {
    try {
      const { roomCode, userId, displayName, metadata } = req.body;

      if (!roomCode || !userId || !displayName) {
        res.status(400).json({ 
          error: "Missing required fields: roomCode, userId, and displayName are required" 
        });
        return;
      }

      // Validate room exists and is active
      const room = await mongoStorage.getActiveRoomByCode(roomCode);
      if (!room) {
        res.status(404).json({ 
          error: "Room not found or not currently active" 
        });
        return;
      }

      // Generate token
      const token = await liveKitService.generateVideoCallToken(
        roomCode,
        userId,
        displayName,
        metadata
      );

      // Update room activity
      await mongoStorage.updateRoomActivity(room.id);

      res.json({
        token,
        serverUrl: liveKitService.getServerUrl(),
        roomCode,
        roomName: room.name,
        expiresIn: '12h'
      });
    } catch (error) {
      console.error('Generate LiveKit token error:', error);
      res.status(500).json({ error: "Failed to generate access token" });
    }
  });

  // Generate token for screen sharing
  app.post("/api/livekit/screenshare-token", requireAuth, async (req, res) => {
    try {
      const { roomCode, userId, displayName } = req.body;

      if (!roomCode || !userId || !displayName) {
        res.status(400).json({ 
          error: "Missing required fields: roomCode, userId, and displayName are required" 
        });
        return;
      }

      // Validate room exists and is active
      const room = await mongoStorage.getActiveRoomByCode(roomCode);
      if (!room) {
        res.status(404).json({ 
          error: "Room not found or not currently active" 
        });
        return;
      }

      // Generate screen share token
      const token = await liveKitService.generateScreenShareToken(
        roomCode,
        userId,
        displayName
      );

      res.json({
        token,
        serverUrl: liveKitService.getServerUrl(),
        participantId: `${userId}_screenshare`,
        expiresIn: '2h'
      });
    } catch (error) {
      console.error('Generate screen share token error:', error);
      res.status(500).json({ error: "Failed to generate screen share token" });
    }
  });

  // Validate LiveKit configuration
  app.get("/api/livekit/config", async (req, res) => {
    try {
      const validation = liveKitService.validateConfiguration();
      
      if (!validation.valid) {
        res.status(500).json({
          error: "LiveKit configuration invalid",
          details: validation.error
        });
        return;
      }

      res.json({
        configured: true,
        serverUrl: liveKitService.getServerUrl(),
        message: "LiveKit configuration is valid"
      });
    } catch (error) {
      console.error('LiveKit config check error:', error);
      res.status(500).json({ error: "Failed to validate LiveKit configuration" });
    }
  });

  // Recording routes
  
  // Configure multer for file uploads
  const upload = multer({
    dest: 'uploads/',
    limits: {
      fileSize: 1024 * 1024 * 1024 // 1GB limit
    }
  });

  // Start recording
app.post("/api/recordings/start", requireAuth, async (req, res) => {
  try {
    const { roomId, roomCode, roomName } = req.body;
    const userId = (req.session as any).userId;

    if (!roomId || !roomCode || !roomName) {
      return res.status(400).json({ 
        error: "Missing required fields: roomId, roomCode, and roomName are required" 
      });
    }

    // Get user info
    const user = await mongoStorage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if there's already an active recording for this room
    const activeRecording = await recordingStorage.getActiveRecording(roomId);
    if (activeRecording) {
      // Check if the recording is stale (older than 5 minutes without completion)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (activeRecording.startTime < fiveMinutesAgo && !activeRecording.endTime) {
        // Mark stale recording as failed and allow new recording
        console.log('⚠️ Found stale recording, marking as failed:', activeRecording.id);
        await recordingStorage.updateRecording(activeRecording.id, {
          status: 'failed',
          error: 'Recording abandoned - timeout',
          endTime: new Date()
        });
      } else {
        return res.status(409).json({ 
          error: "A recording is already in progress for this room. Please stop the current recording first.",
          recordingId: activeRecording.id
        });
      }
    }

    // Create recording entry with temporary local file path
    const tempFilePath = path.join('uploads', `recording-${Date.now()}.webm`);
    const recording = await recordingStorage.createRecording(
      roomId,
      roomCode,
      roomName,
      userId,
      user.displayName,
      tempFilePath
    );

    console.log('✅ Recording started:', recording.id);
    res.json({
      recordingId: recording.id,
      status: 'recording',
      startTime: recording.startTime
    });
  } catch (error) {
    console.error('❌ Start recording error:', error);
    res.status(500).json({ error: "Failed to start recording" });
  }
});

  // Stop recording
  app.post("/api/recordings/:id/stop", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { duration } = req.body;

      const recording = await recordingStorage.getRecording(id);
      if (!recording) {
        return res.status(404).json({ error: "Recording not found" });
      }

      // Update recording with end time and duration
      await recordingStorage.updateRecording(id, {
        endTime: new Date(),
        duration: duration || 0,
        status: 'processing'
      });

      console.log('✅ Recording stopped:', id);
      res.json({
        recordingId: id,
        status: 'processing',
        message: 'Recording stopped, ready for upload'
      });
    } catch (error) {
      console.error('❌ Stop recording error:', error);
      res.status(500).json({ error: "Failed to stop recording" });
    }
  });

  // Upload recording
  app.post("/api/recordings/:id/upload", requireAuth, upload.single('video'), async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.session as any).userId;

      if (!req.file) {
        return res.status(400).json({ error: "No video file provided" });
      }

      const recording = await recordingStorage.getRecording(id);
      if (!recording) {
        // Clean up uploaded file
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(404).json({ error: "Recording not found" });
      }

      // Verify the user owns this recording
      if (recording.userId !== userId) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(403).json({ error: "Unauthorized" });
      }

      // For now, just move the file to a permanent location
      // In production, you would upload to Azure Blob Storage or AWS S3
      const recordingsDir = path.join(process.cwd(), 'recordings');
      await fs.mkdir(recordingsDir, { recursive: true });
      
      const filename = `${id}-${Date.now()}.webm`;
      const finalPath = path.join(recordingsDir, filename);
      
      await fs.rename(req.file.path, finalPath);

      // Update recording with file information
      await recordingStorage.updateRecording(id, {
        localFilePath: finalPath,
        fileSize: req.file.size,
        status: 'completed'
      });

      console.log('✅ Recording uploaded:', id);
      res.json({
        recordingId: id,
        status: 'completed',
        fileSize: req.file.size,
        message: 'Recording uploaded successfully'
      });
    } catch (error) {
      console.error('❌ Upload recording error:', error);
      // Clean up file on error
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      res.status(500).json({ error: "Failed to upload recording" });
    }
  });

  // Get recordings for a room
  app.get("/api/recordings/room/:roomId", requireAuth, async (req, res) => {
    try {
      const { roomId } = req.params;
      const recordings = await recordingStorage.getRecordingsByRoom(roomId);
      res.json(recordings);
    } catch (error) {
      console.error('❌ Get room recordings error:', error);
      res.status(500).json({ error: "Failed to get recordings" });
    }
  });

  // Get user's recordings (includes recordings where user is creator or participant)
  app.get("/api/recordings", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const recordings = await recordingStorage.getRecordingsForUser(userId);
      res.json(recordings);
    } catch (error) {
      console.error('❌ Get user recordings error:', error);
      res.status(500).json({ error: "Failed to get recordings" });
    }
  });

  // Get user's recordings (legacy endpoint)
  app.get("/api/recordings/user", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const recordings = await recordingStorage.getRecordingsForUser(userId);
      res.json(recordings);
    } catch (error) {
      console.error('❌ Get user recordings error:', error);
      res.status(500).json({ error: "Failed to get recordings" });
    }
  });

  // Get specific recording
  app.get("/api/recordings/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.session as any).userId;
      const recording = await recordingStorage.getRecording(id);
      
      if (!recording) {
        return res.status(404).json({ error: "Recording not found" });
      }

      // Check if user has access (creator or participant)
      const hasAccess = recording.userId === userId || 
                        (recording.participants && recording.participants.includes(userId));
      
      if (!hasAccess) {
        return res.status(403).json({ error: "Unauthorized to access this recording" });
      }

      res.json(recording);
    } catch (error) {
      console.error('❌ Get recording error:', error);
      res.status(500).json({ error: "Failed to get recording" });
    }
  });

  // Get download URL for a recording
  app.get("/api/recordings/:id/download", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.session as any).userId;
      const recording = await recordingStorage.getRecording(id);
      
      if (!recording) {
        return res.status(404).json({ error: "Recording not found" });
      }

      // Check if user has access (creator or participant)
      const hasAccess = recording.userId === userId || 
                        (recording.participants && recording.participants.includes(userId));
      
      if (!hasAccess) {
        return res.status(403).json({ error: "Unauthorized to download this recording" });
      }

      if (!recording.localFilePath || !recording.status || recording.status !== 'completed') {
        return res.status(404).json({ error: "Recording file not available" });
      }

      // For local storage, return the stream URL for playback
      // In production with Azure Blob Storage, you would generate a SAS URL here
      const downloadUrl = `/api/recordings/${id}/stream`;

      res.json({
        recordingId: id,
        downloadUrl,
        expiresIn: 3600, // 1 hour
        message: 'Download URL generated successfully'
      });
    } catch (error) {
      console.error('❌ Generate download URL error:', error);
      res.status(500).json({ error: "Failed to generate download URL" });
    }
  });

  // Stream recording file for playback (supports range requests)
  app.get("/api/recordings/:id/stream", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.session as any).userId;
      const recording = await recordingStorage.getRecording(id);
      
      if (!recording) {
        return res.status(404).json({ error: "Recording not found" });
      }

      // Check if user has access (creator or participant)
      const hasAccess = recording.userId === userId || 
                        (recording.participants && recording.participants.includes(userId));
      
      if (!hasAccess) {
        return res.status(403).json({ error: "Unauthorized to access this recording" });
      }

      if (!recording.localFilePath) {
        return res.status(404).json({ error: "Recording file not found" });
      }

      // Import fs for streaming
      const fsSync = await import('fs');
      const stat = await fs.stat(recording.localFilePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        // Handle range request for video seeking
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fsSync.createReadStream(recording.localFilePath, {start, end});
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/webm',
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        // No range, send entire file
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/webm',
        };
        res.writeHead(200, head);
        fsSync.createReadStream(recording.localFilePath).pipe(res);
      }
    } catch (error) {
      console.error('❌ Stream recording error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to stream recording" });
      }
    }
  });

  // Serve recording file for download
  app.get("/api/recordings/:id/file", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.session as any).userId;
      const recording = await recordingStorage.getRecording(id);
      
      if (!recording) {
        return res.status(404).json({ error: "Recording not found" });
      }

      // Check if user has access (creator or participant)
      const hasAccess = recording.userId === userId || 
                        (recording.participants && recording.participants.includes(userId));
      
      if (!hasAccess) {
        return res.status(403).json({ error: "Unauthorized to download this recording" });
      }

      if (!recording.localFilePath) {
        return res.status(404).json({ error: "Recording file not found" });
      }

      // Check if file exists
      try {
        await fs.access(recording.localFilePath);
      } catch (error) {
        return res.status(404).json({ error: "Recording file not found on server" });
      }

      // Send file
      res.download(recording.localFilePath, `${recording.roomName}-${id}.webm`, (err) => {
        if (err) {
          console.error('❌ File download error:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: "Failed to download file" });
          }
        }
      });
    } catch (error) {
      console.error('❌ Serve recording file error:', error);
      res.status(500).json({ error: "Failed to serve recording file" });
    }
  });

  // Force cleanup stale recordings for a room (utility endpoint)
  app.post("/api/recordings/cleanup/:roomId", requireAuth, async (req, res) => {
    try {
      const { roomId } = req.params;

      // Get all active recordings for the room
      const activeRecording = await recordingStorage.getActiveRecording(roomId);
      
      if (!activeRecording) {
        return res.json({ 
          message: 'No active recordings found',
          cleaned: 0 
        });
      }

      // Mark as failed
      await recordingStorage.updateRecording(activeRecording.id, {
        status: 'failed',
        error: 'Manually cleaned up',
        endTime: new Date()
      });

      console.log('✅ Cleaned up recording:', activeRecording.id);
      res.json({ 
        message: 'Recording cleaned up successfully',
        cleaned: 1,
        recordingId: activeRecording.id
      });
    } catch (error) {
      console.error('❌ Cleanup recording error:', error);
      res.status(500).json({ error: "Failed to cleanup recording" });
    }
  });

  // Delete recording
  app.delete("/api/recordings/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.session as any).userId;

      const recording = await recordingStorage.getRecording(id);
      if (!recording) {
        return res.status(404).json({ error: "Recording not found" });
      }

      // Only the creator can delete the recording
      if (recording.userId !== userId) {
        return res.status(403).json({ error: "Only the recording creator can delete it" });
      }

      // Delete the file if it exists
      if (recording.localFilePath) {
        await fs.unlink(recording.localFilePath).catch(() => {});
      }

      // Delete from database
      await recordingStorage.deleteRecording(id);

      console.log('✅ Recording deleted:', id);
      res.json({ message: "Recording deleted successfully" });
    } catch (error) {
      console.error('❌ Delete recording error:', error);
      res.status(500).json({ error: "Failed to delete recording" });
    }
  });

  // Register chunked upload routes
  registerChunkedUploadRoutes(app);

  // Chat message routes
  app.post("/api/rooms/:roomId/messages", requireAuth, async (req, res) => {
    try {
      const { content, type = 'text', userName, fileName, fileSize, fileType, recipientId, recipientName } = req.body;
      const { roomId } = req.params;
      const sessionUserId = (req.session as any).userId; // Get authenticated user ID from session
      
      if (!content || !userName) {
        res.status(400).json({ error: "Content and userName are required" });
        return;
      }
      
      // Validate room exists
      const room = await mongoStorage.getRoom(roomId);
      if (!room) {
        res.status(404).json({ error: "Room not found" });
        return;
      }
      
      // Create message using authenticated user's ID from session
      const message = await mongoStorage.createMessage(
        roomId,
        sessionUserId, // Use session user ID instead of request body userId
        userName,
        content,
        type,
        fileName,
        fileSize,
        fileType,
        recipientId,
        recipientName
      );
      
      console.log('✅ Message saved to MongoDB:', message.id);
      res.json(message);
    } catch (error) {
      console.error('❌ Send message error:', error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });
  
  app.get("/api/rooms/:roomId/messages", requireAuth, async (req, res) => {
    try {
      const { roomId } = req.params;
      
      // Validate room exists
      const room = await mongoStorage.getRoom(roomId);
      if (!room) {
        res.status(404).json({ error: "Room not found" });
        return;
      }
      
      // Get all messages for the room
      const messages = await mongoStorage.getMessagesByRoom(roomId);
      
      console.log(`✅ Retrieved ${messages.length} messages for room ${roomId}`);
      res.json(messages);
    } catch (error) {
      console.error('❌ Get messages error:', error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
