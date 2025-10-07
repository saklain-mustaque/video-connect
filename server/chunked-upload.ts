import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
const UPLOAD_DIR = path.join(process.cwd(), 'uploads/chunks');

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create upload directory:', error);
  }
}

ensureUploadDir();

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadId = req.body.uploadId || crypto.randomUUID();
    const chunkDir = path.join(UPLOAD_DIR, uploadId);
    await fs.mkdir(chunkDir, { recursive: true });
    cb(null, chunkDir);
  },
  filename: (req, file, cb) => {
    const chunkIndex = req.body.chunkIndex || '0';
    cb(null, `chunk-${chunkIndex}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB per chunk
});

export function registerChunkedUploadRoutes(app: express.Express) {
  // Initialize upload
  app.post('/api/recordings/:id/upload/init', async (req, res) => {
    try {
      const uploadId = crypto.randomUUID();
      const { totalChunks, fileName, fileSize } = req.body;
      
      res.json({
        uploadId,
        chunkSize: CHUNK_SIZE,
        totalChunks,
        message: 'Upload initialized'
      });
    } catch (error) {
      console.error('Upload init error:', error);
      res.status(500).json({ error: 'Failed to initialize upload' });
    }
  });

  // Upload chunk
  app.post('/api/recordings/:id/upload/chunk', upload.single('chunk'), async (req, res) => {
    try {
      const { id } = req.params;
      const { uploadId, chunkIndex, totalChunks } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No chunk provided' });
      }

      res.json({
        uploadId,
        chunkIndex: parseInt(chunkIndex),
        received: true,
        message: `Chunk ${parseInt(chunkIndex) + 1}/${totalChunks} uploaded`
      });
    } catch (error) {
      console.error('Chunk upload error:', error);
      res.status(500).json({ error: 'Failed to upload chunk' });
    }
  });

  // Complete upload
  app.post('/api/recordings/:id/upload/complete', async (req, res) => {
    try {
      const { id } = req.params;
      const { uploadId, fileName } = req.body;
      
      const chunkDir = path.join(UPLOAD_DIR, uploadId);
      const finalPath = path.join(process.cwd(), 'recordings', `${id}-${Date.now()}.webm`);
      
      // Ensure recordings directory exists
      await fs.mkdir(path.dirname(finalPath), { recursive: true });
      
      // Read all chunks and combine
      const files = await fs.readdir(chunkDir);
      const sortedFiles = files.sort((a, b) => {
        const aIndex = parseInt(a.split('-')[1]);
        const bIndex = parseInt(b.split('-')[1]);
        return aIndex - bIndex;
      });
      
      // Create write stream for final file
      const writeStream = require('fs').createWriteStream(finalPath);
      
      for (const file of sortedFiles) {
        const chunkPath = path.join(chunkDir, file);
        const chunkData = await fs.readFile(chunkPath);
        writeStream.write(chunkData);
      }
      
      writeStream.end();
      
      // Wait for write to complete
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      
      // Clean up chunks
      await fs.rm(chunkDir, { recursive: true, force: true });
      
      // Get file stats
      const stats = await fs.stat(finalPath);
      
      // Update recording in database (you'll need to import your storage)
      // await recordingStorage.updateRecording(id, {
      //   localFilePath: finalPath,
      //   fileSize: stats.size,
      //   status: 'completed'
      // });
      
      res.json({
        recordingId: id,
        status: 'completed',
        fileSize: stats.size,
        path: finalPath,
        message: 'Upload completed successfully'
      });
    } catch (error) {
      console.error('Complete upload error:', error);
      res.status(500).json({ error: 'Failed to complete upload' });
    }
  });
}