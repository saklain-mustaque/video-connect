"use server"
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { users, rooms, messages } from '@shared/schema';
import { type InsertUser, type User, type InsertRoom, type Room } from '@shared/schema';
import { type IStorage } from './storage';
import { eq } from 'drizzle-orm';

// Create a SQL connection
if (!process.env.DATABASE_URL) {
    console.log('process.env:' , process.env)
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql = neon(process.env.DATABASE_URL as string);
// Create a Drizzle instance
export const db = drizzle(sql);

export class DatabaseStorage implements IStorage {
  // Message management methods
  async createMessage(
    roomId: string, 
    userId: string, 
    userName: string, 
    content: string, 
    type: string = 'text',
    fileName?: string,
    fileSize?: number,
    fileType?: string
  ): Promise<any> {
    const result = await db.insert(messages).values({
      roomId,
      userId,
      content,
      type,
      fileName: fileName || null,
      fileSize: fileSize ? fileSize.toString() : null,
      fileType: fileType || null,
    }).returning();
    
    // Return with userName for frontend
    return {
      ...result[0],
      userName,
      fileSize: result[0].fileSize ? parseInt(result[0].fileSize) : undefined,
    };
  }

  async getMessagesByRoom(roomId: string): Promise<any[]> {
    const result = await db.select({
      id: messages.id,
      roomId: messages.roomId,
      userId: messages.userId,
      content: messages.content,
      type: messages.type,
      fileName: messages.fileName,
      fileSize: messages.fileSize,
      fileType: messages.fileType,
      timestamp: messages.timestamp,
    }).from(messages)
      .where(eq(messages.roomId, roomId))
      .orderBy(messages.timestamp);
    
    // Fetch user info for each message
    const messagesWithUsers = await Promise.all(
      result.map(async (msg) => {
        const user = await this.getUser(msg.userId!);
        return {
          ...msg,
          userName: user?.displayName || 'Unknown User',
          fileSize: msg.fileSize ? parseInt(msg.fileSize) : undefined,
        };
      })
    );
    
    return messagesWithUsers;
  }

  async getUser(id: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id));
      return result[0];
    } catch (error) {
      console.error('Database error in getUser:', error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.username, username));
      return result[0];
    } catch (error) {
      console.error('Database error in getUserByUsername:', error);
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Room management methods
  async createRoom(insertRoom: InsertRoom & { code: string, createdBy: string }): Promise<Room> {
    const result = await db.insert(rooms).values({
      ...insertRoom,
      isActive: true,
      lastActivity: new Date()
    }).returning();
    return result[0];
  }

  async getRoomByCode(code: string): Promise<Room | undefined> {
    const result = await db.select().from(rooms).where(eq(rooms.code, code));
    return result[0];
  }

  async getRoom(id: string): Promise<Room | undefined> {
    const result = await db.select().from(rooms).where(eq(rooms.id, id));
    return result[0];
  }

  async getRoomsByUser(userId: string): Promise<Room[]> {
    const result = await db.select().from(rooms).where(eq(rooms.createdBy, userId));
    return result;
  }

  async updateRoomActivity(roomId: string): Promise<void> {
    await db.update(rooms)
      .set({ lastActivity: new Date() })
      .where(eq(rooms.id, roomId));
  }

  async setRoomStatus(roomId: string, isActive: boolean): Promise<void> {
    await db.update(rooms)
      .set({ 
        isActive, 
        lastActivity: new Date() 
      })
      .where(eq(rooms.id, roomId));
  }

  async getActiveRoomByCode(code: string): Promise<Room | undefined> {
    const result = await db.select().from(rooms)
      .where(eq(rooms.code, code))
      .limit(1);
    
    const room = result[0];
    if (!room) return undefined;
    
    // Consider a room "active" if it was created recently or has recent activity
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    if (room.isActive && room.lastActivity && room.lastActivity > oneHourAgo) {
      return room;
    }
    
    return undefined;
  }
}