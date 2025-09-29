import mongoose, { Schema, Document } from 'mongoose';
import { z } from 'zod';

// User Interface
export interface IUser extends Document {
  _id: string;
  username: string;
  displayName: string;
  email?: string;
  password: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Room Interface
export interface IRoom extends Document {
  _id: string;
  name: string;
  code: string;
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  lastActivity: Date;
}

// Message Interface
export interface IMessage extends Document {
  _id: string;
  roomId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  content: string;
  type: string;
  timestamp: Date;
}

// User Schema
const userSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true // allows multiple null/undefined values
  },
  password: {
    type: String,
    required: true
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Room Schema
const roomSchema = new Schema<IRoom>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Message Schema
const messageSchema = new Schema<IMessage>({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'file'],
    default: 'text'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Create Models
export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
export const Room = mongoose.models.Room || mongoose.model<IRoom>('Room', roomSchema);
export const Message = mongoose.models.Message || mongoose.model<IMessage>('Message', messageSchema);

// Zod Schemas for validation
export const insertUserSchema = z.object({
  username: z.string().min(3).trim(),
  displayName: z.string().min(1).trim(),
  email: z.string().email().optional(),
  password: z.string().min(6),
});

export const insertRoomSchema = z.object({
  name: z.string().min(1).trim(),
});

export const insertMessageSchema = z.object({
  roomId: z.string(),
  content: z.string().min(1),
  type: z.string().default('text'),
});

// Type exports for compatibility with your existing code
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserType = {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  password: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type RoomType = {
  id: string;
  name: string;
  code: string;
  createdBy: string;
  isActive: boolean;
  createdAt: Date;
  lastActivity: Date;
};

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type MessageType = {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  type: string;
  timestamp: Date;
};
