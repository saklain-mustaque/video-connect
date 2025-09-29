import { AccessToken } from 'livekit-server-sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface TokenOptions {
  roomName: string;
  participantIdentity: string;
  participantName?: string;
  participantMetadata?: Record<string, any>;
  ttl?: string; // Time to live, e.g., '10h', '7d'
}

interface TokenPermissions {
  canPublish?: boolean;
  canSubscribe?: boolean;
  canPublishData?: boolean;
  hidden?: boolean;
  recorder?: boolean;
}

export class LiveKitTokenService {
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.apiKey = process.env.LIVEKIT_API_KEY || '';
    this.apiSecret = process.env.LIVEKIT_API_SECRET || '';

    if (!this.apiKey || !this.apiSecret) {
      throw new Error(
        'LiveKit API credentials not found. Please set LIVEKIT_API_KEY and LIVEKIT_API_SECRET in your environment variables.'
      );
    }
  }

  /**
   * Generate an access token for a participant to join a room
   */
  async generateToken(
    options: TokenOptions,
    permissions: TokenPermissions = {}
  ): Promise<string> {
    try {
      // Create access token
      const token = new AccessToken(this.apiKey, this.apiSecret, {
        identity: options.participantIdentity,
        name: options.participantName || options.participantIdentity,
        metadata: JSON.stringify(options.participantMetadata || {}),
        ttl: options.ttl || '10h', // Default 10 hours
      });

      // Set video permissions
      token.addGrant({
        room: options.roomName,
        roomJoin: true,
        canPublish: permissions.canPublish !== false, // Default true
        canSubscribe: permissions.canSubscribe !== false, // Default true
        canPublishData: permissions.canPublishData !== false, // Default true
        hidden: permissions.hidden || false,
        recorder: permissions.recorder || false,
      });

      const jwt = await token.toJwt();
      
      console.log(`✅ Generated token for ${options.participantIdentity} in room ${options.roomName}`);
      
      return jwt;
    } catch (error) {
      console.error('❌ Failed to generate LiveKit token:', error);
      throw new Error('Failed to generate access token');
    }
  }

  /**
   * Generate token specifically for video call participants
   */
  async generateVideoCallToken(
    roomCode: string,
    userId: string,
    displayName: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    return this.generateToken(
      {
        roomName: roomCode,
        participantIdentity: userId,
        participantName: displayName,
        participantMetadata: metadata,
        ttl: '12h', // 12 hours for video calls
      },
      {
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        hidden: false,
        recorder: false,
      }
    );
  }

  /**
   * Generate token for screen sharing
   */
  async generateScreenShareToken(
    roomCode: string,
    userId: string,
    displayName: string
  ): Promise<string> {
    return this.generateToken(
      {
        roomName: roomCode,
        participantIdentity: `${userId}_screenshare`,
        participantName: `${displayName} (Screen)`,
        ttl: '2h', // 2 hours for screen sharing
      },
      {
        canPublish: true,
        canSubscribe: false,
        canPublishData: false,
        hidden: false,
        recorder: false,
      }
    );
  }

  /**
   * Generate token for recording/admin purposes
   */
  async generateRecorderToken(
    roomCode: string,
    recorderId: string = 'recorder'
  ): Promise<string> {
    return this.generateToken(
      {
        roomName: roomCode,
        participantIdentity: recorderId,
        participantName: 'Recorder Bot',
        ttl: '24h',
      },
      {
        canPublish: false,
        canSubscribe: true,
        canPublishData: false,
        hidden: true,
        recorder: true,
      }
    );
  }

  /**
   * Validate LiveKit configuration
   */
  validateConfiguration(): { valid: boolean; error?: string } {
    try {
      if (!this.apiKey || !this.apiSecret) {
        return {
          valid: false,
          error: 'Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET environment variables',
        };
      }

      if (!process.env.LIVEKIT_WS_URL) {
        return {
          valid: false,
          error: 'Missing LIVEKIT_WS_URL environment variable',
        };
      }

      // Validate API key format (should be alphanumeric)
      if (!/^[A-Za-z0-9]+$/.test(this.apiKey)) {
        return {
          valid: false,
          error: 'Invalid LIVEKIT_API_KEY format',
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get LiveKit server URL
   */
  getServerUrl(): string {
    return process.env.LIVEKIT_WS_URL || '';
  }
}

// Create a singleton instance
export const liveKitService = new LiveKitTokenService();

// Export types for use in other files
export type { TokenOptions, TokenPermissions };
