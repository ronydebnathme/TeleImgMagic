import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { EventEmitter } from 'events';
import { telegramClient } from './telegramClient';
import { storage } from '../storage';

// Progress emitters by job ID
const progressEmitters: Map<number, EventEmitter> = new Map();

class ImageProcessorService {
  private thumbnailsDir: string = path.join(process.cwd(), 'uploads', 'thumbnails');
  private processedDir: string = path.join(process.cwd(), 'uploads', 'processed');

  constructor() {
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    try {
      await fs.mkdir(this.thumbnailsDir, { recursive: true });
      await fs.mkdir(this.processedDir, { recursive: true });
    } catch (error) {
      console.error('Error creating directories:', error);
    }
  }

  /**
   * Process image with the given options
   */
  async processImage(
    filePath: string, 
    jobId: number, 
    options: ImageProcessingOptions
  ): Promise<{ 
    filename: string; 
    filesize: number; 
    thumbnailUrl: string; 
    telegramMessageId: string;
  }> {
    try {
      // Create progress emitter for this job if it doesn't exist
      if (!progressEmitters.has(jobId)) {
        progressEmitters.set(jobId, new EventEmitter());
      }
      const emitter = progressEmitters.get(jobId)!;

      // Report start
      emitter.emit('progress', 0);

      // Load image
      let imageBuffer = await fs.readFile(filePath);
      let imageProcessor = sharp(imageBuffer);
      const metadata = await imageProcessor.metadata();

      const { width: originalWidth, height: originalHeight } = metadata;
      if (!originalWidth || !originalHeight) {
        throw new Error('Could not determine image dimensions');
      }

      // Generate unique filename
      const originalFilename = path.basename(filePath);
      const timestamp = Date.now();
      const processedFilename = `processed_${timestamp}_${originalFilename}`;
      const processedPath = path.join(this.processedDir, processedFilename);

      // Apply resize if specified
      if (options.resize && (options.resize.width || options.resize.height)) {
        const resizeOptions: sharp.ResizeOptions = {
          width: options.resize.width,
          height: options.resize.height,
          fit: 'contain',
        };

        // Maintain aspect ratio if requested
        if (options.resize.maintainAspectRatio) {
          if (!options.resize.width) {
            // Only height specified, calculate width to maintain aspect ratio
            const aspectRatio = originalWidth / originalHeight;
            resizeOptions.width = Math.round(aspectRatio * (options.resize.height || originalHeight));
          } else if (!options.resize.height) {
            // Only width specified, calculate height to maintain aspect ratio
            const aspectRatio = originalHeight / originalWidth;
            resizeOptions.height = Math.round(aspectRatio * (options.resize.width || originalWidth));
          }
        }

        imageProcessor = imageProcessor.resize(resizeOptions);
        emitter.emit('progress', 20);
      }

      // Apply crop if specified
      if (options.crop && options.crop.aspect !== 'original') {
        let aspectRatio = 1; // Default 1:1
        
        switch (options.crop.aspect) {
          case '1:1':
            aspectRatio = 1;
            break;
          case '4:3':
            aspectRatio = 4/3;
            break;
          case '16:9':
            aspectRatio = 16/9;
            break;
          default:
            aspectRatio = 1;
        }
        
        // Get new metadata after resize
        const resizedMetadata = await imageProcessor.metadata();
        const { width, height } = resizedMetadata;
        
        if (width && height) {
          let cropWidth, cropHeight;
          
          if (width / height > aspectRatio) {
            // Image is wider than target aspect ratio
            cropHeight = height;
            cropWidth = Math.round(height * aspectRatio);
          } else {
            // Image is taller than target aspect ratio
            cropWidth = width;
            cropHeight = Math.round(width / aspectRatio);
          }
          
          // Calculate left and top for centering
          const left = Math.floor((width - cropWidth) / 2);
          const top = Math.floor((height - cropHeight) / 2);
          
          imageProcessor = imageProcessor.extract({
            left, top, width: cropWidth, height: cropHeight
          });
        }
        
        emitter.emit('progress', 40);
      }

      // Apply adjustments if specified
      if (options.adjustments) {
        // Convert brightness and contrast from 0-100 to appropriate ranges
        const brightnessValue = (options.adjustments.brightness - 50) / 50; // -1 to 1
        const contrastValue = (options.adjustments.contrast - 50) / 50 + 1; // 0 to 2
        
        imageProcessor = imageProcessor.modulate({
          brightness: 1 + brightnessValue,
        }).gamma(contrastValue);
        
        emitter.emit('progress', 60);
      }

      // Apply filters if specified
      if (options.filters && options.filters.name !== 'none') {
        switch (options.filters.name) {
          case 'grayscale':
            imageProcessor = imageProcessor.grayscale();
            break;
          case 'sepia':
            imageProcessor = imageProcessor.modulate({ saturation: 0.8 }).tint({ r: 255, g: 220, b: 180 });
            break;
          case 'vintage':
            imageProcessor = imageProcessor
              .modulate({ brightness: 1.1, saturation: 0.8 })
              .tint({ r: 240, g: 220, b: 190 })
              .gamma(1.1);
            break;
          case 'clarity':
            imageProcessor = imageProcessor
              .modulate({ brightness: 1.05, saturation: 1.2 })
              .sharpen(0.5);
            break;
          case 'dramatic':
            imageProcessor = imageProcessor
              .modulate({ brightness: 0.9, saturation: 1.5 })
              .gamma(1.2)
              .sharpen(1);
            break;
        }
        
        emitter.emit('progress', 80);
      }

      // Process and save the image
      const processedBuffer = await imageProcessor.toBuffer();
      await fs.writeFile(processedPath, processedBuffer);
      
      // Calculate file size
      const stats = await fs.stat(processedPath);
      const filesize = stats.size;
      
      // Create thumbnail
      const thumbnailFilename = `thumb_${timestamp}_${originalFilename}`;
      const thumbnailPath = path.join(this.thumbnailsDir, thumbnailFilename);
      await sharp(processedBuffer)
        .resize(200, 200, { fit: 'inside' })
        .toFile(thumbnailPath);
      
      // Thumbnail URL (relative path for use in web)
      const thumbnailUrl = `/thumbnails/${thumbnailFilename}`;
      
      emitter.emit('progress', 90);
      
      // Send to Telegram
      const { messageId } = await telegramClient.sendFile(
        // Assuming this is sending to the admin/user's chat ID
        // We'll need to get this from configuration or the storage
        "me", // This is a special identifier in Telegram for "self" chat
        {
          file: processedPath,
          caption: `Processed image: ${originalFilename}`,
          // Add format data for template processing
          formatData: {
            username: "admin", // Default value, would be better with actual user info
            firstName: "Admin",
            groupName: "Image Processing Service"
          }
        }
      );
      
      // Update storage stats
      await this.updateStorageStats();
      
      emitter.emit('progress', 100);
      
      // Clean up job emitter after 1 minute
      setTimeout(() => {
        progressEmitters.delete(jobId);
      }, 60 * 1000);
      
      return {
        filename: processedFilename,
        filesize,
        thumbnailUrl,
        telegramMessageId: messageId,
      };
    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
    }
  }

  /**
   * Get progress emitter for a job
   */
  getProgressEmitter(jobId: number): EventEmitter {
    if (!progressEmitters.has(jobId)) {
      progressEmitters.set(jobId, new EventEmitter());
    }
    return progressEmitters.get(jobId)!;
  }

  /**
   * Update storage statistics
   */
  private async updateStorageStats() {
    try {
      // Calculate total storage used
      const [uploadStats, processedStats, thumbnailsStats] = await Promise.all([
        this.calculateDirSize(path.join(process.cwd(), 'uploads')),
        this.calculateDirSize(this.processedDir),
        this.calculateDirSize(this.thumbnailsDir),
      ]);
      
      const totalBytes = uploadStats + processedStats + thumbnailsStats;
      await storage.updateStorageUsed(totalBytes);
    } catch (error) {
      console.error('Error updating storage stats:', error);
    }
  }

  /**
   * Calculate directory size recursively
   */
  private async calculateDirSize(dirPath: string): Promise<number> {
    try {
      let size = 0;
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isDirectory()) {
          size += await this.calculateDirSize(filePath);
        } else {
          size += stats.size;
        }
      }
      
      return size;
    } catch (error) {
      console.error('Error calculating directory size:', error);
      return 0;
    }
  }
}

// Types
export interface ImageProcessingOptions {
  resize?: {
    width?: number;
    height?: number;
    maintainAspectRatio: boolean;
  };
  crop?: {
    aspect: string;
  };
  rotate?: {
    degrees: number;
    flipHorizontal?: boolean;
    flipVertical?: boolean;
  };
  adjustments?: {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
    sharpen: number;
    noise: number;
  };
  filters?: {
    name: string;
    intensity: number;
  };
  metadata?: {
    removeExif: boolean;
    addRandomMetadata: boolean;
  };
}

// Create and export singleton instance
export const imageProcessor = new ImageProcessorService();
