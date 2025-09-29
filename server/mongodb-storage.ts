import mongoose from 'mongoose';
import { connectDB } from './mongodb-connection';
import { User, Room, Message } from '../shared/mongodb-schema';
import type { 
  IUser, 
  IRoom, 
  InsertUser, 
  UserType, 
  InsertRoom, 
  RoomType 
} from '../shared/mongodb-schema';
import { type IStorage } from './storage';

export class MongoDBStorage implements IStorage {
  constructor() {
    // Ensure database connection on instantiation
    this.ensureConnection();
  }

  private async ensureConnection(): Promise<void> {
    try {
      await connectDB();
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  // Helper method to convert MongoDB document to plain object
  private userToPlain(user: IUser): UserType {
    return {
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      password: user.password, // Include password for authentication
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private roomToPlain(room: IRoom): RoomType {
    return {
      id: room._id.toString(),
      name: room.name,
      code: room.code,
      createdBy: room.createdBy.toString(),
      isActive: room.isActive,
      createdAt: room.createdAt,
      lastActivity: room.lastActivity,
    };
  }

  // User methods
  async getUser(id: string): Promise<UserType | undefined> {
    try {
      await this.ensureConnection();
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return undefined;
      }
      
      const user = await User.findById(id);
      return user ? this.userToPlain(user) : undefined;
    } catch (error) {
      console.error('MongoDB error in getUser:', error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<UserType | undefined> {
    try {
      await this.ensureConnection();
      
      const user = await User.findOne({ username }).exec();
      return user ? this.userToPlain(user) : undefined;
    } catch (error) {
      console.error('MongoDB error in getUserByUsername:', error);
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<UserType> {
    try {
      await this.ensureConnection();
      
      const user = new User({
        username: insertUser.username,
        displayName: insertUser.displayName,
        email: insertUser.email,
        password: insertUser.password,
        isOnline: false,
        lastSeen: new Date()
      });
      
      const savedUser = await user.save();
      return this.userToPlain(savedUser);
    } catch (error) {
      console.error('MongoDB error in createUser:', error);
      if (error instanceof Error && error.message.includes('duplicate key')) {
        throw new Error('Username already exists');
      }
      throw error;
    }
  }

  // Room management methods
  async createRoom(insertRoom: InsertRoom & { code: string, createdBy: string }): Promise<RoomType> {
    try {
      await this.ensureConnection();
      
      const room = new Room({
        name: insertRoom.name,
        code: insertRoom.code,
        createdBy: new mongoose.Types.ObjectId(insertRoom.createdBy),
        isActive: true,
        lastActivity: new Date()
      });
      
      const savedRoom = await room.save();
      return this.roomToPlain(savedRoom);
    } catch (error) {
      console.error('MongoDB error in createRoom:', error);
      throw error;
    }
  }

  async getRoomByCode(code: string): Promise<RoomType | undefined> {
    try {
      await this.ensureConnection();
      
      const room = await Room.findOne({ code: code.toUpperCase() }).exec();
      return room ? this.roomToPlain(room) : undefined;
    } catch (error) {
      console.error('MongoDB error in getRoomByCode:', error);
      throw error;
    }
  }

  async getRoom(id: string): Promise<RoomType | undefined> {
    try {
      await this.ensureConnection();
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return undefined;
      }
      
      const room = await Room.findById(id).exec();
      return room ? this.roomToPlain(room) : undefined;
    } catch (error) {
      console.error('MongoDB error in getRoom:', error);
      throw error;
    }
  }

  async getRoomsByUser(userId: string): Promise<RoomType[]> {
    try {
      await this.ensureConnection();
      
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return [];
      }
      
      const rooms = await Room.find({ 
        createdBy: new mongoose.Types.ObjectId(userId) 
      })
      .sort({ lastActivity: -1 }) // Sort by most recent activity
      .limit(10) // Limit to recent 10 rooms
      .exec();
      
      return rooms.map(room => this.roomToPlain(room));
    } catch (error) {
      console.error('MongoDB error in getRoomsByUser:', error);
      throw error;
    }
  }

  async updateRoomActivity(roomId: string): Promise<void> {
    try {
      await this.ensureConnection();
      
      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        throw new Error('Invalid room ID');
      }
      
      await Room.findByIdAndUpdate(
        roomId,
        { lastActivity: new Date() },
        { new: true }
      ).exec();
    } catch (error) {
      console.error('MongoDB error in updateRoomActivity:', error);
      throw error;
    }
  }

  async setRoomStatus(roomId: string, isActive: boolean): Promise<void> {
    try {
      await this.ensureConnection();
      
      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        throw new Error('Invalid room ID');
      }
      
      await Room.findByIdAndUpdate(
        roomId,
        { 
          isActive,
          lastActivity: new Date() 
        },
        { new: true }
      ).exec();
    } catch (error) {
      console.error('MongoDB error in setRoomStatus:', error);
      throw error;
    }
  }

  async getActiveRoomByCode(code: string): Promise<RoomType | undefined> {
    try {
      await this.ensureConnection();
      
      const room = await Room.findOne({ 
        code: code.toUpperCase(),
        isActive: true 
      }).exec();
      
      if (!room) return undefined;
      
      // Consider a room "active" if it was created recently or has recent activity
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      if (room.lastActivity && room.lastActivity > oneHourAgo) {
        return this.roomToPlain(room);
      }
      
      return undefined;
    } catch (error) {
      console.error('MongoDB error in getActiveRoomByCode:', error);
      throw error;
    }
  }

  // Additional helper methods for better MongoDB integration
  async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      await this.ensureConnection();
      
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID');
      }
      
      await User.findByIdAndUpdate(
        userId,
        { 
          isOnline,
          lastSeen: new Date()
        },
        { new: true }
      ).exec();
    } catch (error) {
      console.error('MongoDB error in updateUserOnlineStatus:', error);
      throw error;
    }
  }

  // Clean up inactive rooms (utility method)
  async cleanupInactiveRooms(hoursInactive: number = 24): Promise<number> {
    try {
      await this.ensureConnection();
      
      const cutoffTime = new Date(Date.now() - hoursInactive * 60 * 60 * 1000);
      
      const result = await Room.updateMany(
        { lastActivity: { $lt: cutoffTime }, isActive: true },
        { isActive: false }
      ).exec();
      
      return result.modifiedCount;
    } catch (error) {
      console.error('MongoDB error in cleanupInactiveRooms:', error);
      throw error;
    }
  }
}
