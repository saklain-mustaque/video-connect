import { MongoDBStorage } from './mongodb-storage';

const mongoStorage = new MongoDBStorage();

export interface Recording {
  id: string;
  roomId: string;
  roomCode: string;
  roomName: string;
  userId: string;
  userName: string;
  participants?: string[]; // Array of user IDs who participated in the meeting
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  blobUrl?: string;
  blobName?: string;
  fileSize?: number;
  status: 'recording' | 'processing' | 'completed' | 'failed';
  localFilePath?: string; // Temporary local file path before upload
  error?: string;
  metadata?: Record<string, any>;
  deletionScheduledAt?: Date; // When the recording is scheduled for auto-deletion
}

export class RecordingStorage {
  /**
   * Create a new recording entry
   */
  async createRecording(
    roomId: string,
    roomCode: string,
    roomName: string,
    userId: string,
    userName: string,
    localFilePath: string
  ): Promise<Recording> {
    try {
      const collection = await mongoStorage.getRecordingsCollection();
      
      const startTime = new Date();
      const deletionScheduledAt = new Date(startTime.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
      
      const recording: Omit<Recording, 'id'> = {
        roomId,
        roomCode,
        roomName,
        userId,
        userName,
        startTime,
        status: 'recording',
        localFilePath,
        deletionScheduledAt
      };

      const result = await collection.insertOne(recording as any);
      
      return {
        id: result.insertedId.toString(),
        ...recording
      };
    } catch (error) {
      console.error('Error creating recording:', error);
      throw error;
    }
  }

  /**
   * Update recording status and info after upload
   */
  async updateRecording(
    recordingId: string,
    updates: {
      endTime?: Date;
      duration?: number;
      blobUrl?: string;
      blobName?: string;
      fileSize?: number;
      status?: Recording['status'];
      error?: string;
      localFilePath?: string;
      participants?: string[];
      deletionScheduledAt?: Date;
    }
  ): Promise<void> {
    try {
      const collection = await mongoStorage.getRecordingsCollection();
      const { ObjectId } = await import('mongodb');
      
      await collection.updateOne(
        { _id: new ObjectId(recordingId) },
        { $set: updates }
      );
    } catch (error) {
      console.error('Error updating recording:', error);
      throw error;
    }
  }

  /**
   * Get recording by ID
   */
  async getRecording(recordingId: string): Promise<Recording | null> {
    try {
      const collection = await mongoStorage.getRecordingsCollection();
      const { ObjectId } = await import('mongodb');
      
      const recording = await collection.findOne({ _id: new ObjectId(recordingId) });
      
      if (!recording) return null;
      
      return {
        id: recording._id.toString(),
        roomId: recording.roomId,
        roomCode: recording.roomCode,
        roomName: recording.roomName,
        userId: recording.userId,
        userName: recording.userName,
        participants: recording.participants,
        startTime: recording.startTime,
        endTime: recording.endTime,
        duration: recording.duration,
        blobUrl: recording.blobUrl,
        blobName: recording.blobName,
        fileSize: recording.fileSize,
        status: recording.status,
        localFilePath: recording.localFilePath,
        error: recording.error,
        metadata: recording.metadata,
        deletionScheduledAt: recording.deletionScheduledAt
      };
    } catch (error) {
      console.error('Error getting recording:', error);
      throw error;
    }
  }

  /**
   * Get all recordings for a room
   */
  async getRecordingsByRoom(roomId: string): Promise<Recording[]> {
    try {
      const collection = await mongoStorage.getRecordingsCollection();
      
      const recordings = await collection
        .find({ roomId })
        .sort({ startTime: -1 })
        .toArray();
      
      return recordings.map(rec => ({
        id: rec._id.toString(),
        roomId: rec.roomId,
        roomCode: rec.roomCode,
        roomName: rec.roomName,
        userId: rec.userId,
        userName: rec.userName,
        participants: rec.participants,
        startTime: rec.startTime,
        endTime: rec.endTime,
        duration: rec.duration,
        blobUrl: rec.blobUrl,
        blobName: rec.blobName,
        fileSize: rec.fileSize,
        status: rec.status,
        localFilePath: rec.localFilePath,
        error: rec.error,
        metadata: rec.metadata,
        deletionScheduledAt: rec.deletionScheduledAt
      }));
    } catch (error) {
      console.error('Error getting recordings by room:', error);
      throw error;
    }
  }

  /**
   * Get all recordings for a user
   */
  async getRecordingsByUser(userId: string): Promise<Recording[]> {
    try {
      const collection = await mongoStorage.getRecordingsCollection();
      
      const recordings = await collection
        .find({ userId })
        .sort({ startTime: -1 })
        .toArray();
      
      return recordings.map(rec => ({
        id: rec._id.toString(),
        roomId: rec.roomId,
        roomCode: rec.roomCode,
        roomName: rec.roomName,
        userId: rec.userId,
        userName: rec.userName,
        startTime: rec.startTime,
        endTime: rec.endTime,
        duration: rec.duration,
        blobUrl: rec.blobUrl,
        blobName: rec.blobName,
        fileSize: rec.fileSize,
        status: rec.status,
        localFilePath: rec.localFilePath,
        error: rec.error,
        metadata: rec.metadata
      }));
    } catch (error) {
      console.error('Error getting recordings by user:', error);
      throw error;
    }
  }

  /**
   * Delete a recording
   */
  async deleteRecording(recordingId: string): Promise<boolean> {
    try {
      const collection = await mongoStorage.getRecordingsCollection();
      const { ObjectId } = await import('mongodb');
      
      const result = await collection.deleteOne({ _id: new ObjectId(recordingId) });
      
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting recording:', error);
      throw error;
    }
  }

  /**
   * Get active recording for a room
   */
  async getActiveRecording(roomId: string): Promise<Recording | null> {
    try {
      const collection = await mongoStorage.getRecordingsCollection();
      
      const recording = await collection.findOne({
        roomId,
        status: { $in: ['recording', 'processing'] }
      });
      
      if (!recording) return null;
      
      return {
        id: recording._id.toString(),
        roomId: recording.roomId,
        roomCode: recording.roomCode,
        roomName: recording.roomName,
        userId: recording.userId,
        userName: recording.userName,
        participants: recording.participants,
        startTime: recording.startTime,
        endTime: recording.endTime,
        duration: recording.duration,
        blobUrl: recording.blobUrl,
        blobName: recording.blobName,
        fileSize: recording.fileSize,
        status: recording.status,
        localFilePath: recording.localFilePath,
        error: recording.error,
        metadata: recording.metadata,
        deletionScheduledAt: recording.deletionScheduledAt
      };
    } catch (error) {
      console.error('Error getting active recording:', error);
      throw error;
    }
  }

  /**
   * Get recordings for a user (creator or participant)
   */
  async getRecordingsForUser(userId: string): Promise<Recording[]> {
    try {
      const collection = await mongoStorage.getRecordingsCollection();
      
      const recordings = await collection
        .find({
          $or: [
            { userId },
            { participants: userId }
          ]
        })
        .sort({ startTime: -1 })
        .toArray();
      
      return recordings.map(rec => ({
        id: rec._id.toString(),
        roomId: rec.roomId,
        roomCode: rec.roomCode,
        roomName: rec.roomName,
        userId: rec.userId,
        userName: rec.userName,
        participants: rec.participants,
        startTime: rec.startTime,
        endTime: rec.endTime,
        duration: rec.duration,
        blobUrl: rec.blobUrl,
        blobName: rec.blobName,
        fileSize: rec.fileSize,
        status: rec.status,
        localFilePath: rec.localFilePath,
        error: rec.error,
        metadata: rec.metadata,
        deletionScheduledAt: rec.deletionScheduledAt
      }));
    } catch (error) {
      console.error('Error getting recordings for user:', error);
      throw error;
    }
  }

  /**
   * Get recordings that are scheduled for deletion
   */
  async getRecordingsForDeletion(): Promise<Recording[]> {
    try {
      const collection = await mongoStorage.getRecordingsCollection();
      const now = new Date();
      
      const recordings = await collection
        .find({
          deletionScheduledAt: { $lte: now },
          status: 'completed'
        })
        .toArray();
      
      return recordings.map(rec => ({
        id: rec._id.toString(),
        roomId: rec.roomId,
        roomCode: rec.roomCode,
        roomName: rec.roomName,
        userId: rec.userId,
        userName: rec.userName,
        participants: rec.participants,
        startTime: rec.startTime,
        endTime: rec.endTime,
        duration: rec.duration,
        blobUrl: rec.blobUrl,
        blobName: rec.blobName,
        fileSize: rec.fileSize,
        status: rec.status,
        localFilePath: rec.localFilePath,
        error: rec.error,
        metadata: rec.metadata,
        deletionScheduledAt: rec.deletionScheduledAt
      }));
    } catch (error) {
      console.error('Error getting recordings for deletion:', error);
      throw error;
    }
  }
}

export const recordingStorage = new RecordingStorage();
