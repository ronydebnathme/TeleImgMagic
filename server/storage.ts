import bcrypt from "bcrypt";
import { 
  User, 
  InsertUser, 
  TelegramCredentials, 
  InsertTelegramCredentials, 
  ImageProcessingJob, 
  InsertImageProcessingJob,
  Statistics,
  AdminUser,
  InsertAdminUser,
  BotConfig,
  InsertBotConfig,
  ActivityLog,
  InsertActivityLog,
  ImageEditConfig,
  InsertImageEditConfig,
  TelegramGroup,
  InsertTelegramGroup,
  TelegramGroupMember,
  InsertTelegramGroupMember,
  ScheduledSend,
  InsertScheduledSend,
  NullableDate,
  AuthorizedUser,
  InsertAuthorizedUser,
  UserSession,
  InsertUserSession,
  TelegramBotAdmin,
  InsertTelegramBotAdmin,
  TelegramBotUser,
  InsertTelegramBotUser
} from "@shared/schema";

import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  sessionStore: session.Store;
  // Authorized Telegram User methods
  getAuthorizedUser(id: number): Promise<AuthorizedUser | undefined>;
  getAuthorizedUserByUsername(username: string): Promise<AuthorizedUser | undefined>;
  createAuthorizedUser(user: InsertAuthorizedUser): Promise<AuthorizedUser>;
  updateAuthorizedUser(id: number, updates: Partial<AuthorizedUser>): Promise<AuthorizedUser>;
  listAuthorizedUsers(): Promise<AuthorizedUser[]>;
  checkIsAuthorized(username: string): Promise<boolean>;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  validateUserCredentials(username: string, password: string): Promise<User | null>;
  listUsers(): Promise<User[]>;
  
  // User session methods
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  getUserSessionByToken(token: string): Promise<UserSession | undefined>;
  updateUserSession(id: number, updates: Partial<UserSession>): Promise<UserSession>;
  deleteUserSession(token: string): Promise<boolean>;
  cleanExpiredSessions(): Promise<number>;
  
  // Telegram methods
  getTelegramCredentials(): Promise<TelegramCredentials | undefined>;
  getTelegramCredentialsByUserId(userId: number): Promise<TelegramCredentials | undefined>;
  saveTelegramCredentials(credentials: Partial<InsertTelegramCredentials>): Promise<TelegramCredentials>;
  updateTelegramSession(id: number, sessionString: string): Promise<TelegramCredentials>;
  
  // Image processing methods
  createImageProcessingJob(job: InsertImageProcessingJob): Promise<ImageProcessingJob>;
  getImageProcessingJob(id: number): Promise<ImageProcessingJob | undefined>;
  updateImageProcessingJob(id: number, updates: Partial<ImageProcessingJob>): Promise<ImageProcessingJob>;
  getAllImageProcessingJobs(): Promise<ImageProcessingJob[]>;
  getRecentImageProcessingJobs(limit: number): Promise<ImageProcessingJob[]>;
  
  // Statistics methods
  getStatistics(): Promise<Statistics>;
  updateStatistics(updates: Partial<Statistics>): Promise<Statistics>;
  incrementImagesProcessed(count?: number): Promise<void>;
  incrementFailedOperations(): Promise<void>;
  incrementApiCalls(): Promise<void>;
  updateStorageUsed(bytes: number): Promise<void>;
  updateTotalSourceFiles(count: number): Promise<void>;
  updateActiveConnections(count: number): Promise<void>;
  incrementFilesSent(): Promise<void>;
  
  // Admin user methods
  getAdminUser(id: number): Promise<AdminUser | undefined>;
  getAdminUserByUsername(username: string): Promise<AdminUser | undefined>;
  createAdminUser(user: InsertAdminUser): Promise<AdminUser>;
  updateAdminUser(id: number, updates: Partial<AdminUser>): Promise<AdminUser>;
  listAdminUsers(): Promise<AdminUser[]>;
  checkIsAdmin(username: string): Promise<boolean>;
  
  // Bot config methods
  getBotConfig(): Promise<BotConfig>;
  updateBotConfig(config: Partial<InsertBotConfig>): Promise<BotConfig>;
  
  // Activity log methods
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  
  // Image edit config methods
  getImageEditConfig(): Promise<ImageEditConfig>;
  updateImageEditConfig(config: Partial<InsertImageEditConfig>): Promise<ImageEditConfig>;
  
  // Telegram Group methods
  getTelegramGroup(id: number): Promise<TelegramGroup | undefined>;
  getTelegramGroupByGroupId(groupId: string): Promise<TelegramGroup | undefined>;
  createTelegramGroup(group: InsertTelegramGroup): Promise<TelegramGroup>;
  updateTelegramGroup(id: number, updates: Partial<TelegramGroup>): Promise<TelegramGroup>;
  listTelegramGroups(): Promise<TelegramGroup[]>;
  
  // Telegram Group Member methods
  getTelegramGroupMember(id: number): Promise<TelegramGroupMember | undefined>;
  getTelegramGroupMemberByUserIdAndGroupId(userId: string, groupId: string): Promise<TelegramGroupMember | undefined>;
  createTelegramGroupMember(member: InsertTelegramGroupMember): Promise<TelegramGroupMember>;
  updateTelegramGroupMember(id: number, updates: Partial<TelegramGroupMember>): Promise<TelegramGroupMember>;
  listTelegramGroupMembers(groupId: string): Promise<TelegramGroupMember[]>;
  
  // Scheduled Send methods
  getScheduledSend(id: number): Promise<ScheduledSend | undefined>;
  createScheduledSend(send: InsertScheduledSend): Promise<ScheduledSend>;
  updateScheduledSend(id: number, updates: Partial<ScheduledSend>): Promise<ScheduledSend>;
  listScheduledSends(): Promise<ScheduledSend[]>;
  getPendingScheduledSends(): Promise<ScheduledSend[]>;
  
  // Telegram Bot Admin methods
  getTelegramBotAdmin(id: number): Promise<TelegramBotAdmin | undefined>;
  getTelegramBotAdminByUsername(username: string): Promise<TelegramBotAdmin | undefined>;
  createTelegramBotAdmin(admin: InsertTelegramBotAdmin): Promise<TelegramBotAdmin>;
  updateTelegramBotAdmin(id: number, updates: Partial<TelegramBotAdmin>): Promise<TelegramBotAdmin>;
  deleteTelegramBotAdmin(id: number): Promise<boolean>;
  listTelegramBotAdmins(): Promise<TelegramBotAdmin[]>;
  
  // Telegram Bot User methods
  getTelegramBotUser(id: number): Promise<TelegramBotUser | undefined>;
  getTelegramBotUserByUsername(username: string): Promise<TelegramBotUser | undefined>;
  createTelegramBotUser(user: InsertTelegramBotUser): Promise<TelegramBotUser>;
  updateTelegramBotUser(id: number, updates: Partial<TelegramBotUser>): Promise<TelegramBotUser>;
  deleteTelegramBotUser(id: number): Promise<boolean>;
  listTelegramBotUsers(): Promise<TelegramBotUser[]>;
}

export class MemStorage implements IStorage {
  sessionStore: session.Store;
  private users: Map<number, User>;
  private telegramCreds: Map<number, TelegramCredentials>;
  private imageJobs: Map<number, ImageProcessingJob>;
  private stats: Statistics;
  private adminUsers: Map<number, AdminUser>;
  private activityLogs: ActivityLog[];
  private botConfig: BotConfig;
  private imageEditConfig: ImageEditConfig;
  private telegramGroups: Map<number, TelegramGroup>;
  private telegramGroupMembers: Map<number, TelegramGroupMember>;
  private scheduledSends: Map<number, ScheduledSend>;
  private authorizedUsers: Map<number, AuthorizedUser>;
  private userSessions: Map<number, UserSession>;
  private telegramBotAdmins: Map<number, TelegramBotAdmin>;
  private telegramBotUsers: Map<number, TelegramBotUser>;
  private userIdCounter: number;
  private telegramCredIdCounter: number;
  private jobIdCounter: number;
  private adminIdCounter: number;
  private logIdCounter: number;
  private groupIdCounter: number;
  private groupMemberIdCounter: number;
  private scheduledSendIdCounter: number;
  private authorizedUserIdCounter: number;
  private sessionIdCounter: number;
  private telegramBotAdminIdCounter: number;
  private telegramBotUserIdCounter: number;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    this.users = new Map();
    this.telegramCreds = new Map();
    this.imageJobs = new Map();
    this.adminUsers = new Map();
    this.activityLogs = [];
    this.telegramGroups = new Map();
    this.telegramGroupMembers = new Map();
    this.scheduledSends = new Map();
    this.authorizedUsers = new Map();
    this.userSessions = new Map();
    this.telegramBotAdmins = new Map();
    this.telegramBotUsers = new Map();
    
    // Initialize counters
    this.userIdCounter = 1;
    this.telegramCredIdCounter = 1;
    this.jobIdCounter = 1;
    this.adminIdCounter = 1;
    this.logIdCounter = 1;
    this.groupIdCounter = 1;
    this.groupMemberIdCounter = 1;
    this.scheduledSendIdCounter = 1;
    this.authorizedUserIdCounter = 1;
    this.sessionIdCounter = 1;
    this.telegramBotAdminIdCounter = 1;
    this.telegramBotUserIdCounter = 1;
    
    // Initialize statistics
    this.stats = {
      id: 1,
      imagesProcessed: 0,
      storageUsedBytes: 0,
      failedOperations: 0,
      apiCalls: 0,
      activeConnections: 0,
      filesSent: 0,
      totalSourceFiles: 0,
      updatedAt: new Date()
    };
    
    // Initialize bot config
    this.botConfig = {
      id: 1,
      triggerWords: ["send images", "send pictures", "need photos"],
      replyMessage: "Processing your request...",
      imagesToSend: 15,
      foldersToSend: 3,
      workInGroups: true,
      // Custom filename and caption formatting
      fileNameFormat: "Photos-{date}-{username}",
      captionFormat: "Images processed for {username} on {date}",
      updatedAt: new Date()
    };
    
    // Initialize image edit configuration
    const now = new Date();
    
    // Initialize the default authorized admin user
    this.authorizedUsers.set(1, {
      id: 1,
      username: "itachiavm",
      isActive: true,
      isAdmin: true,
      notes: "Default admin user",
      createdAt: now,
      updatedAt: now
    });
    this.authorizedUserIdCounter = 2; // Start from 2 since we already used 1
    
    this.imageEditConfig = {
      id: 1,
      brightnessMin: -30,
      brightnessMax: 30,
      contrastMin: -30,
      contrastMax: 30,
      saturationMin: -30,
      saturationMax: 30,
      blurMin: 0,
      blurMax: 5,
      noiseMin: 0,
      noiseMax: 10,
      
      // Image size configuration
      targetWidthMin: 1200,
      targetWidthMax: 2400,
      targetHeightMin: 800,
      targetHeightMax: 1600,
      enableFixedAspectRatio: false,
      fixedAspectRatio: "4:3",
      
      // Advanced filters
      enableVignette: false,
      vignetteIntensityMin: 10,
      vignetteIntensityMax: 30,
      
      enableSharpen: false,
      sharpenIntensityMin: 1,
      sharpenIntensityMax: 3,
      
      enableColorBalance: false,
      colorBalanceRMin: -10,
      colorBalanceRMax: 10,
      colorBalanceGMin: -10,
      colorBalanceGMax: 10,
      colorBalanceBMin: -10,
      colorBalanceBMax: 10,
      
      enableGrain: false,
      grainIntensityMin: 5,
      grainIntensityMax: 15,
      
      enableFilters: false,
      allowedFilters: ['vintage', 'warmth', 'clarity', 'coolness', 'vibrance'],
      
      // Image transformations
      enableRotation: true,
      rotationMin: -15,
      rotationMax: 15,
      enableCrop: false,
      cropAspectRatio: "original",
      
      // Metadata options
      enableRandomMetadata: true,
      useConsistentMetadataPerFolder: true,
      // Basic metadata fields
      randomizeDevice: true,
      randomizeCamera: true,
      randomizeDateTime: true,
      randomizeFocalLength: true,
      randomizeGPS: false,
      randomizeExposure: true,
      // Advanced metadata fields
      randomizeAperture: true,
      randomizeIso: true,
      randomizeMeteringMode: true,
      randomizeSubjectDistance: true,
      updatedAt: now,
      createdAt: now
    };
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    
    const user: User = { 
      ...insertUser, 
      id,
      isActive: insertUser.isActive !== undefined ? insertUser.isActive : true,
      email: insertUser.email || null,
      fullName: insertUser.fullName || null,
      role: insertUser.role || 'user',
      lastLogin: null,
      sourceImagesDir: insertUser.sourceImagesDir || null,
      processedImagesDir: insertUser.processedImagesDir || null,
      tempExtractionDir: insertUser.tempExtractionDir || null,
      telegramCredentialId: insertUser.telegramCredentialId || null,
      createdAt: now,
      updatedAt: now
    };
    
    this.users.set(id, user);
    return user;
  }

  // Telegram methods
  async getTelegramCredentials(): Promise<TelegramCredentials | undefined> {
    return this.telegramCreds;
  }

  async saveTelegramCredentials(credentials: Partial<InsertTelegramCredentials>): Promise<TelegramCredentials> {
    const now = new Date();
    this.telegramCreds = {
      id: 1,
      apiId: credentials.apiId || '',
      apiHash: credentials.apiHash || '',
      phoneNumber: credentials.phoneNumber || '',
      sessionString: credentials.sessionString || null,
      isActive: credentials.isActive || false,
      createdAt: now,
      updatedAt: now,
    };
    return this.telegramCreds;
  }

  async updateTelegramSession(sessionString: string): Promise<TelegramCredentials> {
    if (!this.telegramCreds) {
      throw new Error("No Telegram credentials found");
    }
    
    this.telegramCreds = {
      ...this.telegramCreds,
      sessionString,
      isActive: true,
      updatedAt: new Date(),
    };
    
    return this.telegramCreds;
  }

  // Image processing methods
  async createImageProcessingJob(job: InsertImageProcessingJob): Promise<ImageProcessingJob> {
    const id = this.jobIdCounter++;
    const now = new Date();
    
    const newJob: ImageProcessingJob = {
      id,
      originalFilename: job.originalFilename,
      originalFilesize: job.originalFilesize,
      processingOptions: job.processingOptions,
      status: "pending",
      processedFilename: null,
      processedFilesize: null,
      errorMessage: null,
      telegramMessageId: null,
      thumbnailUrl: null,
      createdAt: now,
      updatedAt: now,
    };
    
    this.imageJobs.set(id, newJob);
    return newJob;
  }

  async getImageProcessingJob(id: number): Promise<ImageProcessingJob | undefined> {
    return this.imageJobs.get(id);
  }

  async updateImageProcessingJob(id: number, updates: Partial<ImageProcessingJob>): Promise<ImageProcessingJob> {
    const job = this.imageJobs.get(id);
    if (!job) {
      throw new Error(`Job with id ${id} not found`);
    }
    
    const updatedJob: ImageProcessingJob = {
      ...job,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.imageJobs.set(id, updatedJob);
    return updatedJob;
  }

  async getAllImageProcessingJobs(): Promise<ImageProcessingJob[]> {
    return Array.from(this.imageJobs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getRecentImageProcessingJobs(limit: number): Promise<ImageProcessingJob[]> {
    return Array.from(this.imageJobs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // Statistics methods
  async getStatistics(): Promise<Statistics> {
    return this.stats;
  }

  async updateStatistics(updates: Partial<Statistics>): Promise<Statistics> {
    this.stats = {
      ...this.stats,
      ...updates,
      updatedAt: new Date(),
    };
    
    return this.stats;
  }

  async incrementImagesProcessed(count: number = 1): Promise<void> {
    this.stats.imagesProcessed += count;
    this.stats.updatedAt = new Date();
  }

  async incrementFailedOperations(): Promise<void> {
    this.stats.failedOperations += 1;
    this.stats.updatedAt = new Date();
  }

  async incrementApiCalls(): Promise<void> {
    this.stats.apiCalls += 1;
    this.stats.updatedAt = new Date();
  }

  async updateStorageUsed(bytes: number): Promise<void> {
    this.stats.storageUsedBytes = bytes;
    this.stats.updatedAt = new Date();
  }
  
  async updateTotalSourceFiles(count: number): Promise<void> {
    this.stats.totalSourceFiles = count;
    this.stats.updatedAt = new Date();
  }

  async updateActiveConnections(count: number): Promise<void> {
    this.stats.activeConnections = count;
    this.stats.updatedAt = new Date();
  }
  
  async incrementFilesSent(): Promise<void> {
    this.stats.filesSent += 1;
    this.stats.updatedAt = new Date();
  }

  // Admin user methods
  async getAdminUser(id: number): Promise<AdminUser | undefined> {
    return this.adminUsers.get(id);
  }

  async getAdminUserByUsername(username: string): Promise<AdminUser | undefined> {
    return Array.from(this.adminUsers.values()).find(
      (user) => user.username === username,
    );
  }

  async createAdminUser(user: InsertAdminUser): Promise<AdminUser> {
    const id = this.adminIdCounter++;
    const now = new Date();
    const adminUser: AdminUser = { 
      ...user, 
      id, 
      isActive: user.isActive !== undefined ? user.isActive : true,
      createdAt: now, 
      updatedAt: now 
    };
    this.adminUsers.set(id, adminUser);
    return adminUser;
  }

  async updateAdminUser(id: number, updates: Partial<AdminUser>): Promise<AdminUser> {
    const user = this.adminUsers.get(id);
    if (!user) {
      throw new Error(`Admin user with id ${id} not found`);
    }
    
    const updatedUser: AdminUser = {
      ...user,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.adminUsers.set(id, updatedUser);
    return updatedUser;
  }

  async listAdminUsers(): Promise<AdminUser[]> {
    return Array.from(this.adminUsers.values())
      .sort((a, b) => a.username.localeCompare(b.username));
  }

  async checkIsAdmin(username: string): Promise<boolean> {
    const admin = await this.getAdminUserByUsername(username);
    return admin !== undefined && admin.isActive;
  }

  // Bot config methods
  async getBotConfig(): Promise<BotConfig> {
    return this.botConfig;
  }

  async updateBotConfig(config: Partial<InsertBotConfig>): Promise<BotConfig> {
    this.botConfig = {
      ...this.botConfig,
      ...config,
      updatedAt: new Date(),
    };
    
    return this.botConfig;
  }

  // Activity log methods
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const id = this.logIdCounter++;
    const now = new Date();
    
    const activityLog: ActivityLog = {
      id,
      action: log.action,
      details: log.details,
      status: log.status || "completed",
      filename: log.filename || null,
      filesize: log.filesize || null,
      fromUser: log.fromUser || null,
      createdAt: now,
    };
    
    this.activityLogs.push(activityLog);
    return activityLog;
  }

  async getActivityLogs(limit?: number): Promise<ActivityLog[]> {
    const sortedLogs = [...this.activityLogs].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
    
    return limit ? sortedLogs.slice(0, limit) : sortedLogs;
  }

  // Image edit config methods
  async getImageEditConfig(): Promise<ImageEditConfig> {
    // Initialize if it doesn't exist
    if (!this.imageEditConfig) {
      const now = new Date();
      this.imageEditConfig = {
        id: 1,
        brightnessMin: -30,
        brightnessMax: 30,
        contrastMin: -30,
        contrastMax: 30,
        saturationMin: -30,
        saturationMax: 30,
        blurMin: 0,
        blurMax: 5,
        noiseMin: 0,
        noiseMax: 10,
        
        // Image size configuration
        targetWidthMin: 1200,
        targetWidthMax: 2400,
        targetHeightMin: 800,
        targetHeightMax: 1600,
        enableFixedAspectRatio: false,
        fixedAspectRatio: "4:3",
        
        // Advanced filters
        enableVignette: false,
        vignetteIntensityMin: 10,
        vignetteIntensityMax: 30,
        
        enableSharpen: false,
        sharpenIntensityMin: 1,
        sharpenIntensityMax: 3,
        
        enableColorBalance: false,
        colorBalanceRMin: -10,
        colorBalanceRMax: 10,
        colorBalanceGMin: -10,
        colorBalanceGMax: 10,
        colorBalanceBMin: -10,
        colorBalanceBMax: 10,
        
        enableGrain: false,
        grainIntensityMin: 5,
        grainIntensityMax: 15,
        
        enableFilters: false,
        allowedFilters: ['vintage', 'warmth', 'clarity', 'coolness', 'vibrance'],
        
        // Image transformations
        enableRotation: true,
        rotationMin: -15,
        rotationMax: 15,
        enableCrop: false,
        cropAspectRatio: "original",
        
        // Metadata options
        enableRandomMetadata: true,
        useConsistentMetadataPerFolder: true,
        // Basic metadata fields
        randomizeDevice: true,
        randomizeCamera: true,
        randomizeDateTime: true,
        randomizeFocalLength: true,
        randomizeGPS: false,
        randomizeExposure: true,
        // Advanced metadata fields
        randomizeAperture: true,
        randomizeIso: true,
        randomizeMeteringMode: true,
        randomizeSubjectDistance: true,
        updatedAt: now,
        createdAt: now
      };
    }
    return this.imageEditConfig;
  }

  async updateImageEditConfig(config: Partial<InsertImageEditConfig>): Promise<ImageEditConfig> {
    // Get current config or create it if it doesn't exist
    const currentConfig = await this.getImageEditConfig();
    
    // Update with new values
    this.imageEditConfig = {
      ...currentConfig,
      ...config,
      updatedAt: new Date(),
    };
    
    return this.imageEditConfig;
  }

  // Telegram Group methods
  async getTelegramGroup(id: number): Promise<TelegramGroup | undefined> {
    return this.telegramGroups.get(id);
  }

  async getTelegramGroupByGroupId(groupId: string): Promise<TelegramGroup | undefined> {
    return Array.from(this.telegramGroups.values()).find(
      (group) => group.groupId === groupId
    );
  }

  async createTelegramGroup(group: InsertTelegramGroup): Promise<TelegramGroup> {
    const id = this.groupIdCounter++;
    const now = new Date();
    
    const telegramGroup: TelegramGroup = {
      id,
      groupId: group.groupId,
      groupName: group.groupName,
      groupType: group.groupType || "group",
      memberCount: group.memberCount || 0,
      isActive: group.isActive !== undefined ? group.isActive : true,
      lastUpdated: now,
      createdAt: now
    };
    
    this.telegramGroups.set(id, telegramGroup);
    return telegramGroup;
  }

  async updateTelegramGroup(id: number, updates: Partial<TelegramGroup>): Promise<TelegramGroup> {
    const group = this.telegramGroups.get(id);
    if (!group) {
      throw new Error(`Telegram group with id ${id} not found`);
    }
    
    const updatedGroup: TelegramGroup = {
      ...group,
      ...updates,
      lastUpdated: new Date(),
    };
    
    this.telegramGroups.set(id, updatedGroup);
    return updatedGroup;
  }

  async listTelegramGroups(): Promise<TelegramGroup[]> {
    return Array.from(this.telegramGroups.values())
      .filter(group => group.isActive)
      .sort((a, b) => a.groupName.localeCompare(b.groupName));
  }
  
  // Telegram Bot Admin methods
  async getTelegramBotAdmin(id: number): Promise<TelegramBotAdmin | undefined> {
    return this.telegramBotAdmins.get(id);
  }

  async getTelegramBotAdminByUsername(username: string): Promise<TelegramBotAdmin | undefined> {
    return Array.from(this.telegramBotAdmins.values()).find(
      (admin) => admin.username.toLowerCase() === username.toLowerCase()
    );
  }

  async createTelegramBotAdmin(admin: InsertTelegramBotAdmin): Promise<TelegramBotAdmin> {
    const id = this.telegramBotAdminIdCounter++;
    const now = new Date();
    
    const telegramBotAdmin: TelegramBotAdmin = {
      id,
      username: admin.username,
      isActive: admin.isActive !== undefined ? admin.isActive : true,
      notes: admin.notes || null,
      canSendFiles: admin.canSendFiles !== undefined ? admin.canSendFiles : true,
      canManageUsers: admin.canManageUsers !== undefined ? admin.canManageUsers : false,
      createdAt: now,
      updatedAt: now
    };
    
    this.telegramBotAdmins.set(id, telegramBotAdmin);
    
    // Log the activity
    await this.createActivityLog({
      action: "tg_admin_added",
      details: `Telegram bot admin ${admin.username} added`,
      status: "completed"
    });
    
    return telegramBotAdmin;
  }

  async updateTelegramBotAdmin(id: number, updates: Partial<TelegramBotAdmin>): Promise<TelegramBotAdmin> {
    const admin = this.telegramBotAdmins.get(id);
    if (!admin) {
      throw new Error(`Telegram bot admin with id ${id} not found`);
    }
    
    const updatedAdmin: TelegramBotAdmin = {
      ...admin,
      ...updates,
      updatedAt: new Date()
    };
    
    this.telegramBotAdmins.set(id, updatedAdmin);
    
    // Log the activity
    await this.createActivityLog({
      action: "tg_admin_updated",
      details: `Telegram bot admin ${admin.username} updated`,
      status: "completed"
    });
    
    return updatedAdmin;
  }

  async deleteTelegramBotAdmin(id: number): Promise<boolean> {
    const admin = this.telegramBotAdmins.get(id);
    if (!admin) {
      return false;
    }
    
    this.telegramBotAdmins.delete(id);
    
    // Log the activity
    await this.createActivityLog({
      action: "tg_admin_deleted",
      details: `Telegram bot admin ${admin.username} deleted`,
      status: "completed"
    });
    
    return true;
  }

  async listTelegramBotAdmins(): Promise<TelegramBotAdmin[]> {
    return Array.from(this.telegramBotAdmins.values())
      .sort((a, b) => a.username.localeCompare(b.username));
  }
  
  // Telegram Bot User methods
  async getTelegramBotUser(id: number): Promise<TelegramBotUser | undefined> {
    return this.telegramBotUsers.get(id);
  }

  async getTelegramBotUserByUsername(username: string): Promise<TelegramBotUser | undefined> {
    return Array.from(this.telegramBotUsers.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async createTelegramBotUser(user: InsertTelegramBotUser): Promise<TelegramBotUser> {
    const id = this.telegramBotUserIdCounter++;
    const now = new Date();
    
    const telegramBotUser: TelegramBotUser = {
      id,
      username: user.username,
      isActive: user.isActive !== undefined ? user.isActive : true,
      notes: user.notes || null,
      maxDailyImages: user.maxDailyImages || 10,
      imagesUsedToday: user.imagesUsedToday || 0,
      allowedGroups: Array.isArray(user.allowedGroups) ? user.allowedGroups : null,
      lastActivity: null,
      createdAt: now,
      updatedAt: now
    };
    
    this.telegramBotUsers.set(id, telegramBotUser);
    
    // Log the activity
    await this.createActivityLog({
      action: "tg_user_added",
      details: `Telegram bot user ${user.username} added`,
      status: "completed"
    });
    
    return telegramBotUser;
  }

  async updateTelegramBotUser(id: number, updates: Partial<TelegramBotUser>): Promise<TelegramBotUser> {
    const user = this.telegramBotUsers.get(id);
    if (!user) {
      throw new Error(`Telegram bot user with id ${id} not found`);
    }
    
    const updatedUser: TelegramBotUser = {
      ...user,
      ...updates,
      updatedAt: new Date()
    };
    
    this.telegramBotUsers.set(id, updatedUser);
    
    // Log the activity
    await this.createActivityLog({
      action: "tg_user_updated",
      details: `Telegram bot user ${user.username} updated`,
      status: "completed"
    });
    
    return updatedUser;
  }

  async deleteTelegramBotUser(id: number): Promise<boolean> {
    const user = this.telegramBotUsers.get(id);
    if (!user) {
      return false;
    }
    
    this.telegramBotUsers.delete(id);
    
    // Log the activity
    await this.createActivityLog({
      action: "tg_user_deleted",
      details: `Telegram bot user ${user.username} deleted`,
      status: "completed"
    });
    
    return true;
  }

  async listTelegramBotUsers(): Promise<TelegramBotUser[]> {
    return Array.from(this.telegramBotUsers.values())
      .sort((a, b) => a.username.localeCompare(b.username));
  }

  // Telegram Group Member methods
  async getTelegramGroupMember(id: number): Promise<TelegramGroupMember | undefined> {
    return this.telegramGroupMembers.get(id);
  }

  async getTelegramGroupMemberByUserIdAndGroupId(userId: string, groupId: string): Promise<TelegramGroupMember | undefined> {
    return Array.from(this.telegramGroupMembers.values()).find(
      (member) => member.userId === userId && member.groupId === groupId
    );
  }

  async createTelegramGroupMember(member: InsertTelegramGroupMember): Promise<TelegramGroupMember> {
    const id = this.groupMemberIdCounter++;
    const now = new Date();
    
    const telegramGroupMember: TelegramGroupMember = {
      id,
      groupId: member.groupId,
      userId: member.userId,
      username: member.username || null,
      firstName: member.firstName || null,
      lastName: member.lastName || null,
      isAdmin: member.isAdmin !== undefined ? member.isAdmin : false,
      isBot: member.isBot !== undefined ? member.isBot : false,
      lastSeen: member.lastSeen || null,
      createdAt: now
    };
    
    this.telegramGroupMembers.set(id, telegramGroupMember);
    return telegramGroupMember;
  }

  async updateTelegramGroupMember(id: number, updates: Partial<TelegramGroupMember>): Promise<TelegramGroupMember> {
    const member = this.telegramGroupMembers.get(id);
    if (!member) {
      throw new Error(`Telegram group member with id ${id} not found`);
    }
    
    const updatedMember: TelegramGroupMember = {
      ...member,
      ...updates
    };
    
    this.telegramGroupMembers.set(id, updatedMember);
    return updatedMember;
  }

  async listTelegramGroupMembers(groupId: string): Promise<TelegramGroupMember[]> {
    return Array.from(this.telegramGroupMembers.values())
      .filter(member => member.groupId === groupId)
      .sort((a, b) => {
        // Sort by username if available, otherwise use userIds
        const aName = a.username || a.firstName || a.userId;
        const bName = b.username || b.firstName || b.userId;
        return aName.localeCompare(bName);
      });
  }

  // Scheduled Send methods
  async getScheduledSend(id: number): Promise<ScheduledSend | undefined> {
    return this.scheduledSends.get(id);
  }

  async createScheduledSend(send: InsertScheduledSend): Promise<ScheduledSend> {
    const id = this.scheduledSendIdCounter++;
    const now = new Date();
    
    const scheduledSend: ScheduledSend = {
      id,
      name: send.name,
      groupId: send.groupId,
      groupHandle: send.groupHandle || null,
      selectedUserIds: send.selectedUserIds,
      imagesToSend: send.imagesToSend || 15,
      messageTemplate: send.messageTemplate || "@{username}, pics for {date}",
      scheduledDate: send.scheduledDate || null,
      isRecurring: send.isRecurring || false,
      recurringType: send.recurringType || "daily",
      timeOfDay: send.timeOfDay || null,
      createdBy: send.createdBy || null,
      status: "pending",
      completedAt: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now
    };
    
    this.scheduledSends.set(id, scheduledSend);
    return scheduledSend;
  }

  async updateScheduledSend(id: number, updates: Partial<ScheduledSend>): Promise<ScheduledSend> {
    const send = this.scheduledSends.get(id);
    if (!send) {
      throw new Error(`Scheduled send with id ${id} not found`);
    }
    
    const updatedSend: ScheduledSend = {
      ...send,
      ...updates,
      updatedAt: new Date()
    };
    
    this.scheduledSends.set(id, updatedSend);
    return updatedSend;
  }

  async listScheduledSends(): Promise<ScheduledSend[]> {
    return Array.from(this.scheduledSends.values())
      .sort((a, b) => {
        // Sort by scheduled date if available, otherwise by created date
        const aDate = a.scheduledDate ? a.scheduledDate.getTime() : a.createdAt.getTime();
        const bDate = b.scheduledDate ? b.scheduledDate.getTime() : b.createdAt.getTime();
        return bDate - aDate;
      });
  }

  async getPendingScheduledSends(): Promise<ScheduledSend[]> {
    const now = new Date();
    
    return Array.from(this.scheduledSends.values())
      .filter(send => {
        if (send.status !== "pending") {
          return false; // Skip if not pending
        }
        
        // Case 1: No scheduled date - send immediately
        if (!send.scheduledDate) {
          return true;
        }
        
        // Case 2: Non-recurring send with scheduled date in past
        if (!send.isRecurring && send.scheduledDate <= now) {
          return true;
        }
        
        // Case 3: Recurring send that needs to be processed
        if (send.isRecurring) {
          // Check if it's time to send based on timeOfDay
          const scheduledHours = send.timeOfDay ? parseInt(send.timeOfDay.split(':')[0]) : 9;
          const scheduledMinutes = send.timeOfDay ? parseInt(send.timeOfDay.split(':')[1]) : 0;
          
          // For daily recurring: if it's after the scheduled time today and hasn't been sent today
          if (send.recurringType === 'daily') {
            const lastSentDate = send.completedAt ? new Date(send.completedAt) : null;
            const today = new Date();
            
            // Check if we've already sent today
            if (lastSentDate && 
                lastSentDate.getDate() === today.getDate() && 
                lastSentDate.getMonth() === today.getMonth() && 
                lastSentDate.getFullYear() === today.getFullYear()) {
              return false; // Already sent today
            }
            
            // Check if it's after the scheduled time
            return now.getHours() >= scheduledHours && 
                  (now.getHours() > scheduledHours || now.getMinutes() >= scheduledMinutes);
          }
          
          // TODO: Add weekly and monthly logic when needed
          
          return false; // Default for other recurring types for now
        }
        
        return false; // Default case
      })
      .sort((a, b) => {
        // Sort by scheduled date if available, otherwise by created date
        const aDate = a.scheduledDate ? a.scheduledDate.getTime() : a.createdAt.getTime();
        const bDate = b.scheduledDate ? b.scheduledDate.getTime() : b.createdAt.getTime();
        return aDate - bDate; // Oldest first (to process in chronological order)
      });
  }

  // Authorized User methods
  async getAuthorizedUser(id: number): Promise<AuthorizedUser | undefined> {
    return this.authorizedUsers.get(id);
  }

  async getAuthorizedUserByUsername(username: string): Promise<AuthorizedUser | undefined> {
    // Remove @ prefix if present and ensure lowercase comparison
    const normalizedUsername = username.startsWith('@') ? username.substring(1).toLowerCase() : username.toLowerCase();
    
    return Array.from(this.authorizedUsers.values()).find(
      (user) => user.username.toLowerCase() === normalizedUsername
    );
  }

  async createAuthorizedUser(user: InsertAuthorizedUser): Promise<AuthorizedUser> {
    const id = this.authorizedUserIdCounter++;
    const now = new Date();
    
    // Normalize the username (remove @ if present)
    const normalizedUsername = user.username.startsWith('@') ? user.username.substring(1) : user.username;
    
    const authorizedUser: AuthorizedUser = {
      id,
      username: normalizedUsername,
      isActive: user.isActive !== undefined ? user.isActive : true,
      isAdmin: user.isAdmin !== undefined ? user.isAdmin : false,
      notes: user.notes || null,
      createdAt: now,
      updatedAt: now
    };
    
    this.authorizedUsers.set(id, authorizedUser);
    return authorizedUser;
  }

  async updateAuthorizedUser(id: number, updates: Partial<AuthorizedUser>): Promise<AuthorizedUser> {
    const user = this.authorizedUsers.get(id);
    if (!user) {
      throw new Error(`Authorized user with id ${id} not found`);
    }
    
    // If updating username, normalize it (remove @ if present)
    let normalizedUpdates = { ...updates };
    if (updates.username) {
      normalizedUpdates.username = updates.username.startsWith('@') 
        ? updates.username.substring(1) 
        : updates.username;
    }
    
    const updatedUser: AuthorizedUser = {
      ...user,
      ...normalizedUpdates,
      updatedAt: new Date(),
    };
    
    this.authorizedUsers.set(id, updatedUser);
    return updatedUser;
  }

  async listAuthorizedUsers(): Promise<AuthorizedUser[]> {
    return Array.from(this.authorizedUsers.values())
      .sort((a, b) => a.username.localeCompare(b.username));
  }

  async checkIsAuthorized(username: string): Promise<boolean> {
    // Remove @ prefix if present and ensure lowercase comparison
    const normalizedUsername = username.startsWith('@') ? username.substring(1).toLowerCase() : username.toLowerCase();
    
    const user = await this.getAuthorizedUserByUsername(normalizedUsername);
    return user !== undefined && user.isActive;
  }

  // User session methods
  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    const id = this.sessionIdCounter++;
    const now = new Date();
    
    const userSession: UserSession = {
      id,
      userId: session.userId,
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt,
      ipAddress: session.ipAddress || null,
      userAgent: session.userAgent || null,
      lastActive: now,
      createdAt: now
    };
    
    this.userSessions.set(id, userSession);
    return userSession;
  }

  async getUserSessionByToken(token: string): Promise<UserSession | undefined> {
    return Array.from(this.userSessions.values()).find(
      (session) => session.sessionToken === token && session.expiresAt > new Date()
    );
  }

  async updateUserSession(id: number, updates: Partial<UserSession>): Promise<UserSession> {
    const session = this.userSessions.get(id);
    if (!session) {
      throw new Error(`Session with id ${id} not found`);
    }
    
    const updatedSession: UserSession = {
      ...session,
      ...updates,
      lastActive: new Date()
    };
    
    this.userSessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteUserSession(token: string): Promise<boolean> {
    const sessionToDelete = Array.from(this.userSessions.entries()).find(
      ([_, session]) => session.sessionToken === token
    );
    
    if (sessionToDelete) {
      const [id, _] = sessionToDelete;
      return this.userSessions.delete(id);
    }
    
    return false;
  }

  async cleanExpiredSessions(): Promise<number> {
    let deletedCount = 0;
    const now = new Date();
    
    Array.from(this.userSessions.entries()).forEach(([id, session]) => {
      if (session.expiresAt < now) {
        this.userSessions.delete(id);
        deletedCount++;
      }
    });
    
    return deletedCount;
  }
  
  // User validation method
  async validateUserCredentials(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;
    
    try {
      // Import the comparePasswords function from auth.ts
      const { comparePasswords } = await import('./auth');
      const isValid = await comparePasswords(password, user.password);
      
      if (isValid) {
        await this.updateUser(user.id, { lastLogin: new Date() });
        return user;
      }
    } catch (error) {
      console.error("Error validating password:", error);
    }
    
    return null;
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    
    const updatedUser: User = {
      ...user,
      ...updates,
      updatedAt: new Date()
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async listUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
}

export const storage = new MemStorage();
