import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { MongoDBStorage } from "./mongodb-storage";
import { liveKitService } from "./livekit-service";
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create an instance of MongoDBStorage
const mongoStorage = new MongoDBStorage();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Allow most common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|ppt|pptx|xls|xlsx|mp4|mp3|zip/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const { username, displayName, password } = req.body;
      
      if (!username || !displayName || !password) {
        res.status(400).json({ error: "Username, display name, and password are required" });
        return;
      }
      
      // Check if username already exists
      const existingUser = await mongoStorage.getUserByUsername(username);
      if (existingUser) {
        res.status(409).json({ error: "Username already exists" });
        return;
      }
      
      const user = await mongoStorage.createUser({ username, displayName, password });
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

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await mongoStorage.getUser(req.params.id);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json(user);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Check if username exists
  app.get("/api/users/by-username/:username", async (req, res) => {
    try {
      const user = await mongoStorage.getUserByUsername(req.params.username);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json(user);
    } catch (error) {
      console.error('Get user by username error:', error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Room routes
  app.post("/api/rooms", async (req, res) => {
    try {
      const { name, createdBy } = req.body;
      
      // Generate a unique room code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      
      const room = await mongoStorage.createRoom({ 
        name, 
        code, 
        createdBy 
      });
      
      res.json({
        ...room,
        shareLink: `${req.protocol}://${req.get('host')}/join/${code}`
      });
    } catch (error) {
      console.error('Create room error:', error);
      res.status(500).json({ error: "Failed to create room" });
    }
  });

  app.get("/api/rooms/by-code/:code", async (req, res) => {
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

  app.get("/api/rooms/:id", async (req, res) => {
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
  app.post("/api/rooms/:code/join", async (req, res) => {
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
  app.post("/api/rooms/:code/leave", async (req, res) => {
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
  app.post("/api/users/:id/status", async (req, res) => {
    try {
      const { isOnline } = req.body;
      await mongoStorage.updateUserOnlineStatus(req.params.id, isOnline);
      res.json({ success: true, message: 'User status updated' });
    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({ error: "Failed to update user status" });
    }
  });

  // Get rooms by user
  app.get("/api/users/:id/rooms", async (req, res) => {
    try {
      const rooms = await mongoStorage.getRoomsByUser(req.params.id);
      res.json(rooms);
    } catch (error) {
      console.error('Get user rooms error:', error);
      res.status(500).json({ error: "Failed to get user rooms" });
    }
  });

  // Cleanup inactive rooms (admin utility)
  app.post("/api/rooms/cleanup", async (req, res) => {
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
  app.post("/api/livekit/token", async (req, res) => {
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
  app.post("/api/livekit/screenshare-token", async (req, res) => {
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

  // Chat message routes
  app.post("/api/rooms/:roomCode/messages", async (req, res) => {
    try {
      const { content, type = 'text', userId, userName } = req.body;
      const { roomCode } = req.params;
      
      if (!content || !userId || !userName) {
        res.status(400).json({ error: "Content, userId, and userName are required" });
        return;
      }
      
      // Get room by code
      const room = await mongoStorage.getActiveRoomByCode(roomCode);
      if (!room) {
        res.status(404).json({ error: "Room not found" });
        return;
      }
      
      // Create message (note: we need to add this method to mongoStorage)
      const messageData = {
        roomId: room.id,
        userId,
        userName,
        content,
        type,
        timestamp: new Date()
      };
      
      // For now, just return the message data
      // TODO: Implement actual message storage in mongoStorage
      res.json({
        id: Date.now().toString(),
        ...messageData
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });
  
  app.get("/api/rooms/:roomCode/messages", async (req, res) => {
    try {
      const { roomCode } = req.params;
      
      // Get room by code
      const room = await mongoStorage.getActiveRoomByCode(roomCode);
      if (!room) {
        res.status(404).json({ error: "Room not found" });
        return;
      }
      
      // For now, return empty array
      // TODO: Implement actual message retrieval from mongoStorage
      res.json([]);
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });
  
  // File upload endpoint
  app.post("/api/rooms/:roomCode/files", upload.single('file'), async (req, res) => {
    try {
      const { roomCode } = req.params;
      const { uploadedBy } = req.body;
      
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }
      
      // Get room by code
      const room = await mongoStorage.getActiveRoomByCode(roomCode);
      if (!room) {
        res.status(404).json({ error: "Room not found" });
        return;
      }
      
      const fileData = {
        id: Date.now().toString(),
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
        uploadedBy: uploadedBy || 'Unknown',
        uploadedAt: new Date(),
        url: `/uploads/${req.file.filename}`,
        filename: req.file.filename
      };
      
      // TODO: Store file metadata in database
      console.log('File uploaded:', fileData);
      
      res.json(fileData);
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });
  
  // Get shared files for a room
  app.get("/api/rooms/:roomCode/files", async (req, res) => {
    try {
      const { roomCode } = req.params;
      
      // Get room by code
      const room = await mongoStorage.getActiveRoomByCode(roomCode);
      if (!room) {
        res.status(404).json({ error: "Room not found" });
        return;
      }
      
      // For now, return empty array
      // TODO: Implement actual file retrieval from database
      res.json([]);
    } catch (error) {
      console.error('Get files error:', error);
      res.status(500).json({ error: "Failed to get files" });
    }
  });
  
  // Serve uploaded files
  app.use('/uploads', express.static('./uploads'));

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

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
