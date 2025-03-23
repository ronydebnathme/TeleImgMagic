import path from 'path';
import fs from 'fs';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { storage } from '../storage';
import { NewMessage, NewMessageEvent } from 'telegram/events';
import { Api } from 'telegram/tl';
import { EventEmitter } from 'events';
import { log } from '../vite';

/**
 * Service for handling Telegram bot functionality
 * Handles file downloads and user interactions
 */
class TelegramBotService {
  private client: TelegramClient | null = null;
  private initialized: boolean = false;
  public events: EventEmitter = new EventEmitter();
  private sourceImagesDir: string = path.join(process.cwd(), 'Source Images');
  private tempExtractionDir: string = path.join(process.cwd(), 'Temp Extraction');
  private processedImagesDir: string = path.join(process.cwd(), 'Processed Images');
  private messageHandlers: { [key: string]: (event: NewMessageEvent) => Promise<void> } = {};
  
  constructor() {
    this.ensureDirectories();
    this.setupMessageHandlers();
  }
  
  /**
   * Ensure required directories exist
   */
  private async ensureDirectories() {
    const dirs = [
      this.sourceImagesDir, 
      this.tempExtractionDir, 
      this.processedImagesDir
    ];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      }
    }
  }
  
  /**
   * Setup message handlers for different commands and file types
   */
  private setupMessageHandlers() {
    // Handler for zip files from admins
    this.messageHandlers['zipFile'] = this.handleZipFileUpload.bind(this);
    
    // Handler for image requests based on trigger words
    this.messageHandlers['imageRequest'] = this.handleImageRequest.bind(this);
  }
  
  /**
   * Initialize the bot with the Telegram client
   */
  async initialize(client: TelegramClient) {
    if (this.initialized) return;
    
    this.client = client;
    
    // Add event handlers for new messages
    this.client.addEventHandler(this.handleNewMessage.bind(this), new NewMessage({}));
    
    console.log('TelegramBot service initialized');
    this.initialized = true;
  }
  
  /**
   * Handle incoming messages
   */
  private async handleNewMessage(event: NewMessageEvent) {
    try {
      if (!this.client) return;
      
      const message = event.message;
      const sender = await message.getSender();
      
      // Skip messages from the bot itself
      if (sender && 'self' in sender && sender.self) return;
      
      // Get sender username if available
      const senderUsername = sender && 'username' in sender ? sender.username : null;
      
      // Check if it's a direct message (not a group or channel)
      const isDM = !event.isGroup && !event.isChannel;
      
      // If it's a DM, check if the user is authorized
      if (isDM && senderUsername) {
        const isAuthorized = await storage.checkIsAuthorized(senderUsername);
        const isAdmin = await storage.checkIsAdmin(senderUsername);
        
        // If user is not authorized or admin, send them a message to contact @itachiavm
        if (!isAuthorized && !isAdmin) {
          await this.client.sendMessage(event.chatId, {
            message: "You are not authorized to use this bot in direct messages. Please contact @itachiavm for access."
          });
          
          // Log unauthorized access attempt
          await storage.createActivityLog({
            action: 'unauthorized_access',
            details: `Unauthorized access attempt from @${senderUsername}`,
            status: 'failed',
            fromUser: senderUsername
          });
          
          return; // Don't process the message further
        }
      }
      
      // Check if message contains a file
      if (message.media && message.media instanceof Api.MessageMediaDocument) {
        const document = message.media.document;
        const attributes = document.attributes;
        const filenameAttr = attributes.find(attr => attr instanceof Api.DocumentAttributeFilename);
        
        if (filenameAttr && filenameAttr instanceof Api.DocumentAttributeFilename) {
          const filename = filenameAttr.fileName;
          
          // Check if it's a zip file
          if (filename.toLowerCase().endsWith('.zip')) {
            // Check if sender is an admin
            if (senderUsername) {
              const isAdmin = await storage.checkIsAdmin(senderUsername);
              
              if (isAdmin) {
                await this.messageHandlers['zipFile'](event);
              } else {
                await this.client.sendMessage(event.chatId, {
                  message: "Sorry, only admin users can upload zip files."
                });
              }
            }
          }
        }
      } else if (message.text) {
        // Check for trigger words
        const config = await storage.getBotConfig();
        const isTriggerWord = config.triggerWords.some(
          trigger => message.text.toLowerCase().includes(trigger.toLowerCase())
        );
        
        // Check if we should respond in group chats
        const isGroupChat = event.isGroup || event.isChannel;
        if (isGroupChat && !config.workInGroups) return;
        
        if (isTriggerWord) {
          await this.messageHandlers['imageRequest'](event);
        }
      }
    } catch (error) {
      console.error('Error handling message:', error);
      await storage.incrementFailedOperations();
      
      // Log the error
      await storage.createActivityLog({
        action: 'message_handling',
        details: `Error handling message: ${error.message}`,
        status: 'failed'
      });
    }
  }
  
  /**
   * Handle zip file uploads from admin users
   */
  private async handleZipFileUpload(event: NewMessageEvent) {
    if (!this.client) return;
    
    try {
      const message = event.message;
      const sender = await message.getSender();
      const senderUsername = sender && 'username' in sender ? sender.username : 'unknown';
      
      // Let the user know we're starting the download
      const statusMessage = await this.client.sendMessage(event.chatId, {
        message: "Starting download of zip file. Please wait..."
      });
      
      // Extract document details
      const media = message.media as Api.MessageMediaDocument;
      const document = media.document;
      
      if (!document) {
        console.error('Error: Document is undefined in the message');
        await this.client.sendMessage(event.message.chatId, {
          message: '❌ Error: Unable to process the file. Document data is missing.'
        });
        return;
      }
      
      const attributes = document.attributes || [];
      const filenameAttr = attributes.find(attr => attr instanceof Api.DocumentAttributeFilename) as Api.DocumentAttributeFilename;
      const filename = filenameAttr ? filenameAttr.fileName : `unknown_${Date.now()}.zip`;
      
      // Handle filesize safely
      let filesize = 0;
      try {
        filesize = typeof document.size === 'number' ? document.size : 
                  (document.size && typeof document.size.toNumber === 'function') ? document.size.toNumber() : 0;
      } catch (e: any) {
        console.warn('Warning: Could not determine file size - ' + e.message);
      }
      
      // Create a unique filename to avoid conflicts
      const uniqueFilename = `${Date.now()}_${filename}`;
      const filePath = path.join(this.sourceImagesDir, uniqueFilename);
      
      // Log the start of the download
      await storage.createActivityLog({
        action: 'file_download',
        details: `Starting download of ${filename} (${this.formatFileSize(filesize)})`,
        status: 'processing',
        filename,
        filesize,
        fromUser: senderUsername,
      });
      
      // Update the status message periodically
      let lastProgress = 0;
      const progressInterval = setInterval(async () => {
        if (lastProgress > 0 && lastProgress < 100) {
          await this.client!.editMessage(event.chatId, {
            message: statusMessage.id,
            text: `Downloading: ${filename} - ${lastProgress}% complete...`
          });
        }
      }, 2000);
      
      // Download the file
      const buffer = await this.client.downloadMedia(media, {
        progressCallback: (progress) => {
          lastProgress = Math.floor(progress * 100);
        }
      });
      
      clearInterval(progressInterval);
      
      // Write the file to disk
      fs.writeFileSync(filePath, buffer);
      
      // Update the status message
      await this.client.editMessage(event.chatId, {
        message: statusMessage.id,
        text: `✅ Successfully downloaded ${filename} (${this.formatFileSize(filesize)})`
      });
      
      // Log the successful download
      await storage.createActivityLog({
        action: 'file_download',
        details: `Successfully downloaded ${filename} (${this.formatFileSize(filesize)})`,
        status: 'completed',
        filename,
        filesize,
        fromUser: senderUsername,
      });
      
      // Update storage stats
      const totalStorage = await this.calculateStorageUsed();
      await storage.updateStorageUsed(totalStorage);
      
    } catch (error) {
      console.error('Error downloading zip file:', error);
      
      // Notify user of the error
      await this.client.sendMessage(event.chatId, {
        message: `Error downloading zip file: ${error.message}`
      });
      
      // Log the error
      await storage.createActivityLog({
        action: 'file_download',
        details: `Error downloading zip file: ${error.message}`,
        status: 'failed',
        fromUser: event.message.peerId.toString(),
      });
      
      await storage.incrementFailedOperations();
    }
  }
  
  /**
   * Handle requests for images
   */
  private async handleImageRequest(event: NewMessageEvent) {
    if (!this.client) return;
    
    try {
      const message = event.message;
      let botConfig = await storage.getBotConfig();
      const requestId = Date.now().toString();
      
      // Store user information early to ensure we have it for the entire process
      // This addresses the issue where username appears as "unknown"
      let senderInfo = {
        userId: message.peerId.toString(),
        username: "unknown",
        firstName: "User",
        lastName: "",
        isReplyToBot: false
      };
      
      // Try to get detailed sender information
      try {
        const sender = await this.client.getEntity(message.peerId);
        if ('firstName' in sender) {
          senderInfo.firstName = sender.firstName || "User";
        }
        if ('lastName' in sender) {
          senderInfo.lastName = sender.lastName || "";
        }
        if ('username' in sender) {
          senderInfo.username = sender.username || "user";
        }
        
        console.log(`Successfully retrieved sender info: ${senderInfo.username} (${senderInfo.firstName})`);
      } catch (error) {
        console.warn('Could not get detailed sender info, using default values:', error);
      }
      
      // Send acknowledgment message that includes username for personalization
      const statusMessage = await this.client.sendMessage(event.chatId, {
        message: botConfig.replyMessage.replace(/{first_name}/g, senderInfo.firstName)
      });
      
      // Log the request with the user information
      const logEntry = await storage.createActivityLog({
        action: 'image_request',
        details: `Image request from ${senderInfo.username} (${senderInfo.firstName})`,
        status: 'processing',
        fromUser: senderInfo.userId,
      });
      
      // Import the imageModifier service
      // This is done dynamically to avoid circular dependency issues
      const { imageModifier } = await import('./imageModifierService');
      
      // Setup progress listener
      const progressEmitter = imageModifier.getProgressEmitter(requestId);
      if (progressEmitter) {
        progressEmitter.on('progress', async (data: { progress: number, message: string }) => {
          try {
            // Update the Telegram message
            await this.client!.editMessage(event.chatId, {
              message: statusMessage.id,
              text: `${data.message} (${data.progress}%)`
            });
            
            // Also broadcast progress via WebSocket for the dashboard
            // We directly use our events emitter here which will be picked up by the routes.ts WebSocket handler
            this.events.emit('downloadProgress', {
              progress: data.progress,
              requestId: requestId,
              message: data.message
            });
          } catch (error) {
            console.error('Error updating progress message:', error);
          }
        });
        
        progressEmitter.on('error', async (error: Error) => {
          console.error('Error processing images:', error);
          
          try {
            await this.client!.editMessage(event.chatId, {
              message: statusMessage.id,
              text: `Error processing images: ${error.message}`
            });
          } catch (error) {
            console.error('Error updating error message:', error);
          }
        });
      }
      
      // Start the image processing
      await this.client.editMessage(event.chatId, {
        message: statusMessage.id,
        text: "Starting image processing..."
      });
      
      // Process the images
      let outputZipPath = await imageModifier.processImages(requestId, botConfig.imagesToSend);
      
      // Send the zip file
      await this.client.editMessage(event.chatId, {
        message: statusMessage.id,
        text: "Processing complete! Sending the image pack..."
      });
      
      // Emit download completion event for the dashboard
      this.events.emit('downloadProgress', {
        progress: 100,
        requestId: requestId,
        message: "Processing complete"
      });
      
      // Get file stats for logging
      const fileStats = fs.statSync(outputZipPath);
      
      // Update botConfig with the latest settings
      botConfig = await storage.getBotConfig();
      
      // Import formatTemplate function
      const { formatTemplate } = await import('./telegramClient');
      
      // Prepare format data object for templates using the sender info we already have
      const formatData = {
        username: senderInfo.username,
        firstName: senderInfo.firstName,
        lastName: senderInfo.lastName,
        groupName: 'Direct Message' // Default for direct messages
      };
      
      // Get group name if it's a group chat
      try {
        if (event.isGroup) {
          const chat = await this.client.getEntity(event.chatId);
          if ('title' in chat) {
            formatData.groupName = chat.title || 'Group Chat';
          }
        }
      } catch (error) {
        console.warn('Could not get group info:', error);
      }
      
      // Format caption using the helper function
      const caption = formatTemplate(botConfig.captionFormat, formatData);
      
      // Format filename using the helper function
      const templateFilename = formatTemplate(botConfig.fileNameFormat, formatData);
      
      // Rename the file with the formatted name
      const fileExt = path.extname(outputZipPath);
      const baseDir = path.dirname(outputZipPath);
      const newFilePath = path.join(baseDir, `${templateFilename}${fileExt}`);
      
      try {
        // Rename the file if the filename format is customized
        if (botConfig.fileNameFormat !== "Photos-{date}-{username}") {
          fs.renameSync(outputZipPath, newFilePath);
          outputZipPath = newFilePath; // Update path for sending
        }
      } catch (error) {
        console.error('Error renaming output file:', error);
        // Continue with original path if rename fails
      }
      
      // Send the file using the file path with formatted caption
      await this.client.sendFile(event.chatId, {
        file: outputZipPath, // Use the file path directly
        caption: caption,
        formatData: formatData // Pass formatData for additional formatting at the client level
      });
      
      // Increment the files sent counter
      await storage.incrementFilesSent();
      
      // Update the status message
      await this.client.editMessage(event.chatId, {
        message: statusMessage.id,
        text: "✅ Image pack sent successfully!"
      });
      
      // Log the successful processing
      await storage.createActivityLog({
        action: 'image_request',
        details: `Successfully processed and sent ${botConfig.imagesToSend} image folders for ${senderInfo.username}`,
        status: 'completed',
        filename: path.basename(outputZipPath),
        filesize: fileStats.size,
        fromUser: senderInfo.userId,
      });
      
      // Increment the processed image count
      await storage.incrementImagesProcessed();
      
      // Clean up the processed zip file after a delay
      setTimeout(() => {
        try {
          if (fs.existsSync(outputZipPath)) {
            fs.unlinkSync(outputZipPath);
          }
        } catch (error) {
          console.error('Error cleaning up zip file:', error);
        }
      }, 60000); // 1 minute delay
      
    } catch (error) {
      console.error('Error handling image request:', error);
      
      // Get basic user info for error logging
      let errorSenderInfo = {
        userId: event.message.peerId.toString(),
        username: "unknown"
      };
      
      // Try to get at least some user information for the error log
      try {
        // Extract username from peerId if possible
        const peerIdStr = event.message.peerId.toString();
        if (peerIdStr.includes('@')) {
          errorSenderInfo.username = peerIdStr.split('@')[1];
        }
      } catch (userInfoError) {
        console.warn('Could not extract basic user info for error log:', userInfoError);
      }
      
      // Notify user of the error
      await this.client.sendMessage(event.chatId, {
        message: `Error processing image request: ${error instanceof Error ? error.message : String(error)}`
      });
      
      // Log the error
      await storage.createActivityLog({
        action: 'image_request',
        details: `Error processing image request for ${errorSenderInfo.username}: ${error instanceof Error ? error.message : String(error)}`,
        status: 'failed',
        fromUser: errorSenderInfo.userId,
      });
      
      await storage.incrementFailedOperations();
    }
  }
  
  /**
   * Calculate the total storage used by source and processed images
   */
  private async calculateStorageUsed(): Promise<number> {
    const dirs = [this.sourceImagesDir, this.processedImagesDir];
    let totalSize = 0;
    
    for (const dir of dirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.isFile()) {
            totalSize += stats.size;
          }
        }
      }
    }
    
    return totalSize;
  }
  
  /**
   * Format file size in a human-readable format
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const telegramBot = new TelegramBotService();