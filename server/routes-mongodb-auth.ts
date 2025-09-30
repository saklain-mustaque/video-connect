import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { MongoDBStorage } from "./mongodb-storage";
import { liveKitService } from "./livekit-service";
import crypto from 'crypto';
import bcrypt from 'bcrypt';

// Create an instance of MongoDBStorage
const mongoStorage = new MongoDBStorage();

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'video-conference-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(session(sessionConfig));

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    next();
  };

  // Authentication routes
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

  // User routes (some protected)
  app.post("/api/users", async (req, res) => {
    try {
      const { username, displayName } = req.body;
      
      // Check if username already exists
      const existingUser = await mongoStorage.getUserByUsername(username);
      if (existingUser) {
        res.status(409).json({ error: "Username already exists" });
        return;
      }
      
      const user = await mongoStorage.createUser({ username, displayName });
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

  // Check if username exists
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

  // Room routes (all protected)
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

  // Chat message routes
  app.post("/api/rooms/:roomId/messages", requireAuth, async (req, res) => {
    try {
      const { content, type = 'text', userId, userName, fileName, fileSize, fileType } = req.body;
      const { roomId } = req.params;
      
      if (!content || !userId || !userName) {
        res.status(400).json({ error: "Content, userId, and userName are required" });
        return;
      }
      
      // Validate room exists
      const room = await mongoStorage.getRoom(roomId);
      if (!room) {
        res.status(404).json({ error: "Room not found" });
        return;
      }
      
      // Create message
      const message = await mongoStorage.createMessage(
        roomId,
        userId,
        userName,
        content,
        type,
        fileName,
        fileSize,
        fileType
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
