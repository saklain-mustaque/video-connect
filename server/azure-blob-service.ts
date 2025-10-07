import { BlobServiceClient, StorageSharedKeyCredential, ContainerClient } from '@azure/storage-blob';
import * as fs from 'fs';
import * as path from 'path';

export class AzureBlobService {
  private blobServiceClient: BlobServiceClient;
  private containerName: string = 'recordings';
  private containerClient: ContainerClient | null = null;

  constructor() {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

    if (!accountName || !accountKey) {
      if (!connectionString) {
        throw new Error(
          'Azure Storage credentials not found. Set AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY, or AZURE_STORAGE_CONNECTION_STRING'
        );
      }
      // Use connection string if provided
      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    } else {
      // Use account name and key
      const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
      this.blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        sharedKeyCredential
      );
    }
  }

  /**
   * Initialize the container (create if it doesn't exist)
   */
  async initializeContainer(): Promise<void> {
    try {
      this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      
      // Create container if it doesn't exist
      const exists = await this.containerClient.exists();
      if (!exists) {
        await this.containerClient.create({
          access: 'blob' // Public read access for blobs
        });
        console.log(`✅ Created Azure Blob container: ${this.containerName}`);
      } else {
        console.log(`✅ Azure Blob container already exists: ${this.containerName}`);
      }
    } catch (error) {
      console.error('❌ Error initializing Azure Blob container:', error);
      throw error;
    }
  }

  /**
   * Upload a recording file to Azure Blob Storage
   */
  async uploadRecording(
    filePath: string,
    blobName: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    try {
      if (!this.containerClient) {
        await this.initializeContainer();
      }

      const blockBlobClient = this.containerClient!.getBlockBlobClient(blobName);
      
      // Upload file
      const fileContent = fs.readFileSync(filePath);
      await blockBlobClient.uploadData(fileContent, {
        blobHTTPHeaders: {
          blobContentType: this.getContentType(filePath)
        },
        metadata: metadata || {}
      });

      // Return the blob URL
      const url = blockBlobClient.url;
      console.log(`✅ Uploaded recording to Azure Blob: ${url}`);
      
      // Clean up local file after upload
      fs.unlinkSync(filePath);
      
      return url;
    } catch (error) {
      console.error('❌ Error uploading recording to Azure Blob:', error);
      throw error;
    }
  }

  /**
   * Generate a SAS URL for secure access to a blob
   */
  async generateSasUrl(blobName: string, expiryMinutes: number = 60): Promise<string> {
    try {
      if (!this.containerClient) {
        await this.initializeContainer();
      }

      const blockBlobClient = this.containerClient!.getBlockBlobClient(blobName);
      
      // Generate SAS token
      const expiryDate = new Date();
      expiryDate.setMinutes(expiryDate.getMinutes() + expiryMinutes);

      // Note: For SAS token generation, you need to use BlobSASSignatureValues
      // This is a simplified version - in production, implement proper SAS generation
      const url = blockBlobClient.url;
      
      return url;
    } catch (error) {
      console.error('❌ Error generating SAS URL:', error);
      throw error;
    }
  }

  /**
   * Generate a download URL (alias for generateSasUrl)
   */
  async generateDownloadUrl(blobName: string, expiryMinutes: number = 60): Promise<string> {
    return this.generateSasUrl(blobName, expiryMinutes);
  }

  /**
   * Delete a recording from Azure Blob Storage
   */
  async deleteRecording(blobName: string): Promise<boolean> {
    try {
      if (!this.containerClient) {
        await this.initializeContainer();
      }

      const blockBlobClient = this.containerClient!.getBlockBlobClient(blobName);
      await blockBlobClient.delete();
      
      console.log(`✅ Deleted recording from Azure Blob: ${blobName}`);
      return true;
    } catch (error) {
      console.error('❌ Error deleting recording from Azure Blob:', error);
      return false;
    }
  }

  /**
   * List all recordings in the container
   */
  async listRecordings(prefix?: string): Promise<Array<{ name: string; url: string; size: number; lastModified: Date }>> {
    try {
      if (!this.containerClient) {
        await this.initializeContainer();
      }

      const recordings = [];
      const iterator = this.containerClient!.listBlobsFlat({ prefix });

      for await (const blob of iterator) {
        const blockBlobClient = this.containerClient!.getBlockBlobClient(blob.name);
        recordings.push({
          name: blob.name,
          url: blockBlobClient.url,
          size: blob.properties.contentLength || 0,
          lastModified: blob.properties.lastModified || new Date()
        });
      }

      return recordings;
    } catch (error) {
      console.error('❌ Error listing recordings from Azure Blob:', error);
      throw error;
    }
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.webm': 'video/webm',
      '.mp4': 'video/mp4',
      '.mkv': 'video/x-matroska',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime'
    };
    return contentTypes[ext] || 'application/octet-stream';
  }

  /**
   * Check if Azure Storage is configured
   */
  isConfigured(): boolean {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

    return !!(connectionString || (accountName && accountKey));
  }

  /**
   * Validate Azure Storage configuration
   */
  static validateConfiguration(): { valid: boolean; error?: string } {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

    if (!accountName && !connectionString) {
      return {
        valid: false,
        error: 'AZURE_STORAGE_ACCOUNT_NAME or AZURE_STORAGE_CONNECTION_STRING is required'
      };
    }

    if (accountName && !accountKey && !connectionString) {
      return {
        valid: false,
        error: 'AZURE_STORAGE_ACCOUNT_KEY is required when using AZURE_STORAGE_ACCOUNT_NAME'
      };
    }

    return { valid: true };
  }
}

// Create singleton instance
export const azureBlobService = new AzureBlobService();
