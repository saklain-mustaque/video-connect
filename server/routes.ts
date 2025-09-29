import type { Express } from "express";
import { createServer, type Server } from "http";
import { DatabaseStorage } from "./database";
import crypto from 'crypto';

// Create an instance of DatabaseStorage
const dbStorage = new DatabaseStorage();

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const { username, displayName } = req.body;
      
      // Check if username already exists
      const existingUser = await dbStorage.getUserByUsername(username);
      if (existingUser) {
        res.status(409).json({ error: "Username already exists" });
        return;
      }
      
      const user = await dbStorage.createUser({ username, displayName });
      res.json(user);
    } catch (error) {
      console.error('Create user error:', error);
      if (error instanceof Error && error.message.includes('unique')) {
        res.status(409).json({ error: "Username already exists" });
      } else {
        res.status(500).json({ error: "Failed to create user" });
      }
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await dbStorage.getUser(req.params.id);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Check if username exists
  app.get("/api/users/by-username/:username", async (req, res) => {
    try {
      const user = await dbStorage.getUserByUsername(req.params.username);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Room routes
  app.post("/api/rooms", async (req, res) => {
    try {
      const { name, createdBy } = req.body;
      
      // Generate a unique room code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      
      const room = await dbStorage.createRoom({ 
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
      const room = await dbStorage.getActiveRoomByCode(req.params.code);
      if (!room) {
        res.status(404).json({ 
          error: "Room not found or not currently active",
          details: "The room may have ended or the code may be incorrect" 
        });
        return;
      }
      
      // Update room activity when someone accesses it
      await dbStorage.updateRoomActivity(room.id);
      
      res.json(room);
    } catch (error) {
      console.error('Get room by code error:', error);
      res.status(500).json({ error: "Failed to get room" });
    }
  });

  app.get("/api/rooms/:id", async (req, res) => {
    try {
      const room = await dbStorage.getRoom(req.params.id);
      if (!room) {
        res.status(404).json({ error: "Room not found" });
        return;
      }
      res.json(room);
    } catch (error) {
      res.status(500).json({ error: "Failed to get room" });
    }
  });

  // Start/Join a room (marks it as active and updates activity)
  app.post("/api/rooms/:code/join", async (req, res) => {
    try {
      const room = await dbStorage.getRoomByCode(req.params.code);
      if (!room) {
        res.status(404).json({ error: "Room not found" });
        return;
      }
      
      // Mark room as active and update activity
      await dbStorage.setRoomStatus(room.id, true);
      
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
      const room = await dbStorage.getRoomByCode(req.params.code);
      if (!room) {
        res.status(404).json({ error: "Room not found" });
        return;
      }
      
      // For simplicity, we'll keep the room active even when someone leaves
      // In a real app, you'd track participants and deactivate when empty
      await dbStorage.updateRoomActivity(room.id);
      
      res.json({ 
        status: 'left',
        message: 'Successfully left the room' 
      });
    } catch (error) {
      console.error('Leave room error:', error);
      res.status(500).json({ error: "Failed to leave room" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
