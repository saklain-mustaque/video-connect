import { recordingStorage } from './recording-storage';
import { azureBlobService } from './azure-blob-service';

/**
 * Cleanup service for automatic deletion of old recordings
 */
export class RecordingCleanupService {
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the cleanup service
   * Runs every hour to check for recordings that need to be deleted
   */
  start() {
    console.log('🧹 Starting recording cleanup service...');
    
    // Run immediately on start
    this.cleanup();
    
    // Then run every hour
    this.intervalId = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000); // 1 hour
    
    console.log('✅ Recording cleanup service started (runs every hour)');
  }

  /**
   * Stop the cleanup service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Recording cleanup service stopped');
    }
  }

  /**
   * Perform cleanup of expired recordings
   */
  private async cleanup() {
    try {
      console.log('🧹 Running recording cleanup...');
      
      const recordingsToDelete = await recordingStorage.getRecordingsForDeletion();
      
      if (recordingsToDelete.length === 0) {
        console.log('✅ No recordings to delete');
        return;
      }

      console.log(`📋 Found ${recordingsToDelete.length} recording(s) to delete`);

      let successCount = 0;
      let failCount = 0;

      for (const recording of recordingsToDelete) {
        try {
          console.log(`🗑️  Deleting recording: ${recording.id} (${recording.roomName})`);
          
          // Delete from Azure Blob Storage
          if (recording.blobName) {
            try {
              await azureBlobService.deleteRecording(recording.blobName);
              console.log(`  ✅ Blob deleted: ${recording.blobName}`);
            } catch (error) {
              console.error(`  ❌ Failed to delete blob: ${recording.blobName}`, error);
              // Continue with database deletion even if blob deletion fails
            }
          }

          // Delete from database
          await recordingStorage.deleteRecording(recording.id);
          console.log(`  ✅ Database record deleted: ${recording.id}`);
          
          successCount++;
        } catch (error) {
          console.error(`  ❌ Failed to delete recording ${recording.id}:`, error);
          failCount++;
        }
      }

      console.log(`✅ Cleanup complete: ${successCount} deleted, ${failCount} failed`);
    } catch (error) {
      console.error('❌ Error during recording cleanup:', error);
    }
  }

  /**
   * Manually trigger cleanup (useful for testing)
   */
  async manualCleanup() {
    console.log('🧹 Manual cleanup triggered...');
    await this.cleanup();
  }
}

export const recordingCleanupService = new RecordingCleanupService();
