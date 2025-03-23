import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs/promises';
import { TelegramClient } from 'telegram';
import { Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { storage } from '../storage';
import { Logger } from 'telegram/extensions';

/**
 * TelegramClientService - A service to interact with the Telegram API
 * 
 * This service handles:
 * 1. Authentication with Telegram (login, verification)
 * 2. Sending files to Telegram
 * 3. Managing connection status
 * 4. Fetching groups and their members for distribution
 */
class TelegramClientService {
  private client: TelegramClient | null = null;
  private initialized: boolean = false;
  private connected: boolean = false;
  private events: EventEmitter = new EventEmitter();
  private lastConnected: Date | null = null;
  private sessionDir: string = path.join(process.cwd(), 'sessions');
  private phoneCodeHash: string = '';

  constructor() {
    this.ensureSessionDir();
  }

  /**
   * Create the sessions directory if it doesn't exist
   */
  private async ensureSessionDir() {
    try {
      await fs.mkdir(this.sessionDir, { recursive: true });
    } catch (error) {
      console.error('Error creating session directory:', error);
    }
  }

  /**
   * Initialize the Telegram client with credentials and request a verification code
   */
  async initialize(credentials: { apiId: string; apiHash: string; phoneNumber: string }) {
    try {
      console.log("Initializing Telegram client with credentials:", {
        phoneNumber: credentials.phoneNumber,
        apiId: credentials.apiId
      });

      // Validate credentials
      if (!credentials.apiId || !credentials.apiHash || !credentials.phoneNumber) {
        throw new Error('Invalid credentials provided');
      }

      // Convert apiId to number
      const apiId = parseInt(credentials.apiId, 10);
      if (isNaN(apiId)) {
        throw new Error('API ID must be a valid number');
      }

      // Get session string from storage if available
      const savedCredentials = await storage.getTelegramCredentials();
      const sessionString = savedCredentials?.sessionString || '';

      // Create string session
      const stringSession = new StringSession(sessionString);

      // Disconnect existing client if any
      if (this.client) {
        await this.client.disconnect();
        this.client = null;
      }

      console.log("Creating new TelegramClient instance");
      
      // Create Telegram client
      this.client = new TelegramClient(
        stringSession,
        apiId,
        credentials.apiHash,
        {
          connectionRetries: 5,
          useWSS: true,
          // Use default logger to avoid TypeScript errors with Logger parameters
          baseLogger: undefined
        }
      );

      // Save credentials to storage first
      await storage.saveTelegramCredentials({
        apiId: credentials.apiId,
        apiHash: credentials.apiHash,
        phoneNumber: credentials.phoneNumber,
        isActive: false
      });

      // Connect to Telegram
      console.log("Connecting to Telegram...");
      await this.client.connect();
      console.log("Connected successfully");

      try {
        // Send verification code to the phone number
        console.log(`Requesting verification code for ${credentials.phoneNumber}`);
        
        // Use the low-level API to avoid type issues, with proper type conversions
        const sendCodeRequest = {
          phone: credentials.phoneNumber,
          api_id: apiId,
          api_hash: credentials.apiHash,
          settings: {
            allow_flashcall: false,
            current_number: true,
            allow_app_hash: true
          }
        };
        
        // Try a different approach for invoking the API method
        // Use the proper SendCode request format
        const sendCode = new Api.auth.SendCode({
          phoneNumber: credentials.phoneNumber,
          apiId: apiId,
          apiHash: credentials.apiHash,
          settings: new Api.CodeSettings({
            allowFlashcall: false,
            currentNumber: true,
            allowAppHash: true
          })
        });
        
        const codeResponse = await this.client.invoke(sendCode);
        console.log("Code response received:", JSON.stringify(codeResponse, null, 2));
        
        // Extract the phone code hash from the response using type casting
        // The response format may vary depending on the Telegram API version
        const anyResponse = codeResponse as any;
        let phoneCodeHash = '';
        
        if (anyResponse && typeof anyResponse === 'object') {
          // Try multiple possible property names
          if (anyResponse.phoneCodeHash) {
            phoneCodeHash = anyResponse.phoneCodeHash;
          } else if (anyResponse.phone_code_hash) {
            phoneCodeHash = anyResponse.phone_code_hash;
          } else if (anyResponse.type === 'auth.sentCode' && anyResponse.phone_code_hash) {
            phoneCodeHash = anyResponse.phone_code_hash;
          }
        }
        
        if (!phoneCodeHash) {
          console.error("Unable to extract phoneCodeHash from response:", codeResponse);
          throw new Error("Could not extract verification code hash from Telegram response");
        }
        
        this.phoneCodeHash = phoneCodeHash;
        console.log(`Phone code hash received: ${this.phoneCodeHash}`);
      } catch (error: any) {
        console.error("Error sending verification code:", error);
        throw new Error(`Failed to send verification code: ${error.message}`);
      }

      this.initialized = true;
      this.connected = false; // Not connected until verification is complete

      return { 
        success: true, 
        needsCode: true,
        phoneCodeHash: this.phoneCodeHash
      };
    } catch (error: any) {
      console.error('Error initializing Telegram client:', error);
      this.initialized = false;
      this.connected = false;
      throw new Error(`Failed to initialize Telegram client: ${error.message}`);
    }
  }

  /**
   * Login with a verification code
   */
  async login(code: string, password?: string, clientPhoneCodeHash?: string) {
    if (!this.client) {
      throw new Error('Telegram client not initialized');
    }

    try {
      const credentials = await storage.getTelegramCredentials();
      if (!credentials) {
        throw new Error('No Telegram credentials found');
      }

      if (!code || code.trim() === '') {
        throw new Error('Verification code is required');
      }

      // Use phone code hash from client if provided
      const phoneCodeHash = clientPhoneCodeHash || this.phoneCodeHash;
      
      if (!phoneCodeHash) {
        throw new Error('Phone code hash not available. Please request a new code.');
      }

      console.log(`Attempting to sign in with code ${code} and hash ${phoneCodeHash}`);

      // Sign in with the code
      const signInRequest = new Api.auth.SignIn({
        phoneNumber: credentials.phoneNumber,
        phoneCode: code,
        phoneCodeHash: phoneCodeHash
      });
      
      const result = await this.client.invoke(signInRequest);
      console.log("Sign in result:", result);
      
      this.connected = true;
      this.lastConnected = new Date();

      // Save session string
      const sessionString = this.client.session.save() as unknown as string;
      await storage.updateTelegramSession(sessionString);
      
      // Update credentials as active
      await storage.saveTelegramCredentials({
        ...credentials,
        sessionString,
        isActive: true
      });

      await storage.updateActiveConnections(1);

      // Initialize the bot service
      try {
        const { telegramBot } = await import('./telegramBotService');
        await telegramBot.initialize(this.client);
        console.log('Telegram bot initialized successfully');
      } catch (botError: any) {
        console.error('Error initializing Telegram bot:', botError);
        // We continue even if bot initialization fails
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error during Telegram login:', error);
      
      // Handle 2FA if needed
      if (error.message.includes('PASSWORD_REQUIRED') && password) {
        try {
          // Create password check request
          const checkPasswordRequest = new Api.auth.CheckPassword({
            password: Buffer.from(password) as unknown as any
          });
          
          await this.client.invoke(checkPasswordRequest);
          
          this.connected = true;
          this.lastConnected = new Date();
          
          // Save session
          const sessionString = this.client.session.save() as unknown as string;
          await storage.updateTelegramSession(sessionString);
          
          return { success: true };
        } catch (passwordError: any) {
          console.error('Error during password verification:', passwordError);
          throw new Error(`Password verification failed: ${passwordError.message}`);
        }
      }
      
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  /**
   * Refresh the Telegram connection
   * If the session string exists, will try to automatically connect without needing to log in
   */
  async refreshConnection() {
    if (!this.client) {
      const credentials = await storage.getTelegramCredentials();
      if (!credentials) {
        throw new Error('No Telegram credentials found');
      }

      console.log('Attempting to refresh connection with stored credentials...');
      
      // Create the sessions directory if it doesn't exist
      await this.ensureSessionDir();
      
      // Check if there's a saved session
      if (credentials.sessionString && credentials.sessionString.length > 0) {
        try {
          console.log('Found session string, attempting to restore session');
          
          this.client = new TelegramClient(
            new StringSession(credentials.sessionString),
            parseInt(credentials.apiId),
            credentials.apiHash,
            {
              connectionRetries: 5,
              useWSS: false,
              // Use default logger to avoid TypeScript errors
              baseLogger: undefined
            }
          );
          
          // Connect and check if session is valid
          console.log('Starting connection with saved session');
          await this.client.connect();
          console.log('Connected with saved session');
          
          // Verify if the connection is valid by trying to get account info
          try {
            const me = await this.client.getMe();
            console.log('Session successfully restored for user:', me);
            this.connected = true;
            this.initialized = true;
            this.lastConnected = new Date();
            
            // Notify about the successful auto-login
            this.events.emit('status_changed', {
              connected: true,
              message: 'Auto-logged in successfully',
            });
            
            return { connected: true, autoLogin: true };
          } catch (sessionError) {
            console.error('Session invalid, will need to reinitialize:', sessionError);
            // Fall through to reinitialize
            this.client = null;
          }
        } catch (sessionRestoreError) {
          console.error('Failed to restore session:', sessionRestoreError);
          // Fall through to reinitialize
          this.client = null;
        }
      }

      // If we reach here, we need to initialize from scratch
      console.log('Initializing new connection');
      await this.initialize({
        apiId: credentials.apiId,
        apiHash: credentials.apiHash,
        phoneNumber: credentials.phoneNumber,
      });
      return { connected: this.connected };
    }

    try {
      // Ping Telegram API to check connection
      const user = await this.client.getMe();
      this.connected = true;
      this.lastConnected = new Date();
      
      // Initialize the bot service if connected
      try {
        const { telegramBot } = await import('./telegramBotService');
        await telegramBot.initialize(this.client);
        console.log('Telegram bot initialized on refresh');
      } catch (botError: any) {
        console.error('Error initializing Telegram bot on refresh:', botError);
        // We continue even if bot initialization fails
      }
      
      return { connected: true, user };
    } catch (error: any) {
      console.error('Error refreshing Telegram connection:', error);
      this.connected = false;
      return { connected: false, error: error.message };
    }
  }

  /**
   * Logout from Telegram
   */
  async logout() {
    if (!this.client) {
      throw new Error('Telegram client not initialized');
    }

    try {
      await this.client.invoke(new Api.auth.LogOut());
      this.connected = false;
      this.initialized = false;
      this.client = null;

      // Update storage
      await storage.saveTelegramCredentials({
        sessionString: '',
        isActive: false,
      });
      await storage.updateActiveConnections(0);

      return { success: true };
    } catch (error: any) {
      console.error('Error logging out from Telegram:', error);
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  /**
   * Get current connection status
   */
  async getConnectionStatus() {
    if (!this.client) {
      const credentials = await storage.getTelegramCredentials();
      return {
        connected: false,
        lastChecked: this.lastConnected ? formatDate(this.lastConnected) : 'Never',
        apiId: credentials?.apiId ? hideApiId(credentials.apiId) : '',
        phoneNumber: credentials?.phoneNumber ? hidePhoneNumber(credentials.phoneNumber) : '',
        sessionStatus: 'Not connected',
      };
    }

    try {
      // Check if connected
      const isConnected = this.client.connected;
      
      if (isConnected) {
        const me = await this.client.getMe();
        const lastChecked = new Date();
        this.lastConnected = lastChecked;
        
        // Get session info
        const credentials = await storage.getTelegramCredentials();
        let sessionStatus = 'Active';
        
        // Calculate session age if possible
        if (credentials?.updatedAt) {
          const sessionAge = Math.floor((new Date().getTime() - credentials.updatedAt.getTime()) / (1000 * 60));
          sessionStatus = `Active (${formatSessionTime(sessionAge)})`;
        }
        
        return {
          connected: true,
          lastChecked: formatDate(lastChecked),
          apiId: credentials?.apiId ? hideApiId(credentials.apiId) : '',
          phoneNumber: credentials?.phoneNumber ? hidePhoneNumber(credentials.phoneNumber) : '',
          sessionStatus,
        };
      } else {
        return {
          connected: false,
          lastChecked: this.lastConnected ? formatDate(this.lastConnected) : 'Never',
          apiId: '',
          phoneNumber: '',
          sessionStatus: 'Disconnected',
        };
      }
    } catch (error: any) {
      console.error('Error getting Telegram connection status:', error);
      return {
        connected: false,
        lastChecked: this.lastConnected ? formatDate(this.lastConnected) : 'Never',
        apiId: '',
        phoneNumber: '',
        sessionStatus: 'Error: ' + error.message,
      };
    }
  }

  /**
   * Send a file to Telegram
   * @param chatId The chat ID to send the file to
   * @param options The file options (file path or buffer, and caption)
   */
  async sendFile(
    chatId: string | number, 
    options: { 
      file: string | Buffer, 
      caption?: string,
      fileName?: string,
      formatData?: {
        username?: string;
        firstName?: string;
        lastName?: string;
        groupName?: string;
      }
    }
  ): Promise<{ messageId: string }> {
    if (!this.client || !this.connected) {
      throw new Error('Telegram client not connected');
    }

    try {
      // Get bot config to use default filename/caption formats if not provided
      const storage = (await import('../storage')).storage;
      const botConfig = await storage.getBotConfig();
      
      // Format caption if provided
      let caption = options.caption || '';
      if (caption && options.formatData) {
        caption = formatTemplate(caption, options.formatData);
      }
      
      // Format filename if provided
      let fileName = options.fileName;
      if (fileName && options.formatData) {
        fileName = formatTemplate(fileName, options.formatData);
      }
      
      // Prepare the upload options (we'll use a separate object so we can conditionally add properties)
      const uploadOptions: any = {
        file: options.file,
        caption: caption,
        progressCallback: (progress: number) => {
          console.log(`Upload progress: ${progress}%`);
          this.events.emit('uploadProgress', progress);
        },
      };
      
      // Some Telegram clients support the fileName parameter, but it's not standard in all API implementations
      // Let's use it if the API supports it, but we need to handle it carefully
      if (fileName) {
        try {
          // Check if the API supports fileName (we'll use try-catch in case it doesn't)
          uploadOptions.fileName = fileName;
        } catch (error) {
          console.warn('API does not support fileName parameter:', error);
          // Just continue without the fileName parameter
        }
      }
      
      // Send the file with the prepared options
      const result = await this.client.sendFile(chatId, uploadOptions);
      
      // Update statistics
      await storage.incrementFilesSent();

      return { messageId: result.id.toString() };
    } catch (error: any) {
      console.error('Error sending file to Telegram:', error);
      throw new Error(`Failed to send file: ${error.message}`);
    }
  }

  /**
   * Subscribe to upload progress events
   */
  onUploadProgress(callback: (progress: number) => void) {
    this.events.on('uploadProgress', callback);
    return () => this.events.off('uploadProgress', callback);
  }

  /**
   * Check if the client is connected
   */
  isConnected(): boolean {
    return this.connected && (this.client?.connected || false);
  }
  
  /**
   * Fetch all dialogs (chats, groups, channels) that the user is part of
   * @returns Array of Telegram groups/chats
   */
  async getGroups() {
    if (!this.client || !this.connected) {
      throw new Error('Telegram client not connected');
    }

    try {
      console.log('Fetching dialogs from Telegram...');
      const dialogs = await this.client.getDialogs({});
      
      // Filter for groups and channels
      const groups = dialogs.filter(dialog => {
        const entity = dialog.entity;
        // Check if it's a group or channel, not a private chat
        return (
          entity.className === 'Channel' || 
          entity.className === 'Chat' ||
          entity.className === 'ChatForbidden' ||
          entity.className === 'ChannelForbidden'
        );
      });
      
      // Map to our internal format
      return groups.map(dialog => {
        const entity = dialog.entity;
        let groupType = 'unknown';
        let memberCount = 0;
        let groupName = 'Unnamed Group';
        let groupId = dialog.id.toString();
        
        // Extract group name
        if ('title' in entity) {
          groupName = entity.title || 'Unnamed Group';
        }
        
        // Determine group type and try to get member count
        if (entity.className === 'Channel') {
          groupType = 'channel';
          if ('participantsCount' in entity) {
            memberCount = entity.participantsCount || 0;
          }
        } else if (entity.className === 'Chat') {
          groupType = 'group';
          if ('participantsCount' in entity) {
            memberCount = entity.participantsCount || 0;
          }
        }
        
        return {
          groupId,
          groupName,
          groupType,
          memberCount,
          isActive: true,
          lastUpdated: new Date().toISOString(),
        };
      });
    } catch (error: any) {
      console.error('Error fetching Telegram groups:', error);
      throw new Error(`Failed to fetch groups: ${error.message}`);
    }
  }
  
  /**
   * Fetch members of a specific group
   * @param groupId The Telegram group ID
   * @returns Array of group members
   */
  async getGroupMembers(groupId: string) {
    if (!this.client || !this.connected) {
      throw new Error('Telegram client not connected');
    }

    try {
      console.log(`Fetching members for group ${groupId}...`);
      
      // First, get the entity for this chat ID
      const entity = await this.client.getEntity(groupId);
      
      // Then get participants
      const participants = await this.client.getParticipants(entity);
      
      // Map to our internal format
      return participants.map(participant => {
        let username = null;
        let firstName = null;
        let lastName = null;
        let isAdmin = false;
        let isBot = false;
        
        // Extract user details
        if ('username' in participant) {
          username = participant.username || null;
        }
        
        if ('firstName' in participant) {
          firstName = participant.firstName || null;
        }
        
        if ('lastName' in participant) {
          lastName = participant.lastName || null;
        }
        
        // Check if admin
        if ('admin_rights' in participant) {
          isAdmin = true;
        } else if (participant.className === 'ChannelParticipantAdmin') {
          isAdmin = true;
        } else if (participant.className === 'ChannelParticipantCreator') {
          isAdmin = true;
        }
        
        // Check if bot
        if ('bot' in participant) {
          isBot = !!participant.bot;
        }
        
        return {
          userId: participant.id.toString(),
          username,
          firstName,
          lastName,
          isAdmin,
          isBot,
          groupId,
          lastSeen: null,
          createdAt: new Date().toISOString()
        };
      });
    } catch (error: any) {
      console.error(`Error fetching members for group ${groupId}:`, error);
      throw new Error(`Failed to fetch group members: ${error.message}`);
    }
  }
}

// Helper formatting functions
function formatDate(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function hideApiId(apiId: string): string {
  if (apiId.length <= 4) return apiId;
  return '•••••••••••' + apiId.slice(-4);
}

function hidePhoneNumber(phoneNumber: string): string {
  if (phoneNumber.length <= 4) return phoneNumber;
  const last2 = phoneNumber.slice(-2);
  const prefix = phoneNumber.slice(0, 3);
  return `${prefix} (•••) •••-••${last2}`;
}

function formatSessionTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format a template string by replacing placeholders with actual values
 * Supports placeholders: {username}, {date}, {time}, {first_name}, {last_name}, {group_name}
 */
export function formatTemplate(template: string, data: {
  username?: string;
  firstName?: string;
  lastName?: string;
  groupName?: string;
} = {}): string {
  const now = new Date();
  
  // Format date as YYYY-MM-DD
  const date = now.toISOString().split('T')[0];
  
  // Format time as HH:MM
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const time = `${hours}:${minutes}`;

  // Create a formatted date-time string for filenames (replacing colons with hyphens)
  const filenameFriendlyTime = `${hours}-${minutes}`;
  
  // Make sure we have safe defaults for all template variables
  const safeUsername = data.username || 'user';
  const safeFirstName = data.firstName || 'User';
  const safeLastName = data.lastName || '';
  const safeGroupName = data.groupName || 'Group';
  
  // Log what's being formatted for debugging
  console.log(`Formatting template: ${template}`);
  console.log(`With data:`, {
    username: safeUsername,
    firstName: safeFirstName,
    lastName: safeLastName,
    groupName: safeGroupName,
    date,
    time
  });

  // Replace placeholders with values
  return template
    .replace(/{username}/g, safeUsername)
    .replace(/{first_name}/g, safeFirstName)
    .replace(/{last_name}/g, safeLastName)
    .replace(/{group_name}/g, safeGroupName)
    .replace(/{date}/g, date)
    .replace(/{time}/g, filenameFriendlyTime);
}

// Create and export singleton instance
export const telegramClient = new TelegramClientService();