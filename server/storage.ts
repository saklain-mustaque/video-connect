import { type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createMessage(
    roomId: string,
    userId: string,
    userName: string,
    content: string,
    type?: string,
    fileName?: string,
    fileSize?: number,
    fileType?: string
  ): Promise<any>;
  getMessagesByRoom(roomId: string): Promise<any[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      isOnline: false,
      lastSeen: new Date()
    };
    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();
