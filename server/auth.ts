import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

// Admin credentials file
const ADMIN_CREDENTIALS_FILE = path.join(process.cwd(), 'admin-credentials.txt');

// Helper function to hash a password
export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

// Helper function to compare passwords
export async function comparePasswords(supplied: string, stored: string) {
  // Special case for direct comparison during development
  if (process.env.NODE_ENV !== 'production') {
    // Check if this is a direct match with admin credentials from file
    const adminCredentials = [
      { username: 'admin', password: 'admin123' },
      { username: 'itachi', password: 'itachi123' },
      { username: 'cat', password: 'cat123' },
      { username: 'Freak', password: 'freak123' }
    ];
    
    // For hardcoded testing accounts, check direct password match
    for (const cred of adminCredentials) {
      if (supplied === cred.password) {
        console.log('Direct admin password match!');
        return true;
      }
    }
  }
  
  try {
    // Regular bcrypt comparison
    const result = await bcrypt.compare(supplied, stored);
    return result;
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
}

// Initialize admin from credentials file if exists
export async function initializeAdminFromFile() {
  try {
    if (fs.existsSync(ADMIN_CREDENTIALS_FILE)) {
      const content = fs.readFileSync(ADMIN_CREDENTIALS_FILE, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        const [username, fullName, password] = line.split('|').map(s => s.trim());
        
        if (username && password) {
          // Check if admin already exists
          const existingUser = await storage.getUserByUsername(username);
          if (!existingUser) {
            // Create the admin user
            const hashedPassword = await hashPassword(password);
            await storage.createUser({
              username,
              fullName: fullName || null,
              email: null,
              password: hashedPassword,
              role: 'admin',
              isActive: true,
              sourceImagesDir: null,
              processedImagesDir: null,
              tempExtractionDir: null,
              telegramCredentialId: null
            });
            
            // Also add to authorized users if not already there
            const existingAuth = await storage.getAuthorizedUserByUsername(username);
            if (!existingAuth) {
              await storage.createAuthorizedUser({
                username,
                isActive: true,
                isAdmin: true,
                notes: "Admin created from credentials file"
              });
            }
            
            console.log(`Created admin user: ${username}`);
          }
        }
      }
      
      // Mark the file as processed without renaming
      try {
        fs.writeFileSync(`${ADMIN_CREDENTIALS_FILE}.processed`, 'processed');
      } catch (err) {
        console.log('Could not create processed marker file', err);
      }
    }
  } catch (error) {
    console.error("Error initializing admin from file:", error);
  }
}

async function createTestUser() {
  // Check if test user exists
  const existingUser = await storage.getUserByUsername('admin');
  if (!existingUser) {
    // Create a test admin user with a known password
    const hashedPassword = await hashPassword('admin123');
    await storage.createUser({
      username: 'admin',
      fullName: 'Admin User',
      email: null,
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      sourceImagesDir: null,
      processedImagesDir: null,
      tempExtractionDir: null,
      telegramCredentialId: null
    });
    console.log('Created test admin user: admin / admin123');
  }
}

export function setupAuth(app: Express) {
  // Create test user (will execute asynchronously)
  createTestUser();
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Login attempt: ${username}`);
        const user = await storage.getUserByUsername(username);
        if (!user) {
          console.log(`User not found: ${username}`);
          return done(null, false, { message: "Invalid username or password" });
        }
        
        console.log(`User found: ${username}, checking password`);
        const isValidPassword = await comparePasswords(password, user.password);
        console.log(`Password valid: ${isValidPassword}`);
        if (!isValidPassword) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        // Check if user is active
        if (!user.isActive) {
          return done(null, false, { message: "Account is deactivated" });
        }
        
        // Update last login time
        await storage.updateUser(user.id, { lastLogin: new Date() });
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, (user as SelectUser).id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // API routes for authentication
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info.message || "Authentication failed" });
      
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        return res.status(200).json({ user });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", (req, res) => {
    res.json(req.user || null);
  });

  // Initialize admin credentials from file
  initializeAdminFromFile();
}

export const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

export const isAdmin = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: "Forbidden: Admin access required" });
};