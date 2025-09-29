import { type UserType, type InsertUser, type RoomType, type InsertRoom } from "../shared/mongodb-schema";
import { randomUUID } from "crypto";

// Updated interface with additional MongoDB methods
export interface IStorage {
  // User methods
  getUser(id: string): Promise<UserType | undefined>;
  getUserByUsername(username: string): Promise<UserType | undefined>;
  createUser(user: InsertUser): Promise<UserType>;
  
  // Room methods
  createRoom(room: InsertRoom & { code: string, createdBy: string }): Promise<RoomType>;
  getRoomByCode(code: string): Promise<RoomType | undefined>;
  getRoom(id: string): Promise<RoomType | undefined>;
  getRoomsByUser(userId: string): Promise<RoomType[]>;
  updateRoomActivity(roomId: string): Promise<void>;
  setRoomStatus(roomId: string, isActive: boolean): Promise<void>;
  getActiveRoomByCode(code: string): Promise<RoomType | undefined>;
  
  // Optional MongoDB-specific methods
  updateUserOnlineStatus?(userId: string, isOnline: boolean): Promise<void>;
  cleanupInactiveRooms?(hoursInactive?: number): Promise<number>;
}

// Keep the memory storage for backward compatibility or testing
export class MemStorage implements IStorage {
  private users: Map<string, UserType>;
  private rooms: Map<string, RoomType>;

  constructor() {
    this.users = new Map();
    this.rooms = new Map();
  }

  async getUser(id: string): Promise<UserType | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<UserType | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<UserType> {
    const id = randomUUID();
    const user: UserType = { 
      ...insertUser, 
      id,
      isOnline: false,
      lastSeen: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async createRoom(insertRoom: InsertRoom & { code: string, createdBy: string }): Promise<RoomType> {
    const id = randomUUID();
    const room: RoomType = {
      id,
      name: insertRoom.name,
      code: insertRoom.code,
      createdBy: insertRoom.createdBy,
      isActive: true,
      createdAt: new Date(),
      lastActivity: new Date()
    };
    this.rooms.set(id, room);
    return room;
  }

  async getRoomByCode(code: string): Promise<RoomType | undefined> {
    return Array.from(this.rooms.values()).find(
      (room) => room.code === code.toUpperCase(),
    );
  }

  async getRoom(id: string): Promise<RoomType | undefined> {
    return this.rooms.get(id);
  }

  async getRoomsByUser(userId: string): Promise<RoomType[]> {
    return Array.from(this.rooms.values()).filter(
      (room) => room.createdBy === userId,
    );
  }

  async updateRoomActivity(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      room.lastActivity = new Date();
      this.rooms.set(roomId, room);
    }
  }

  async setRoomStatus(roomId: string, isActive: boolean): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      room.isActive = isActive;
      room.lastActivity = new Date();
      this.rooms.set(roomId, room);
    }
  }

  async getActiveRoomByCode(code: string): Promise<RoomType | undefined> {
    const room = await this.getRoomByCode(code);
    if (!room || !room.isActive) return undefined;
    
    // Consider a room "active" if it was created recently or has recent activity
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    if (room.lastActivity && room.lastActivity > oneHourAgo) {
      return room;
    }
    
    return undefined;
  }

  async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.isOnline = isOnline;
      user.lastSeen = new Date();
      this.users.set(userId, user);
    }
  }

  async cleanupInactiveRooms(hoursInactive: number = 24): Promise<number> {
    const cutoffTime = new Date(Date.now() - hoursInactive * 60 * 60 * 1000);
    let cleanedCount = 0;
    
    for (const [id, room] of this.rooms.entries()) {
      if (room.isActive && room.lastActivity < cutoffTime) {
        room.isActive = false;
        this.rooms.set(id, room);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }
}

export const storage = new MemStorage();
