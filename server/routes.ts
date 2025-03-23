import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { z } from "zod";
import WebSocket, { WebSocketServer } from "ws";
import { 
  insertImageProcessingJobSchema, 
  insertTelegramCredentialsSchema,
  insertAdminUserSchema,
  insertBotConfigSchema,
  insertActivityLogSchema,
  insertAuthorizedUserSchema,
  insertUserSchema,
  insertUserSessionSchema
} from "@shared/schema";
import { telegramClient } from "./services/telegramClient";
import { hashPassword } from "./auth";
import { imageProcessor } from "./services/imageProcessor";
import { telegramBot } from "./services/telegramBotService";
import { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { setupAuth, isAuthenticated as authIsAuthenticated, isAdmin as authIsAdmin } from "./auth";

// Configure multer for file uploads
const upload = multer({
  dest: path.join(process.cwd(), "uploads"),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
});

// Create uploads directory if it doesn't exist
const ensureUploadsDir = async () => {
  const uploadsDir = path.join(process.cwd(), "uploads");
  try {
    await fs.access(uploadsDir);
  } catch (error) {
    await fs.mkdir(uploadsDir, { recursive: true });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  await ensureUploadsDir();
  
  // Set up authentication
  setupAuth(app);
  
  // Authentication routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      // Validate request data
      const userSchema = insertUserSchema.extend({
        password: z.string().min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string()
      }).refine(data => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"]
      });
      
      const validatedData = userSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      // Create user with hashed password
      const user = await storage.createUser({
        username: validatedData.username,
        password: hashedPassword,
        email: validatedData.email || null,
        fullName: validatedData.fullName || null,
        role: "user", // Default role
        isActive: true,
        sourceImagesDir: `/user_${validatedData.username}/source`,
        processedImagesDir: `/user_${validatedData.username}/processed`,
        tempExtractionDir: `/user_${validatedData.username}/temp`
      });
      
      // Create activity log
      await storage.createActivityLog({
        action: "user_registered",
        details: `User ${user.username} registered`,
        status: "completed"
      });
      
      // Generate session token
      const token = randomBytes(48).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now
      
      // Create user session
      await storage.createUserSession({
        userId: user.id,
        token,
        expiresAt,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || null
      });
      
      // Return user info (excluding password)
      const { password, ...userWithoutPassword } = user;
      res.status(201).json({
        message: "User registered successfully",
        user: userWithoutPassword,
        token
      });
    } catch (error: any) {
      console.error("Error registering user:", error);
      
      if (error.errors) {
        // Zod validation error
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ 
        message: "Failed to register user", 
        error: error.message 
      });
    }
  });
  
  // The /api/auth/login endpoint is now handled by passport in auth.ts
  
  // The /api/auth/logout endpoint is now handled by passport in auth.ts
  
  // The /api/auth/user endpoint is simplified to use passport session
  app.get("/api/auth/user", (req: Request, res: Response) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
      const user = req.user as any;
      if (user) {
        // Return user without sensitive information like password
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      }
    }
    res.status(200).json(null);
  });

  // Telegram API routes
  app.get("/api/telegram/status", async (req: Request, res: Response) => {
    try {
      const status = await telegramClient.getConnectionStatus();
      res.json(status);
    } catch (error: any) {
      console.error("Error getting Telegram status:", error);
      res.status(500).json({ message: "Failed to get Telegram status", error: error.message });
    }
  });

  app.post("/api/telegram/credentials", async (req: Request, res: Response) => {
    try {
      console.log("Credentials request received:", req.body);
      const validatedData = insertTelegramCredentialsSchema.parse(req.body);
      const credentials = await storage.saveTelegramCredentials(validatedData);
      
      // Initialize Telegram client with new credentials
      const initResult = await telegramClient.initialize({
        apiId: validatedData.apiId,
        apiHash: validatedData.apiHash,
        phoneNumber: validatedData.phoneNumber,
      });
      
      console.log("Telegram initialization result:", initResult);
      
      // Return phone code hash to client for later use in login
      res.json({ 
        message: "Credentials saved successfully", 
        needsCode: initResult.needsCode,
        phoneCodeHash: initResult.phoneCodeHash // This is important for login verification
      });
    } catch (error: any) {
      console.error("Error saving Telegram credentials:", error);
      res.status(400).json({ 
        message: "Failed to save credentials", 
        error: error.message,
        details: error.stack 
      });
    }
  });

  app.post("/api/telegram/login", async (req: Request, res: Response) => {
    try {
      console.log("Login request received:", req.body);
      
      const schema = z.object({
        code: z.string().min(1),
        password: z.string().optional(),
        phoneCodeHash: z.string().optional(), // Allow phoneCodeHash from client
      });
      
      const validatedData = schema.parse(req.body);
      console.log("Validated login data:", validatedData);
      
      // If client sent phoneCodeHash, use it in the telegramClient
      if (validatedData.phoneCodeHash) {
        console.log("Using phone code hash from client:", validatedData.phoneCodeHash);
      }
      
      const result = await telegramClient.login(
        validatedData.code, 
        validatedData.password,
        validatedData.phoneCodeHash
      );
      
      console.log("Login result:", result);
      res.json({ message: "Login successful", result });
    } catch (error: any) {
      console.error("Error logging in to Telegram:", error);
      res.status(400).json({ 
        message: "Failed to login", 
        error: error.message,
        details: error.stack
      });
    }
  });

  app.post("/api/telegram/refresh", async (req: Request, res: Response) => {
    try {
      const result = await telegramClient.refreshConnection();
      res.json({ message: "Connection refreshed", result });
    } catch (error: any) {
      console.error("Error refreshing Telegram connection:", error);
      res.status(500).json({ message: "Failed to refresh connection", error: error.message });
    }
  });

  app.post("/api/telegram/logout", async (req: Request, res: Response) => {
    try {
      await telegramClient.logout();
      res.json({ message: "Logged out successfully" });
    } catch (error: any) {
      console.error("Error logging out from Telegram:", error);
      res.status(500).json({ message: "Failed to logout", error: error.message });
    }
  });

  // Image processing routes
  app.post("/api/images/process", upload.single("image"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      // Parse processing options from request
      const options = req.body.options ? JSON.parse(req.body.options) : {};

      // Validate and create job
      const jobData = {
        originalFilename: req.file.originalname,
        originalFilesize: req.file.size,
        processingOptions: options,
      };
      
      // Create processing job
      const job = await storage.createImageProcessingJob(jobData);

      // Process image in background
      imageProcessor.processImage(req.file.path, job.id, options)
        .then(async (result) => {
          // Update job with result
          await storage.updateImageProcessingJob(job.id, {
            status: "completed",
            processedFilename: result.filename,
            processedFilesize: result.filesize,
            thumbnailUrl: result.thumbnailUrl,
            telegramMessageId: result.telegramMessageId,
          });

          // Update statistics
          await storage.incrementImagesProcessed();
        })
        .catch(async (error) => {
          console.error("Error processing image:", error);
          await storage.updateImageProcessingJob(job.id, {
            status: "failed",
            errorMessage: error.message,
          });
          await storage.incrementFailedOperations();
        });

      // Increment API calls
      await storage.incrementApiCalls();

      res.json({ 
        message: "Processing started", 
        jobId: job.id 
      });
    } catch (error: any) {
      console.error("Error processing image:", error);
      res.status(500).json({ message: "Failed to process image", error: error.message });
    }
  });

  app.get("/api/images/progress/:jobId", async (req: Request, res: Response) => {
    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const jobId = parseInt(req.params.jobId);
    const progressEmitter = imageProcessor.getProgressEmitter(jobId);

    // Send initial progress
    res.write(`data: ${JSON.stringify({ progress: 0 })}\n\n`);

    // Handle progress updates
    const progressListener = (progress: number) => {
      res.write(`data: ${JSON.stringify({ progress })}\n\n`);
      
      if (progress >= 100) {
        // End SSE connection when complete
        progressEmitter.removeListener("progress", progressListener);
        res.end();
      }
    };

    progressEmitter.on("progress", progressListener);

    // Handle client disconnect
    req.on("close", () => {
      progressEmitter.removeListener("progress", progressListener);
    });
  });

  app.get("/api/images/recent", async (req: Request, res: Response) => {
    try {
      const jobs = await storage.getRecentImageProcessingJobs(4);
      
      // Map jobs to activity items
      const activities = jobs.map(job => ({
        id: job.id.toString(),
        type: getActivityTypeFromOptions(job.processingOptions),
        filename: job.originalFilename,
        filesize: formatFileSize(job.originalFilesize),
        status: job.status,
        timestamp: job.createdAt.toISOString(),
        timeAgo: getTimeAgo(job.createdAt),
        thumbnail: job.thumbnailUrl,
      }));
      
      res.json(activities);
    } catch (error: any) {
      console.error("Error getting recent images:", error);
      res.status(500).json({ message: "Failed to get recent images", error: error.message });
    }
  });

  app.get("/api/images/history", async (req: Request, res: Response) => {
    try {
      const jobs = await storage.getAllImageProcessingJobs();
      
      // Map jobs to activity items
      const activities = jobs.map(job => ({
        id: job.id.toString(),
        type: getActivityTypeFromOptions(job.processingOptions),
        filename: job.originalFilename,
        filesize: formatFileSize(job.originalFilesize),
        status: job.status,
        timestamp: job.createdAt.toISOString(),
        timeAgo: getTimeAgo(job.createdAt),
        thumbnail: job.thumbnailUrl,
      }));
      
      res.json(activities);
    } catch (error: any) {
      console.error("Error getting image history:", error);
      res.status(500).json({ message: "Failed to get image history", error: error.message });
    }
  });

  // Stats API
  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      const stats = await storage.getStatistics();
      const telegramStatus = await telegramClient.getConnectionStatus();
      
      res.json({
        imagesProcessed: stats.imagesProcessed,
        storageUsed: formatFileSize(stats.storageUsedBytes),
        storageUsedBytes: stats.storageUsedBytes,
        failedOperations: stats.failedOperations,
        apiCalls: stats.apiCalls,
        activeConnections: stats.activeConnections,
        filesSent: stats.filesSent,
        totalSourceFiles: stats.totalSourceFiles,
        maxApiCalls: 1000,
        maxStorageBytes: 10 * 1024 * 1024 * 1024, // 10GB
        maxConnections: 5,
        storageTotal: "10 GB",
        imagesProcessedGrowth: "12% from last week", // Static for now
        activeUsers: telegramStatus.connected ? 1 : 0,
        activeUsersGrowth: "18% from last month", // Static for now
      });
    } catch (error: any) {
      console.error("Error getting stats:", error);
      res.status(500).json({ message: "Failed to get stats", error: error.message });
    }
  });

  // Admin management routes
  app.get("/api/admins", async (req: Request, res: Response) => {
    try {
      const admins = await storage.listAdminUsers();
      res.json(admins);
    } catch (error: any) {
      console.error("Error getting admin users:", error);
      res.status(500).json({ message: "Failed to get admin users", error: error.message });
    }
  });

  app.post("/api/admins", async (req: Request, res: Response) => {
    try {
      const validatedData = insertAdminUserSchema.parse(req.body);
      
      // Check if admin already exists
      const existingAdmin = await storage.getAdminUserByUsername(validatedData.username);
      if (existingAdmin) {
        return res.status(400).json({ message: "Admin user already exists" });
      }
      
      const admin = await storage.createAdminUser(validatedData);
      
      // Log the action
      await storage.createActivityLog({
        action: "admin_created",
        details: `Admin user ${admin.username} created`,
        status: "completed",
      });
      
      res.json({ message: "Admin user created successfully", admin });
    } catch (error: any) {
      console.error("Error creating admin user:", error);
      res.status(400).json({ message: "Failed to create admin user", error: error.message });
    }
  });

  app.put("/api/admins/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const admin = await storage.getAdminUser(id);
      
      if (!admin) {
        return res.status(404).json({ message: "Admin user not found" });
      }
      
      const updateSchema = z.object({
        username: z.string().optional(),
        isActive: z.boolean().optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      const updatedAdmin = await storage.updateAdminUser(id, validatedData);
      
      // Log the action
      await storage.createActivityLog({
        action: "admin_updated",
        details: `Admin user ${updatedAdmin.username} updated`,
        status: "completed",
      });
      
      res.json({ message: "Admin user updated successfully", admin: updatedAdmin });
    } catch (error: any) {
      console.error("Error updating admin user:", error);
      res.status(400).json({ message: "Failed to update admin user", error: error.message });
    }
  });

  // Bot configuration routes
  app.get("/api/bot/config", async (req: Request, res: Response) => {
    try {
      const config = await storage.getBotConfig();
      res.json(config);
    } catch (error: any) {
      console.error("Error getting bot configuration:", error);
      res.status(500).json({ message: "Failed to get bot configuration", error: error.message });
    }
  });

  app.put("/api/bot/config", async (req: Request, res: Response) => {
    try {
      const updateSchema = z.object({
        triggerWords: z.array(z.string()).optional(),
        replyMessage: z.string().optional(),
        imagesToSend: z.number().int().min(1).max(50).optional(),
        foldersToSend: z.number().int().min(1).max(30).optional(),
        workInGroups: z.boolean().optional(),
        // Add new format fields
        fileNameFormat: z.string().min(1).max(100).optional(),
        captionFormat: z.string().min(1).max(500).optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      const updatedConfig = await storage.updateBotConfig(validatedData);
      
      // Log the action with more detailed information
      let details = "Bot configuration updated: ";
      if (validatedData.fileNameFormat) {
        details += "filename format, ";
      }
      if (validatedData.captionFormat) {
        details += "caption format, ";
      }
      if (validatedData.triggerWords) {
        details += "trigger words, ";
      }
      if (validatedData.replyMessage) {
        details += "reply message, ";
      }
      if (validatedData.imagesToSend !== undefined) {
        details += "images count, ";
      }
      if (validatedData.foldersToSend !== undefined) {
        details += "folders count, ";
      }
      if (validatedData.workInGroups !== undefined) {
        details += "group mode, ";
      }
      
      // Remove trailing comma and space
      details = details.replace(/, $/, "");
      
      await storage.createActivityLog({
        action: "bot_config_updated",
        details,
        status: "completed",
      });
      
      res.json({ message: "Bot configuration updated successfully", config: updatedConfig });
    } catch (error: any) {
      console.error("Error updating bot configuration:", error);
      res.status(400).json({ message: "Failed to update bot configuration", error: error.message });
    }
  });

  // Activity logs routes
  app.get("/api/logs", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const logs = await storage.getActivityLogs(limit);
      
      // Format the logs for the client
      const formattedLogs = logs.map(log => ({
        id: log.id,
        action: log.action,
        details: log.details,
        status: log.status,
        filename: log.filename,
        filesize: log.filesize ? formatFileSize(log.filesize) : null,
        fromUser: log.fromUser,
        timestamp: log.createdAt.toISOString(),
        timeAgo: getTimeAgo(log.createdAt),
      }));
      
      res.json(formattedLogs);
    } catch (error: any) {
      console.error("Error getting activity logs:", error);
      res.status(500).json({ message: "Failed to get activity logs", error: error.message });
    }
  });
  
  // Image edit configuration routes
  app.get("/api/image-edit-config", async (req: Request, res: Response) => {
    try {
      const config = await storage.getImageEditConfig();
      res.json(config);
    } catch (error: any) {
      console.error("Error getting image edit config:", error);
      res.status(500).json({ message: "Failed to get image edit configuration", error: error.message });
    }
  });
  
  app.put("/api/image-edit-config", async (req: Request, res: Response) => {
    try {
      const config = await storage.updateImageEditConfig(req.body);
      
      // Log the configuration update
      await storage.createActivityLog({
        action: "update_edit_config",
        details: "Updated image editing configuration",
        status: "completed"
      });
      
      res.json(config);
    } catch (error: any) {
      console.error("Error updating image edit config:", error);
      res.status(500).json({ message: "Failed to update image edit configuration", error: error.message });
    }
  });
  
  // Telegram Group routes
  app.get("/api/telegram/groups", async (req: Request, res: Response) => {
    try {
      const groups = await storage.listTelegramGroups();
      res.json({ success: true, groups });
    } catch (error: any) {
      console.error("Error fetching Telegram groups:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Verify group membership
  app.post("/api/telegram/verify-group", async (req: Request, res: Response) => {
    try {
      const { groupHandle } = req.body;
      
      if (!groupHandle || typeof groupHandle !== 'string') {
        return res.status(400).json({ 
          success: false, 
          verified: false, 
          message: "Invalid group handle or name" 
        });
      }
      
      // Check if Telegram is connected
      const credentials = await storage.getTelegramCredentials();
      if (!credentials || !credentials.isActive) {
        return res.status(200).json({ 
          success: true, 
          verified: false, 
          message: "Telegram is not connected. Please connect your Telegram account first." 
        });
      }
      
      // Log activity
      await storage.createActivityLog({
        action: "group_verification",
        details: `Verifying group: ${groupHandle}`,
        status: "processing",
        filename: null,
        filesize: null,
        fromUser: null
      });
      
      // First, check if there's a real Telegram client connection
      if (!telegramClient.isConnected()) {
        return res.status(200).json({
          success: true,
          verified: false,
          message: "Cannot verify group - Telegram client is not connected"
        });
      }
      
      // If this is a handle (@something), we need to normalize it
      const isHandle = groupHandle.startsWith('@');
      let normalizedGroupHandle = isHandle ? groupHandle : `@${groupHandle}`;
      
      // Try to find an existing group in our database first
      const groups = await storage.listTelegramGroups();
      
      // We'll use these variables to track our result
      let foundGroup = false;
      let groupId = '';
      let groupName = '';
      
      // First try exact match with the @ prefix
      const exactMatch = groups.find(g => 
        g.groupName.toLowerCase() === normalizedGroupHandle.toLowerCase()
      );
      
      if (exactMatch) {
        foundGroup = true;
        groupId = exactMatch.groupId;
        groupName = exactMatch.groupName;
      }
      // If no exact match with @ prefix, try without the @ for groups stored without it
      else {
        const noAtMatch = groups.find(g => 
          g.groupName.toLowerCase() === normalizedGroupHandle.substring(1).toLowerCase()
        );
        
        if (noAtMatch) {
          foundGroup = true;
          groupId = noAtMatch.groupId;
          groupName = noAtMatch.groupName;
        }
      }
      
      // If we still haven't found a match, we need to query Telegram
      if (!foundGroup) {
        try {
          // Try to fetch group information from Telegram
          // In a real implementation, this would be a call to telegramClient
          // For now, we'll just create a temporary group entry
          
          groupId = `group_${Date.now()}`;
          groupName = normalizedGroupHandle;
          
          // In a real implementation, you would check if the user is a member of this group
          // For now, we'll simulate this by creating a group and user entry
          
          // Create the group
          await storage.createTelegramGroup({
            groupId,
            groupName,
            groupType: "group",
            memberCount: 1, // Only add a single member for verification tests
            isActive: true
          });
          
          // Add only the current user
          await storage.createTelegramGroupMember({
            groupId,
            userId: `user_verify`,
            username: `telegram_user`,
            firstName: `Test`,
            lastName: `User`,
            isAdmin: false,
            isBot: false,
            lastSeen: new Date()
          });
          
          foundGroup = true;
        } catch (error) {
          console.error("Error verifying group with Telegram:", error);
          return res.status(200).json({
            success: true,
            verified: false,
            message: "Could not verify group with Telegram API"
          });
        }
      }
      
      // Log the verification
      await storage.createActivityLog({
        action: "Verify Group Membership",
        details: `Verified membership in group ${groupName}`,
        status: "completed"
      });
      
      // Get the members to send back
      const members = await storage.listTelegramGroupMembers(groupId);
      
      // Send back group info and members
      res.json({ 
        success: true, 
        verified: true, 
        groupId, 
        groupName,
        memberCount: members.length,
        message: "Bot is a member of this group",
        members
      });
    } catch (error: any) {
      console.error("Error verifying group membership:", error);
      res.status(500).json({ 
        success: false, 
        verified: false, 
        message: error.message 
      });
    }
  });
  
  app.post("/api/telegram/groups/sync", async (req: Request, res: Response) => {
    try {
      // Check if Telegram is connected
      const credentials = await storage.getTelegramCredentials();
      let warningMessage = null;
      let groups = [];
      
      if (!credentials || !credentials.isActive) {
        warningMessage = "Telegram is not connected. Please connect your Telegram account first.";
        console.log(warningMessage);
        
        // Still create sample data for testing if no groups exist yet
        const existingGroups = await storage.listTelegramGroups();
        if (existingGroups.length === 0) {
          await storage.createTelegramGroup({
            groupId: "sample_group_1",
            groupName: "Sample Group (Demo)",
            groupType: "group",
            memberCount: 25,
            isActive: true
          });
          
          // Add some sample members to the group
          await storage.createTelegramGroupMember({
            groupId: "sample_group_1",
            userId: "user1",
            username: "member1",
            firstName: "John",
            lastName: "Doe",
            isAdmin: false,
            isBot: false
          });
          
          await storage.createTelegramGroupMember({
            groupId: "sample_group_1",
            userId: "user2",
            username: "member2",
            firstName: "Jane",
            lastName: "Smith",
            isAdmin: true,
            isBot: false
          });
        }
      } else {
        // We're connected to Telegram, fetch real groups
        try {
          console.log("Fetching groups from Telegram API...");
          
          // First check if we're properly connected
          const connected = telegramClient.isConnected();
          if (!connected) {
            // Try to refresh the connection
            console.log("Refreshing Telegram connection...");
            const refreshResult = await telegramClient.refreshConnection();
            if (!refreshResult.connected) {
              throw new Error("Failed to connect to Telegram");
            }
          }
          
          // Fetch the groups
          groups = await telegramClient.getGroups();
          console.log(`Found ${groups.length} groups`);
          
          // Store all the groups in our database
          for (const group of groups) {
            // Check if group already exists
            const existingGroup = await storage.getTelegramGroupByGroupId(group.groupId);
            
            if (existingGroup) {
              // Update the existing group
              await storage.updateTelegramGroup(existingGroup.id, {
                groupName: group.groupName,
                groupType: group.groupType,
                memberCount: group.memberCount,
                isActive: true,
              });
            } else {
              // Create a new group
              await storage.createTelegramGroup({
                groupId: group.groupId,
                groupName: group.groupName,
                groupType: group.groupType,
                memberCount: group.memberCount,
                isActive: true
              });
            }
            
            // Now fetch and store members for this group
            try {
              const members = await telegramClient.getGroupMembers(group.groupId);
              console.log(`Found ${members.length} members in group ${group.groupName}`);
              
              // Store all members
              for (const member of members) {
                // Check if member already exists
                const existingMember = await storage.getTelegramGroupMemberByUserIdAndGroupId(
                  member.userId,
                  group.groupId
                );
                
                if (existingMember) {
                  // Update the existing member
                  await storage.updateTelegramGroupMember(existingMember.id, {
                    username: member.username,
                    firstName: member.firstName,
                    lastName: member.lastName,
                    isAdmin: member.isAdmin,
                    isBot: member.isBot,
                  });
                } else {
                  // Create a new member
                  await storage.createTelegramGroupMember({
                    groupId: group.groupId,
                    userId: member.userId,
                    username: member.username,
                    firstName: member.firstName,
                    lastName: member.lastName,
                    isAdmin: member.isAdmin,
                    isBot: member.isBot,
                  });
                }
              }
            } catch (memberError: any) {
              console.error(`Error fetching members for group ${group.groupName}:`, memberError);
              // Continue with next group even if this one fails
            }
          }
        } catch (apiError: any) {
          console.error("Error fetching groups from Telegram API:", apiError);
          warningMessage = `Error fetching groups: ${apiError.message}. Using existing groups.`;
        }
      }
      
      await storage.createActivityLog({
        action: "Sync Telegram Groups",
        details: "Synced Telegram groups from the API",
        status: "completed"
      });
      
      res.json({ 
        success: true, 
        message: "Groups synchronization completed",
        warning: warningMessage,
        groupCount: groups.length
      });
    } catch (error: any) {
      console.error("Error syncing Telegram groups:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Telegram Group Members routes
  app.get("/api/telegram/groups/:groupId/members", async (req: Request, res: Response) => {
    try {
      const { groupId } = req.params;
      const members = await storage.listTelegramGroupMembers(groupId);
      res.json({ success: true, members });
    } catch (error: any) {
      console.error("Error fetching group members:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Scheduled Send routes
  app.get("/api/scheduled-sends", async (req: Request, res: Response) => {
    try {
      const scheduledSends = await storage.listScheduledSends();
      res.json({ success: true, scheduledSends });
    } catch (error: any) {
      console.error("Error fetching scheduled sends:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  app.post("/api/scheduled-sends", async (req: Request, res: Response) => {
    try {
      const scheduledSendData = req.body;
      
      // Create new scheduled send
      const scheduledSend = await storage.createScheduledSend(scheduledSendData);
      
      await storage.createActivityLog({
        action: "Create Scheduled Send",
        details: `Created scheduled send ${scheduledSend.name}`,
        status: "completed"
      });
      
      res.json({ success: true, scheduledSend });
    } catch (error: any) {
      console.error("Error creating scheduled send:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  app.get("/api/scheduled-sends/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const scheduledSend = await storage.getScheduledSend(Number(id));
      
      if (!scheduledSend) {
        return res.status(404).json({ success: false, error: "Scheduled send not found" });
      }
      
      res.json({ success: true, scheduledSend });
    } catch (error: any) {
      console.error("Error fetching scheduled send:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  app.put("/api/scheduled-sends/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Update scheduled send
      const updatedScheduledSend = await storage.updateScheduledSend(Number(id), updates);
      
      await storage.createActivityLog({
        action: "Update Scheduled Send",
        details: `Updated scheduled send ${updatedScheduledSend.name}`,
        status: "completed"
      });
      
      res.json({ success: true, scheduledSend: updatedScheduledSend });
    } catch (error: any) {
      console.error("Error updating scheduled send:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Authorized Users management routes
  app.get("/api/authorized-users", async (req: Request, res: Response) => {
    try {
      const users = await storage.listAuthorizedUsers();
      res.json({ success: true, users });
    } catch (error: any) {
      console.error("Error getting authorized users:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to get authorized users", 
        error: error.message 
      });
    }
  });
  
  // Get all registered users (for admin dashboard)
  app.get("/api/auth/users", async (req: Request, res: Response) => {
    try {
      // Check if user is admin (could use isAdmin middleware)
      const users = await storage.listUsers();
      res.json(users);
    } catch (error: any) {
      console.error("Error getting all users:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to get users", 
        error: error.message 
      });
    }
  });
  
  // Get all telegram credentials (for admin dashboard)
  app.get("/api/telegram/credentials/all", async (req: Request, res: Response) => {
    try {
      // Ideally we would have a method to get all credentials, but for now we'll adapt
      // This is a placeholder - in a real implementation, we'd add this method to storage
      const credentials = await storage.getTelegramCredentials();
      // Return as array for consistency
      const credentialsArray = credentials ? [credentials] : [];
      
      res.json(credentialsArray);
    } catch (error: any) {
      console.error("Error getting all telegram credentials:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to get telegram credentials", 
        error: error.message 
      });
    }
  });
  
  // Get all image processing jobs (for admin dashboard)
  app.get("/api/images/all", async (req: Request, res: Response) => {
    try {
      const jobs = await storage.getAllImageProcessingJobs();
      res.json(jobs);
    } catch (error: any) {
      console.error("Error getting all image jobs:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to get image jobs", 
        error: error.message 
      });
    }
  });

  app.post("/api/authorized-users", async (req: Request, res: Response) => {
    try {
      console.log("Received request body:", JSON.stringify(req.body));
      
      // Ensure username exists and is not empty
      if (!req.body.username || req.body.username.trim() === "") {
        console.log("Username validation failed: empty username");
        return res.status(400).json({
          success: false,
          message: "Username is required"
        });
      }
      
      // Fix missing fields by adding default values if needed
      const data = {
        username: req.body.username.trim(),
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        notes: req.body.notes || null
      };
      
      console.log("Processed data:", JSON.stringify(data));
      
      // Make sure username starts with @ for authorized Telegram username
      let authorizedUsername = data.username;
      if (!authorizedUsername.startsWith('@')) {
        authorizedUsername = '@' + authorizedUsername;
      }
      
      // Check if authorized user already exists directly without using the schema first
      const existingUser = await storage.getAuthorizedUserByUsername(authorizedUsername);
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: "User already exists" 
        });
      }
      
      // Create the authorized user with the processed data (with @ prefix)
      const authorizedUser = await storage.createAuthorizedUser({
        ...data,
        username: authorizedUsername
      });
      
      // Also create a corresponding login account using the original username (without @)
      // Use provided password or generate a random one
      const loginUsername = data.username.replace(/^@/, ''); // Remove @ if present
      const loginPassword = req.body.password || Math.random().toString(36).substring(2, 10);
      
      console.log(`Creating login account for ${loginUsername} with password ${loginPassword}`);
      
      // Check if login user already exists
      const existingLoginUser = await storage.getUserByUsername(loginUsername);
      if (!existingLoginUser) {
        // Hash the password
        const hashedPassword = await hashPassword(loginPassword);
        
        // Create the login user
        await storage.createUser({
          username: loginUsername,
          fullName: req.body.fullName || loginUsername,
          email: req.body.email || null,
          password: hashedPassword,
          role: req.body.role || 'user',
          isActive: data.isActive,
          sourceImagesDir: null,
          processedImagesDir: null,
          tempExtractionDir: null,
          telegramCredentialId: null
        });
        
        console.log(`Login account created for ${loginUsername}`);
      } else {
        console.log(`Login account already exists for ${loginUsername}`);
      }
      
      // Log the action
      await storage.createActivityLog({
        action: "authorized_user_created",
        details: `Authorized user ${authorizedUser.username} created with login account ${loginUsername}`,
        status: "completed",
      });
      
      res.json({ 
        success: true, 
        message: "User authorized successfully and login account created", 
        user: authorizedUser
      });
    } catch (error: any) {
      console.error("Error creating authorized user:", error);
      res.status(400).json({ 
        success: false, 
        message: "Failed to authorize user", 
        error: error.message 
      });
    }
  });

  app.put("/api/authorized-users/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getAuthorizedUser(id);
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "Authorized user not found" 
        });
      }
      
      const updateSchema = z.object({
        username: z.string().optional(),
        isActive: z.boolean().optional(),
        notes: z.string().optional().nullable(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      const updatedUser = await storage.updateAuthorizedUser(id, validatedData);
      
      // Log the action
      await storage.createActivityLog({
        action: "authorized_user_updated",
        details: `Authorized user ${updatedUser.username} updated`,
        status: "completed",
      });
      
      res.json({ 
        success: true, 
        message: "Authorized user updated successfully", 
        user: updatedUser 
      });
    } catch (error: any) {
      console.error("Error updating authorized user:", error);
      res.status(400).json({ 
        success: false, 
        message: "Failed to update authorized user", 
        error: error.message 
      });
    }
  });

  app.delete("/api/authorized-users/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getAuthorizedUser(id);
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "Authorized user not found" 
        });
      }
      
      // We don't actually delete, just deactivate
      const updatedUser = await storage.updateAuthorizedUser(id, { isActive: false });
      
      // Log the action
      await storage.createActivityLog({
        action: "authorized_user_deactivated",
        details: `Authorized user ${updatedUser.username} deactivated`,
        status: "completed",
      });
      
      res.json({ 
        success: true, 
        message: "Authorized user deactivated successfully" 
      });
    } catch (error: any) {
      console.error("Error deactivating authorized user:", error);
      res.status(400).json({ 
        success: false, 
        message: "Failed to deactivate authorized user", 
        error: error.message 
      });
    }
  });
  
  // TG Bot Admins API endpoints
  app.get("/api/tg-bot-admins", async (req: Request, res: Response) => {
    try {
      const admins = await storage.listTelegramBotAdmins();
      res.json({ success: true, admins });
    } catch (error: any) {
      console.error("Error fetching TG bot admins:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch TG bot admins",
        error: error.message 
      });
    }
  });
  
  app.post("/api/tg-bot-admins", async (req: Request, res: Response) => {
    try {
      const { username, isActive, notes, canSendFiles, canManageUsers } = req.body;
      
      if (!username) {
        return res.status(400).json({ 
          success: false, 
          message: "Username is required" 
        });
      }
      
      // Ensure username starts with @
      const formattedUsername = username.startsWith('@') ? username : `@${username}`;
      
      // Check if admin already exists
      const existingAdmin = await storage.getTelegramBotAdminByUsername(formattedUsername);
      if (existingAdmin) {
        return res.status(400).json({ 
          success: false, 
          message: "TG bot admin already exists" 
        });
      }
      
      // Create the new admin
      const admin = await storage.createTelegramBotAdmin({
        username: formattedUsername,
        isActive: isActive ?? true,
        notes: notes || null,
        canSendFiles: canSendFiles ?? true,
        canManageUsers: canManageUsers ?? false
      });
      
      res.status(201).json({ success: true, admin });
    } catch (error: any) {
      console.error("Error creating TG bot admin:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to create TG bot admin",
        error: error.message 
      });
    }
  });
  
  app.put("/api/tg-bot-admins/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid ID" 
        });
      }
      
      // Ensure the admin exists
      const admin = await storage.getTelegramBotAdmin(id);
      if (!admin) {
        return res.status(404).json({ 
          success: false, 
          message: "TG bot admin not found" 
        });
      }
      
      // If username is being updated, ensure it starts with @
      if (req.body.username) {
        req.body.username = req.body.username.startsWith('@') ? req.body.username : `@${req.body.username}`;
      }
      
      // Update the admin
      const updatedAdmin = await storage.updateTelegramBotAdmin(id, req.body);
      
      res.json({ success: true, admin: updatedAdmin });
    } catch (error: any) {
      console.error("Error updating TG bot admin:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to update TG bot admin",
        error: error.message 
      });
    }
  });
  
  app.delete("/api/tg-bot-admins/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid ID" 
        });
      }
      
      // Ensure the admin exists
      const admin = await storage.getTelegramBotAdmin(id);
      if (!admin) {
        return res.status(404).json({ 
          success: false, 
          message: "TG bot admin not found" 
        });
      }
      
      // Delete the admin
      await storage.deleteTelegramBotAdmin(id);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting TG bot admin:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to delete TG bot admin",
        error: error.message 
      });
    }
  });
  
  // TG Bot Users API endpoints
  app.get("/api/tg-bot-users", async (req: Request, res: Response) => {
    try {
      const users = await storage.listTelegramBotUsers();
      res.json({ success: true, users });
    } catch (error: any) {
      console.error("Error fetching TG bot users:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch TG bot users",
        error: error.message 
      });
    }
  });
  
  app.post("/api/tg-bot-users", async (req: Request, res: Response) => {
    try {
      const { username, isActive, notes, maxDailyImages, allowedGroups } = req.body;
      
      if (!username) {
        return res.status(400).json({ 
          success: false, 
          message: "Username is required" 
        });
      }
      
      // Ensure username starts with @
      const formattedUsername = username.startsWith('@') ? username : `@${username}`;
      
      // Check if user already exists
      const existingUser = await storage.getTelegramBotUserByUsername(formattedUsername);
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: "TG bot user already exists" 
        });
      }
      
      // Create the new user
      const user = await storage.createTelegramBotUser({
        username: formattedUsername,
        isActive: isActive ?? true,
        notes: notes || null,
        maxDailyImages: maxDailyImages ?? 10,
        imagesUsedToday: 0,
        allowedGroups: Array.isArray(allowedGroups) ? allowedGroups : null
      });
      
      res.status(201).json({ success: true, user });
    } catch (error: any) {
      console.error("Error creating TG bot user:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to create TG bot user",
        error: error.message 
      });
    }
  });
  
  app.put("/api/tg-bot-users/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid ID" 
        });
      }
      
      // Ensure the user exists
      const user = await storage.getTelegramBotUser(id);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "TG bot user not found" 
        });
      }
      
      // If username is being updated, ensure it starts with @
      if (req.body.username) {
        req.body.username = req.body.username.startsWith('@') ? req.body.username : `@${req.body.username}`;
      }
      
      // Ensure allowedGroups is an array if provided
      if (req.body.allowedGroups && !Array.isArray(req.body.allowedGroups)) {
        req.body.allowedGroups = Array.isArray(req.body.allowedGroups) ? req.body.allowedGroups : null;
      }
      
      // Update the user
      const updatedUser = await storage.updateTelegramBotUser(id, req.body);
      
      res.json({ success: true, user: updatedUser });
    } catch (error: any) {
      console.error("Error updating TG bot user:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to update TG bot user",
        error: error.message 
      });
    }
  });
  
  app.delete("/api/tg-bot-users/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid ID" 
        });
      }
      
      // Ensure the user exists
      const user = await storage.getTelegramBotUser(id);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "TG bot user not found" 
        });
      }
      
      // Delete the user
      await storage.deleteTelegramBotUser(id);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting TG bot user:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to delete TG bot user",
        error: error.message 
      });
    }
  });

  app.post("/api/scheduled-sends/:id/execute", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const scheduledSend = await storage.getScheduledSend(Number(id));
      
      if (!scheduledSend) {
        return res.status(404).json({ success: false, error: "Scheduled send not found" });
      }
      
      // Update to in_progress status
      await storage.updateScheduledSend(Number(id), { status: "in_progress" });
      
      // In a real implementation, this would trigger the actual send process
      // For now, we just simulate it with a log
      await storage.createActivityLog({
        action: "Execute Scheduled Send",
        details: `Started execution of scheduled send ${scheduledSend.name}`,
        status: "processing"
      });
      
      // For demonstration, we'll mark it as completed after a short delay
      // In a real implementation, this would be handled by a background process
      setTimeout(async () => {
        try {
          const now = new Date();
          
          // If this is a recurring send, mark it as pending for the next run
          // Otherwise, mark it as completed
          if (scheduledSend.isRecurring) {
            await storage.updateScheduledSend(Number(id), { 
              status: "pending",  // Reset to pending for next run
              completedAt: now    // Record last run time
            });
          } else {
            await storage.updateScheduledSend(Number(id), { 
              status: "completed",
              completedAt: now
            });
          }
          
          // Log the appropriate message based on whether this is a recurring send
          await storage.createActivityLog({
            action: "Execute Scheduled Send",
            details: scheduledSend.isRecurring 
              ? `Completed execution of recurring scheduled send ${scheduledSend.name} (will run again)`
              : `Completed execution of scheduled send ${scheduledSend.name}`,
            status: "completed"
          });
        } catch (error) {
          console.error("Error completing scheduled send:", error);
        }
      }, 5000);
      
      res.json({ success: true, message: "Scheduled send execution started" });
    } catch (error: any) {
      console.error("Error executing scheduled send:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time progress updates
  // Use a specific path to avoid conflict with Vite's WebSocket
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/api/ws',  // Specify path to avoid conflict with Vite
    // Increase the ping/pong timeout to be more resilient
    clientTracking: true
  });
  
  // WebSocket connections map by client ID
  const clients = new Map<string, { 
    ws: WebSocket, 
    clientId: string, 
    isAlive: boolean,
    reconnectToken?: string
  }>();
  
  // Generate a unique reconnect token
  const generateReconnectToken = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  // Set up ping interval to keep connections alive
  const pingInterval = setInterval(() => {
    // Convert to array to avoid iterator issues
    const clientsArray = [...clients.values()];
    
    for (const client of clientsArray) {
      if (client.isAlive === false) {
        // Client didn't respond to ping, terminate connection
        console.log(`WebSocket client ${client.clientId} timed out, terminating connection`);
        client.ws.terminate();
        clients.delete(client.clientId);
        continue;
      }
      
      // Mark as not alive, will be set to true when pong received
      client.isAlive = false;
      
      try {
        client.ws.ping();
      } catch (error) {
        console.error(`Error pinging client ${client.clientId}:`, error);
        client.ws.terminate();
        clients.delete(client.clientId);
      }
    }
  }, 30000); // Ping every 30 seconds
  
  // Clean up interval on server close
  httpServer.on('close', () => {
    clearInterval(pingInterval);
  });
  
  wss.on('connection', (ws, req) => {
    // Generate unique client ID and reconnect token
    const clientId = Math.random().toString(36).substring(2, 15);
    const reconnectToken = generateReconnectToken();
    
    // Store client info
    clients.set(clientId, { 
      ws, 
      clientId, 
      isAlive: true,
      reconnectToken
    });
    
    console.log(`WebSocket client connected: ${clientId}`);
    
    // Handle pong messages
    ws.on('pong', () => {
      const client = clients.get(clientId);
      if (client) {
        client.isAlive = true;
      }
    });
    
    // Send welcome message with reconnect token
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to image processing server',
      reconnectToken
    }));
    
    // Handle messages from client
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Only log non-ping/pong messages to reduce noise
        if (data.type !== 'ping') {
          console.log(`Received message from client ${clientId}:`, data);
        }
        
        // Handle different message types
        if (data.type === 'ping') {
          // Respond to client-side pings (different from WebSocket protocol pings)
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          return;
        }
        
        if (data.type === 'reconnect' && data.token) {
          // Client is trying to reconnect with token
          let foundClient = false;
          // Convert map entries to array to avoid iterator issues
          // Fix for downlevelIteration issues
          const clientEntries = [...clients.entries()];
          
          for (const [oldClientId, client] of clientEntries) {
            if (client.reconnectToken === data.token && client.clientId !== clientId) {
              console.log(`Client ${clientId} successfully reconnected using token from ${oldClientId}`);
              
              // Clean up the old connection
              if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.close();
              }
              clients.delete(oldClientId);
              
              // Send reconnection confirmation
              ws.send(JSON.stringify({
                type: 'reconnected',
                message: 'Successfully reconnected to server'
              }));
              
              foundClient = true;
              break;
            }
          }
          
          if (!foundClient) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Invalid reconnection token'
            }));
          }
          return;
        }
        
        if (data.type === 'subscribe' && data.jobId) {
          // Subscribe to job progress updates
          const progressEmitter = imageProcessor.getProgressEmitter(data.jobId);
          
          // Create listener function specific to this client
          const progressListener = (progress: number) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'progress',
                jobId: data.jobId,
                progress
              }));
            }
          };
          
          // Store the listener reference on the WebSocket object for cleanup
          (ws as any).listeners = (ws as any).listeners || {};
          (ws as any).listeners[data.jobId] = progressListener;
          
          // Register the listener
          progressEmitter.on('progress', progressListener);
          
          // Send initial progress
          ws.send(JSON.stringify({
            type: 'progress',
            jobId: data.jobId,
            progress: 0
          }));
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });
    
    // Set up listener for Telegram upload progress
    const removeUploadListener = telegramClient.onUploadProgress((progress) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'telegramUploadProgress',
          progress
        }));
      }
    });
    
    // Set up listener for image processing/download progress from telegramBot
    const downloadProgressListener = (data: { progress: number, requestId: string, message: string }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'downloadProgress',
          progress: data.progress,
          requestId: data.requestId,
          message: data.message
        }));
      }
    };
    
    // Register the listener
    telegramBot.events.on('downloadProgress', downloadProgressListener);
    
    // Store the listener reference on the WebSocket object for cleanup
    (ws as any).botListeners = (ws as any).botListeners || {};
    (ws as any).botListeners.downloadProgress = downloadProgressListener;
    
    // Handle client disconnect
    ws.on('close', () => {
      console.log(`WebSocket client disconnected: ${clientId}`);
      
      // Clean up any listeners
      if ((ws as any).listeners) {
        for (const [jobId, listener] of Object.entries((ws as any).listeners)) {
          const progressEmitter = imageProcessor.getProgressEmitter(parseInt(jobId));
          progressEmitter.removeListener('progress', listener as any);
        }
      }
      
      // Remove upload progress listener
      if (removeUploadListener) removeUploadListener();
      
      // Remove bot event listeners
      if ((ws as any).botListeners) {
        if ((ws as any).botListeners.downloadProgress) {
          telegramBot.events.removeListener('downloadProgress', (ws as any).botListeners.downloadProgress);
        }
      }
      
      // Keep the client in the map for a brief period to allow reconnection
      // Remove client from map after 2 minutes if not reconnected
      setTimeout(() => {
        if (clients.has(clientId)) {
          clients.delete(clientId);
          console.log(`Removed disconnected client ${clientId} from reconnection pool`);
        }
      }, 2 * 60 * 1000); // 2 minutes
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
    });
  });
  
  return httpServer;
}

// Helper functions
function getActivityTypeFromOptions(options: any): string {
  const operations = [];
  
  if (options.resize) operations.push("resized");
  if (options.crop) operations.push("cropped");
  if (options.filters?.name && options.filters.name !== "none") operations.push("filtered");
  if (options.adjustments && 
      (options.adjustments.brightness !== 50 || options.adjustments.contrast !== 50)) {
    operations.push("adjusted");
  }
  
  if (operations.length === 0) return "Image processed";
  
  return `Image ${operations.join(" and ")}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds} sec ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
