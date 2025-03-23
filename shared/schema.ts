import { pgTable, text, serial, integer, boolean, timestamp, json, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email"),
  password: text("password").notNull(),
  fullName: text("full_name"),
  role: text("role").notNull().default("user"), // user, admin, superadmin
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  sourceImagesDir: text("source_images_dir"),
  processedImagesDir: text("processed_images_dir"),
  tempExtractionDir: text("temp_extraction_dir"),
  telegramCredentialId: integer("telegram_credential_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  fullName: true,
  role: true,
  isActive: true,
  sourceImagesDir: true,
  processedImagesDir: true,
  tempExtractionDir: true,
  telegramCredentialId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const telegramCredentials = pgTable("telegram_credentials", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  apiId: text("api_id").notNull(),
  apiHash: text("api_hash").notNull(),
  phoneNumber: text("phone_number").notNull(),
  sessionString: text("session_string"),
  isActive: boolean("is_active").notNull().default(false),
  lastConnected: timestamp("last_connected"),
  sessionDir: text("session_dir"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTelegramCredentialsSchema = createInsertSchema(telegramCredentials).pick({
  userId: true,
  apiId: true,
  apiHash: true,
  phoneNumber: true,
  sessionString: true,
  isActive: true,
  sessionDir: true,
});

export type InsertTelegramCredentials = z.infer<typeof insertTelegramCredentialsSchema>;
export type TelegramCredentials = typeof telegramCredentials.$inferSelect;

export const imageProcessingJobs = pgTable("image_processing_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  originalFilename: text("original_filename").notNull(),
  originalFilesize: integer("original_filesize").notNull(),
  processedFilename: text("processed_filename"),
  processedFilesize: integer("processed_filesize"),
  processingOptions: json("processing_options").notNull(),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  telegramMessageId: text("telegram_message_id"),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertImageProcessingJobSchema = createInsertSchema(imageProcessingJobs).pick({
  userId: true,
  originalFilename: true,
  originalFilesize: true,
  processingOptions: true,
});

export type InsertImageProcessingJob = z.infer<typeof insertImageProcessingJobSchema>;
export type ImageProcessingJob = typeof imageProcessingJobs.$inferSelect;

export const statistics = pgTable("statistics", {
  id: serial("id").primaryKey(),
  imagesProcessed: integer("images_processed").notNull().default(0),
  storageUsedBytes: integer("storage_used_bytes").notNull().default(0),
  failedOperations: integer("failed_operations").notNull().default(0),
  apiCalls: integer("api_calls").notNull().default(0),
  activeConnections: integer("active_connections").notNull().default(0),
  filesSent: integer("files_sent").notNull().default(0),
  totalSourceFiles: integer("total_source_files").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertStatisticsSchema = createInsertSchema(statistics).pick({
  imagesProcessed: true,
  storageUsedBytes: true,
  failedOperations: true,
  apiCalls: true,
  activeConnections: true,
  filesSent: true,
});

export type InsertStatistics = z.infer<typeof insertStatisticsSchema>;
export type Statistics = typeof statistics.$inferSelect;

// Admin users who are allowed to send .zip files
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).pick({
  username: true,
  isActive: true,
});

export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;

// Bot configuration for trigger words and behaviors
export const botConfig = pgTable("bot_config", {
  id: serial("id").primaryKey(),
  triggerWords: text("trigger_words").array().notNull().default([]),
  replyMessage: text("reply_message").notNull().default("Processing your request..."),
  imagesToSend: integer("images_to_send").notNull().default(15),
  foldersToSend: integer("folders_to_send").notNull().default(3),
  workInGroups: boolean("work_in_groups").notNull().default(true),
  // Custom filename and caption formatting options
  fileNameFormat: text("file_name_format").notNull().default("Photos-{date}-{username}"),
  captionFormat: text("caption_format").notNull().default("Images processed for {username} on {date}"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBotConfigSchema = createInsertSchema(botConfig).pick({
  triggerWords: true,
  replyMessage: true,
  imagesToSend: true,
  foldersToSend: true,
  workInGroups: true,
  fileNameFormat: true,
  captionFormat: true,
});

export type InsertBotConfig = z.infer<typeof insertBotConfigSchema>;
export type BotConfig = typeof botConfig.$inferSelect;

// Activity logs for downloading and processing files
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  details: text("details").notNull(),
  status: text("status").notNull().default("completed"),
  filename: text("filename"),
  filesize: integer("filesize"),
  fromUser: text("from_user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).pick({
  action: true,
  details: true,
  status: true,
  filename: true,
  filesize: true,
  fromUser: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

// Image editing configuration schema
export const imageEditConfig = pgTable("image_edit_config", {
  id: serial("id").primaryKey(),
  // Image editing ranges
  brightnessMin: integer("brightness_min").notNull().default(-30),
  brightnessMax: integer("brightness_max").notNull().default(30),
  contrastMin: integer("contrast_min").notNull().default(-30),
  contrastMax: integer("contrast_max").notNull().default(30),
  saturationMin: integer("saturation_min").notNull().default(-30),
  saturationMax: integer("saturation_max").notNull().default(30),
  blurMin: integer("blur_min").notNull().default(0),
  blurMax: integer("blur_max").notNull().default(5),
  noiseMin: integer("noise_min").notNull().default(0),
  noiseMax: integer("noise_max").notNull().default(10),
  
  // Image size configuration
  targetWidthMin: integer("target_width_min").notNull().default(1200),
  targetWidthMax: integer("target_width_max").notNull().default(2400),
  targetHeightMin: integer("target_height_min").notNull().default(800),
  targetHeightMax: integer("target_height_max").notNull().default(1600),
  enableFixedAspectRatio: boolean("enable_fixed_aspect_ratio").notNull().default(false),
  fixedAspectRatio: text("fixed_aspect_ratio").notNull().default("4:3"),
  
  // Advanced filters
  enableVignette: boolean("enable_vignette").notNull().default(false),
  vignetteIntensityMin: integer("vignette_intensity_min").notNull().default(10),
  vignetteIntensityMax: integer("vignette_intensity_max").notNull().default(30),
  
  enableSharpen: boolean("enable_sharpen").notNull().default(false),
  sharpenIntensityMin: integer("sharpen_intensity_min").notNull().default(1),
  sharpenIntensityMax: integer("sharpen_intensity_max").notNull().default(3),
  
  enableColorBalance: boolean("enable_color_balance").notNull().default(false),
  colorBalanceRMin: integer("color_balance_r_min").notNull().default(-10),
  colorBalanceRMax: integer("color_balance_r_max").notNull().default(10),
  colorBalanceGMin: integer("color_balance_g_min").notNull().default(-10),
  colorBalanceGMax: integer("color_balance_g_max").notNull().default(10),
  colorBalanceBMin: integer("color_balance_b_min").notNull().default(-10),
  colorBalanceBMax: integer("color_balance_b_max").notNull().default(10),
  
  enableGrain: boolean("enable_grain").notNull().default(false),
  grainIntensityMin: integer("grain_intensity_min").notNull().default(5),
  grainIntensityMax: integer("grain_intensity_max").notNull().default(15),
  
  enableFilters: boolean("enable_filters").notNull().default(false),
  allowedFilters: text("allowed_filters").array().notNull().default(['vintage', 'warmth', 'clarity', 'coolness', 'vibrance']),
  
  // Image transformations
  enableRotation: boolean("enable_rotation").notNull().default(true),
  rotationMin: integer("rotation_min").notNull().default(-15),
  rotationMax: integer("rotation_max").notNull().default(15),
  enableCrop: boolean("enable_crop").notNull().default(false),
  cropAspectRatio: text("crop_aspect_ratio").notNull().default("original"),
  
  // Metadata options
  enableRandomMetadata: boolean("enable_random_metadata").notNull().default(true),
  useConsistentMetadataPerFolder: boolean("consistent_metadata_per_folder").notNull().default(true),
  
  // Metadata types to randomize
  randomizeDevice: boolean("randomize_device").notNull().default(true),
  randomizeCamera: boolean("randomize_camera").notNull().default(true),
  randomizeDateTime: boolean("randomize_date_time").notNull().default(true),
  randomizeFocalLength: boolean("randomize_focal_length").notNull().default(true),
  randomizeGPS: boolean("randomize_gps").notNull().default(false),
  randomizeExposure: boolean("randomize_exposure").notNull().default(true),
  randomizeAperture: boolean("randomize_aperture").notNull().default(true),
  randomizeIso: boolean("randomize_iso").notNull().default(true),
  randomizeMeteringMode: boolean("randomize_metering_mode").notNull().default(true),
  randomizeSubjectDistance: boolean("randomize_subject_distance").notNull().default(true),
  
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertImageEditConfigSchema = createInsertSchema(imageEditConfig).omit({
  id: true,
  updatedAt: true,
  createdAt: true
});

export type InsertImageEditConfig = z.infer<typeof insertImageEditConfigSchema>;
export type ImageEditConfig = typeof imageEditConfig.$inferSelect;

// Telegram Group schema for groups that can be selected for scheduled send
export const telegramGroups = pgTable("telegram_groups", {
  id: serial("id").primaryKey(),
  groupId: text("group_id").notNull().unique(),
  groupName: text("group_name").notNull(),
  groupType: text("group_type").notNull().default("group"), // group, supergroup, channel
  memberCount: integer("member_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTelegramGroupSchema = createInsertSchema(telegramGroups).pick({
  groupId: true,
  groupName: true,
  groupType: true,
  memberCount: true,
  isActive: true,
});

export type InsertTelegramGroup = z.infer<typeof insertTelegramGroupSchema>;
export type TelegramGroup = typeof telegramGroups.$inferSelect;

// Telegram Group Member schema for users in groups
export const telegramGroupMembers = pgTable("telegram_group_members", {
  id: serial("id").primaryKey(),
  groupId: text("group_id").notNull(),
  userId: text("user_id").notNull(),
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  isAdmin: boolean("is_admin").notNull().default(false),
  isBot: boolean("is_bot").notNull().default(false),
  lastSeen: timestamp("last_seen"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTelegramGroupMemberSchema = createInsertSchema(telegramGroupMembers).pick({
  groupId: true,
  userId: true,
  username: true,
  firstName: true,
  lastName: true,
  isAdmin: true,
  isBot: true,
  lastSeen: true,
});

export type InsertTelegramGroupMember = z.infer<typeof insertTelegramGroupMemberSchema>;
export type TelegramGroupMember = typeof telegramGroupMembers.$inferSelect;

// Scheduled Send schema for scheduling image processing and distribution
export const scheduledSends = pgTable("scheduled_sends", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  groupId: text("group_id").notNull(), // Keep for backward compatibility
  groupHandle: text("group_handle"), // New field for Telegram group handle
  selectedUserIds: text("selected_user_ids").array().notNull(),
  imagesToSend: integer("images_to_send").notNull().default(15),
  messageTemplate: text("message_template").notNull().default("@{username}, pics for {date}"),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, failed
  scheduledDate: timestamp("scheduled_date"),
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurringType: text("recurring_type").default("daily"), // daily, weekly, monthly
  timeOfDay: text("time_of_day"), // Format: "HH:MM" in 24-hour format
  completedAt: timestamp("completed_at"),
  createdBy: text("created_by"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertScheduledSendSchema = createInsertSchema(scheduledSends).pick({
  name: true,
  groupId: true,
  groupHandle: true,
  selectedUserIds: true,
  imagesToSend: true,
  messageTemplate: true,
  scheduledDate: true,
  isRecurring: true,
  recurringType: true,
  timeOfDay: true,
  createdBy: true,
});

export type InsertScheduledSend = z.infer<typeof insertScheduledSendSchema>;
export type ScheduledSend = typeof scheduledSends.$inferSelect;

// Helper type for dates that can be either Date or null
export type NullableDate = Date | null;

// Define the authorized users table to manage access to the bot
export const authorizedUsers = pgTable("authorized_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  isAdmin: boolean("is_admin").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const insertAuthorizedUserSchema = createInsertSchema(authorizedUsers).pick({
  username: true,
  isActive: true,
  isAdmin: true,
  notes: true
});

export type InsertAuthorizedUser = z.infer<typeof insertAuthorizedUserSchema>;
export type AuthorizedUser = typeof authorizedUsers.$inferSelect;

// User sessions for login management
export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  sessionToken: text("session_token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  lastActive: timestamp("last_active").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSessionSchema = createInsertSchema(userSessions).pick({
  userId: true,
  sessionToken: true,
  expiresAt: true,
  ipAddress: true,
  userAgent: true,
});

export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type UserSession = typeof userSessions.$inferSelect;

// Telegram Bot Administrators
export const telegramBotAdmins = pgTable("telegram_bot_admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  notes: text("notes"),
  canSendFiles: boolean("can_send_files").default(true).notNull(),
  canManageUsers: boolean("can_manage_users").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTelegramBotAdminSchema = createInsertSchema(telegramBotAdmins).pick({
  username: true,
  isActive: true,
  notes: true,
  canSendFiles: true,
  canManageUsers: true,
});

export type InsertTelegramBotAdmin = z.infer<typeof insertTelegramBotAdminSchema>;
export type TelegramBotAdmin = typeof telegramBotAdmins.$inferSelect;

// Telegram Bot Users
export const telegramBotUsers = pgTable("telegram_bot_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  notes: text("notes"),
  maxDailyImages: integer("max_daily_images").default(10).notNull(),
  imagesUsedToday: integer("images_used_today").default(0).notNull(),
  allowedGroups: json("allowed_groups").$type<string[] | null>(),
  lastActivity: timestamp("last_activity"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTelegramBotUserSchema = createInsertSchema(telegramBotUsers).pick({
  username: true,
  isActive: true,
  notes: true,
  maxDailyImages: true,
  imagesUsedToday: true,
  allowedGroups: true,
});

export type InsertTelegramBotUser = z.infer<typeof insertTelegramBotUserSchema>;
export type TelegramBotUser = typeof telegramBotUsers.$inferSelect;
