import path from 'path';
import fs from 'fs';
import { createReadStream, createWriteStream } from 'fs';
import { exec } from 'child_process';
import { EventEmitter } from 'events';
import { promisify } from 'util';
import { storage } from '../storage';
import { ImageEditConfig } from '@shared/schema';

const execAsync = promisify(exec);

interface ImageModification {
  type: 'resize' | 'rotate' | 'flip' | 'blur' | 'grayscale' | 'sepia' | 'brightness' | 'contrast' | 'noise' 
      | 'vignette' | 'sharpen' | 'colorBalance' | 'grain' | 'filter' | 'targetResize';
  value?: number | string | { width: number, height: number } | { r: number, g: number, b: number };
}

interface MetadataSet {
  device: string;
  camera: string;
  dateTime: string;
  focalLength: string;
  gpsCoordinates?: string;
  exposure: string;
}

/**
 * Service for modifying images from source folders
 */
class ImageModifierService {
  private sourceImagesDir: string = path.join(process.cwd(), 'Source Images');
  private tempExtractionDir: string = path.join(process.cwd(), 'Temp Extraction');
  private processedImagesDir: string = path.join(process.cwd(), 'Processed Images');
  private progressEmitters: Map<string, EventEmitter> = new Map();
  private folderMetadataMap: Map<string, MetadataSet> = new Map();
  
  // Sample data for randomization
  private deviceModels: string[] = [
    'iPhone 12 Pro', 'iPhone 13', 'iPhone 14 Pro Max', 'iPhone 11',
    'Samsung Galaxy S21', 'Samsung Galaxy S22 Ultra', 'Google Pixel 6',
    'Sony Xperia 1 III', 'OnePlus 9 Pro', 'Xiaomi Mi 11'
  ];
  
  private cameraModels: string[] = [
    'Apple iPhone Camera', 'Samsung ISOCELL', 'Sony IMX766', 'Sony IMX586',
    'HMX Sensor', 'OV64B', 'GN5 Sensor', 'IMX707', 'OV50A', 'JN1 Sensor'
  ];
  
  constructor() {
    this.ensureDirectories();
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
   * Extract a zip file to the temp directory
   */
  private async extractZipFile(zipPath: string, destinationDir: string): Promise<string> {
    const uniqueDir = path.join(destinationDir, `extract_${Date.now()}`);
    
    if (!fs.existsSync(uniqueDir)) {
      fs.mkdirSync(uniqueDir, { recursive: true });
    }
    
    await execAsync(`unzip -q "${zipPath}" -d "${uniqueDir}"`);
    
    return uniqueDir;
  }
  
  /**
   * Find all source zip files
   */
  private getSourceZipFiles(): string[] {
    if (!fs.existsSync(this.sourceImagesDir)) return [];
    
    return fs.readdirSync(this.sourceImagesDir)
      .filter(file => file.toLowerCase().endsWith('.zip'))
      .map(file => path.join(this.sourceImagesDir, file));
  }
  
  /**
   * Find parent folders containing images in an extraction directory
   */
  private findParentFolderPaths(extractionDir: string): string[] {
    const parentFolders: string[] = [];
    
    // Function to recursively search for image files
    const searchForImageFolders = (dir: string, depth: number = 0) => {
      if (depth > 3) return; // Limit recursion depth
      
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      // Check if current folder contains images
      const hasImages = entries.some(entry => 
        entry.isFile() && /\.(jpg|jpeg|png|gif|webp)$/i.test(entry.name)
      );
      
      if (hasImages) {
        parentFolders.push(dir);
        return;
      }
      
      // Check subfolders
      for (const entry of entries) {
        if (entry.isDirectory()) {
          searchForImageFolders(path.join(dir, entry.name), depth + 1);
        }
      }
    };
    
    searchForImageFolders(extractionDir);
    return parentFolders;
  }
  
  /**
   * Process images from source zip files
   * 
   * @param requestId Unique ID for this request
   * @param numberOfFolders Optional number of parent folders to select (defaults to using botConfig)
   * @returns Path to the output zip file
   */
  async processImages(requestId: string, numberOfFolders?: number): Promise<string> {
    const emitter = new EventEmitter();
    this.progressEmitters.set(requestId, emitter);
    
    try {
      // Clear the folder metadata map to ensure fresh metadata for each request
      this.folderMetadataMap.clear();
      
      // Get bot config for number of folders to process if not specified
      if (numberOfFolders === undefined) {
        const botConfig = await storage.getBotConfig();
        numberOfFolders = botConfig.imagesToSend;
      }
      
      // Create a results directory
      const resultDir = path.join(this.processedImagesDir, `result_${requestId}`);
      if (!fs.existsSync(resultDir)) {
        fs.mkdirSync(resultDir, { recursive: true });
      }
      
      // Track progress
      let progress = 0;
      const updateProgress = (increment: number) => {
        progress += increment;
        emitter.emit('progress', { progress, message: `Processing: ${progress}% complete` });
      };
      
      // Get source zip files
      const sourceZipFiles = this.getSourceZipFiles();
      if (sourceZipFiles.length === 0) {
        throw new Error('No source zip files found');
      }
      
      // Update total source files count in statistics
      await storage.updateTotalSourceFiles(sourceZipFiles.length);
      
      emitter.emit('progress', { progress: 0, message: 'Extracting source files...' });
      
      // Extract all zip files
      const extractedDirs: string[] = [];
      for (const zipFile of sourceZipFiles) {
        extractedDirs.push(await this.extractZipFile(zipFile, this.tempExtractionDir));
      }
      
      updateProgress(20);
      emitter.emit('progress', { progress, message: 'Finding image folders...' });
      
      // Find all parent folders with images
      let allParentFolders: string[] = [];
      for (const extractedDir of extractedDirs) {
        allParentFolders = [
          ...allParentFolders,
          ...this.findParentFolderPaths(extractedDir)
        ];
      }
      
      if (allParentFolders.length === 0) {
        throw new Error('No folders with images found in the source files');
      }
      
      // Randomly select folders
      const selectedFolders = this.randomlySelectItems(allParentFolders, numberOfFolders);
      
      updateProgress(10);
      emitter.emit('progress', { progress, message: 'Modifying images...' });
      
      // Process the selected folders
      let folderIndex = 0;
      let totalImagesProcessed = 0; // Track total images processed
      
      for (const folder of selectedFolders) {
        // Create a subfolder for each parent folder
        const folderName = path.basename(folder);
        const outputFolder = path.join(resultDir, folderName);
        
        if (!fs.existsSync(outputFolder)) {
          fs.mkdirSync(outputFolder, { recursive: true });
        }
        
        // Get all images in the folder
        const images = fs.readdirSync(folder)
          .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
          .map(file => path.join(folder, file));
        
        // Apply random modifications to each image
        for (const imagePath of images) {
          const outputPath = path.join(outputFolder, path.basename(imagePath));
          await this.modifyImage(imagePath, outputPath);
          totalImagesProcessed++; // Increment processed image count
        }
        
        // Update progress (70% divided among all folders)
        updateProgress(70 / selectedFolders.length);
        folderIndex++;
      }
      
      // Update the statistics for images processed
      if (totalImagesProcessed > 0) {
        await storage.incrementImagesProcessed(totalImagesProcessed);
      }
      
      // Create zip file with the modified images
      const outputZipPath = path.join(this.processedImagesDir, `processed_${requestId}.zip`);
      await execAsync(`cd "${resultDir}" && zip -r "${outputZipPath}" ./*`);
      
      // Clean up
      for (const dir of extractedDirs) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
      fs.rmSync(resultDir, { recursive: true, force: true });
      
      updateProgress(100 - progress); // Ensure we reach 100%
      emitter.emit('complete', { outputZipPath });
      
      return outputZipPath;
    } catch (error) {
      emitter.emit('error', error);
      throw error;
    } finally {
      // Give some time for event listeners before removing the emitter
      setTimeout(() => {
        this.progressEmitters.delete(requestId);
      }, 60000);
    }
  }
  
  /**
   * Get progress emitter for a specific request
   */
  getProgressEmitter(requestId: string): EventEmitter | undefined {
    return this.progressEmitters.get(requestId);
  }
  
  /**
   * Modify an image with random effects and add metadata
   */
  private async modifyImage(inputPath: string, outputPath: string): Promise<void> {
    try {
      // Validate the image before processing
      if (!await this.validateImage(inputPath)) {
        console.warn(`Skipping invalid or corrupted image: ${inputPath}`);
        // Copy the original file instead of processing it
        fs.copyFileSync(inputPath, outputPath);
        return;
      }

      // Find or generate metadata for the parent folder
      const parentFolder = path.dirname(inputPath);
      const config = await storage.getImageEditConfig();
      let metadata: MetadataSet | undefined;
      
      // Check if we should add metadata
      if (config.enableRandomMetadata) {
        // Use consistent metadata within folder if enabled
        if (config.useConsistentMetadataPerFolder && this.folderMetadataMap.has(parentFolder)) {
          metadata = this.folderMetadataMap.get(parentFolder);
        } else {
          // Generate new metadata
          metadata = await this.generateMetadataForFolder();
          // Store for consistent use within folder
          if (config.useConsistentMetadataPerFolder) {
            this.folderMetadataMap.set(parentFolder, metadata);
          }
        }
      }
      
      // Generate random modifications
      const modifications = await this.getRandomModifications();
      let imagemagickCommand = `convert "${inputPath}"`;
      
      // Apply each modification
      let hasNoise = false;
      let hasTargetResize = false; // Keep track of whether we've applied a target resize
      
      for (const mod of modifications) {
        switch (mod.type) {
          case 'resize':
            imagemagickCommand += ` -resize ${mod.value}%`;
            break;
          case 'targetResize':
            // This is a fixed size resize using our new config
            hasTargetResize = true;
            const sizeObj = mod.value as { width: number, height: number };
            imagemagickCommand += ` -resize ${sizeObj.width}x${sizeObj.height}`;
            break;
          case 'rotate':
            imagemagickCommand += ` -rotate ${mod.value}`;
            break;
          case 'flip':
            imagemagickCommand += ` -flip`;
            break;
          case 'blur':
            imagemagickCommand += ` -blur 0x${mod.value}`;
            break;
          case 'grayscale':
            imagemagickCommand += ` -grayscale Rec709Luminance`;
            break;
          case 'sepia':
            imagemagickCommand += ` -sepia-tone ${mod.value}%`;
            break;
          case 'brightness':
            imagemagickCommand += ` -brightness-contrast ${mod.value}x0`;
            break;
          case 'contrast':
            imagemagickCommand += ` -brightness-contrast 0x${mod.value}`;
            break;
          case 'noise':
            // Keep track if we're adding noise effect
            hasNoise = true;
            // Use a much lower intensity to prevent excessive noise
            const safeNoiseValue = Math.min(mod.value as number || 3, 3); // Cap noise at 3 maximum
            imagemagickCommand += ` +noise Random -attenuate ${safeNoiseValue}`;
            break;
          case 'vignette':
            // Apply vignette effect (darkened edges)
            const vignetteValue = mod.value as number;
            imagemagickCommand += ` -vignette 0x${vignetteValue}`;
            break;
          case 'sharpen':
            // Apply sharpening
            const sharpenValue = mod.value as number;
            imagemagickCommand += ` -sharpen 0x${sharpenValue}`;
            break;
          case 'colorBalance':
            // Apply color balance adjustments to R, G, B channels
            const colorValues = mod.value as { r: number, g: number, b: number };
            // Use color matrix to adjust RGB values
            imagemagickCommand += ` -recolor "1.0 0 0 ${colorValues.r/100} 0 1.0 0 ${colorValues.g/100} 0 0 1.0 ${colorValues.b/100}"`;
            break;
          case 'grain':
            // Apply film grain effect
            const grainIntensity = mod.value as number;
            // Combine noise with contrast to create film-like grain
            imagemagickCommand += ` +noise Gaussian -attenuate ${grainIntensity/10}`;
            break;
          case 'filter':
            // Apply named filter
            const filterName = mod.value as string;
            switch (filterName) {
              case 'vintage':
                // Yellow-ish tint with slight contrast
                imagemagickCommand += ` -sepia-tone 20% -brightness-contrast 0x10 -modulate 100,80,100`;
                break;
              case 'warmth':
                // Warm tones (more yellow/orange)
                imagemagickCommand += ` -modulate 100,110,85`;
                break;
              case 'clarity':
                // More contrast and sharpness
                imagemagickCommand += ` -sharpen 0x1.5 -brightness-contrast 0x20`;
                break;
              case 'coolness':
                // Blue-ish tint
                imagemagickCommand += ` -modulate 100,90,110`;
                break;
              case 'vibrance':
                // Increased saturation without going overboard
                imagemagickCommand += ` -modulate 100,120,100`;
                break;
            }
            break;
        }
      }
      
      // If no target resize was applied but config requires fixed aspect ratio,
      // add a resize modification to maintain the aspect ratio
      if (!hasTargetResize && config.enableFixedAspectRatio) {
        // Parse the aspect ratio (e.g., "4:3") and apply as a constraint
        const [width, height] = config.fixedAspectRatio.split(':').map(Number);
        if (width && height) {
          // Use the ! flag to force the exact aspect ratio
          imagemagickCommand += ` -resize ${width}x${height}!`;
        }
      }
      
      imagemagickCommand += ` "${outputPath}"`;
      
      // Execute the ImageMagick command
      await execAsync(imagemagickCommand);
      
      // For images with noise effect, validate the output to ensure it's not corrupted
      if (hasNoise) {
        if (!await this.validateImage(outputPath)) {
          console.warn(`Generated image has excessive noise, reverting to original: ${outputPath}`);
          fs.copyFileSync(inputPath, outputPath);
          return;
        }
      }
      
      // Apply metadata if enabled
      if (config.enableRandomMetadata && metadata) {
        await this.applyMetadata(outputPath, metadata);
      }
    } catch (error) {
      console.error(`Error modifying image ${inputPath}:`, error);
      // If modification fails, copy the original file
      fs.copyFileSync(inputPath, outputPath);
    }
  }
  
  /**
   * Validate an image file to ensure it's not corrupted or excessive noise
   * @param imagePath Path to the image file
   * @returns Boolean indicating if the image is valid
   */
  private async validateImage(imagePath: string): Promise<boolean> {
    try {
      // First check if file exists and is readable
      if (!fs.existsSync(imagePath)) {
        console.warn(`Image file not found: ${imagePath}`);
        return false;
      }

      // Use ImageMagick to get image statistics
      const statsCommand = `convert "${imagePath}" -format "%[entropy],%[kurtosis],%[standard-deviation]" info:`;
      const { stdout } = await execAsync(statsCommand);
      
      if (!stdout || stdout.trim() === '') {
        console.warn(`Failed to get image statistics for: ${imagePath}`);
        return false;
      }
      
      const stats = stdout.trim().split(',');
      if (stats.length !== 3) {
        console.warn(`Invalid image statistics format for: ${imagePath}`);
        return false;
      }
      
      const entropy = parseFloat(stats[0]);
      const kurtosis = parseFloat(stats[1]);
      const stdDev = parseFloat(stats[2]);
      
      // Check for NaN values
      if (isNaN(entropy) || isNaN(kurtosis) || isNaN(stdDev)) {
        console.warn(`Invalid image statistics values for: ${imagePath}`);
        return false;
      }
      
      // Calculate image quality metrics
      // Excessive noise often has very high entropy and low kurtosis
      // A perfectly random noise image has very high entropy (close to 1)
      if (entropy > 0.95) {
        console.warn(`High entropy detected (${entropy}), likely corrupted or noise image: ${imagePath}`);
        return false;
      }
      
      // Entirely black or white images have very low standard deviation
      if (stdDev < 0.01) {
        console.warn(`Low standard deviation (${stdDev}), likely blank or solid color image: ${imagePath}`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Error validating image ${imagePath}:`, error);
      // If we can't validate, assume it's valid to avoid losing potentially good images
      return true;
    }
  }
  
  /**
   * Generate random image modifications based on configuration
   */
  private async getRandomModifications(): Promise<ImageModification[]> {
    const config = await storage.getImageEditConfig();
    const modifications: ImageModification[] = [];
    
    // Increase number of modifications to include more advanced effects
    const numberOfMods = this.getRandomInt(2, 4); // Apply 2-4 random modifications
    
    const possibleMods: ImageModification[] = [];
    
    // Always add resize - either percentage-based or target dimensions
    if (config.enableFixedAspectRatio || Math.random() > 0.7) {
      // Target resize with specific dimensions
      const width = this.getRandomInt(config.targetWidthMin, config.targetWidthMax);
      const height = this.getRandomInt(config.targetHeightMin, config.targetHeightMax);
      possibleMods.push({ 
        type: 'targetResize', 
        value: { width, height } 
      });
    } else {
      // Percentage-based resize
      possibleMods.push({ 
        type: 'resize', 
        value: this.getRandomInt(80, 100) 
      });
    }
    
    // Add rotation if enabled in config
    if (config.enableRotation) {
      possibleMods.push({ 
        type: 'rotate', 
        value: this.getRandomInt(config.rotationMin, config.rotationMax) 
      });
    }
    
    // Maybe flip (30% chance)
    if (Math.random() > 0.7) {
      possibleMods.push({ type: 'flip' });
    }
    
    // Add blur based on config 
    if (config.blurMax > 0) {
      possibleMods.push({ 
        type: 'blur', 
        value: this.getRandomInt(config.blurMin, config.blurMax) 
      });
    }
    
    // Add vignette based on config (darkened edges) - 30% chance if enabled
    if (config.enableVignette && Math.random() > 0.7) {
      possibleMods.push({ 
        type: 'vignette', 
        value: this.getRandomInt(config.vignetteIntensityMin, config.vignetteIntensityMax) 
      });
    }
    
    // Add sharpening based on config - 40% chance if enabled
    if (config.enableSharpen && Math.random() > 0.6) {
      possibleMods.push({ 
        type: 'sharpen', 
        value: this.getRandomInt(config.sharpenIntensityMin, config.sharpenIntensityMax) 
      });
    }
    
    // Add color balance adjustments - 30% chance if enabled
    if (config.enableColorBalance && Math.random() > 0.7) {
      possibleMods.push({ 
        type: 'colorBalance', 
        value: {
          r: this.getRandomInt(config.colorBalanceRMin, config.colorBalanceRMax),
          g: this.getRandomInt(config.colorBalanceGMin, config.colorBalanceGMax),
          b: this.getRandomInt(config.colorBalanceBMin, config.colorBalanceBMax)
        }
      });
    }
    
    // Add film grain effect - 25% chance if enabled
    if (config.enableGrain && Math.random() > 0.75) {
      possibleMods.push({ 
        type: 'grain', 
        value: this.getRandomInt(config.grainIntensityMin, config.grainIntensityMax) 
      });
    }
    
    // Apply named filters - 20% chance if enabled
    if (config.enableFilters && config.allowedFilters.length > 0 && Math.random() > 0.8) {
      // Pick a random filter from the allowed list
      const filterIndex = this.getRandomInt(0, config.allowedFilters.length - 1);
      possibleMods.push({
        type: 'filter',
        value: config.allowedFilters[filterIndex]
      });
    }
    
    // Maybe grayscale (10% chance)
    if (Math.random() > 0.9) {
      possibleMods.push({ type: 'grayscale' });
    }
    
    // Maybe sepia (10% chance)
    if (Math.random() > 0.9) {
      possibleMods.push({ 
        type: 'sepia', 
        value: this.getRandomInt(20, 60) 
      });
    }
    
    // Add brightness based on config
    possibleMods.push({ 
      type: 'brightness', 
      value: this.getRandomInt(config.brightnessMin, config.brightnessMax) 
    });
    
    // Add contrast based on config
    possibleMods.push({ 
      type: 'contrast', 
      value: this.getRandomInt(config.contrastMin, config.contrastMax) 
    });
    
    // Add noise based on config
    // Only 5% chance of adding noise to reduce problematic images
    if (config.noiseMax > 0 && Math.random() > 0.95) {
      possibleMods.push({ 
        type: 'noise', 
        // Reduce max noise value to prevent excessive noise
        value: this.getRandomInt(config.noiseMin, Math.min(config.noiseMax, 3)) 
      });
    }
    
    // Randomly select modifications
    const selectedIndices = new Set<number>();
    while (selectedIndices.size < numberOfMods && selectedIndices.size < possibleMods.length) {
      selectedIndices.add(this.getRandomInt(0, possibleMods.length - 1));
    }
    
    // Convert Set to Array for iteration
    Array.from(selectedIndices).forEach(index => {
      modifications.push(possibleMods[index]);
    });
    
    return modifications;
  }
  
  /**
   * Randomly select items from an array
   */
  private randomlySelectItems<T>(items: T[], count: number): T[] {
    if (items.length <= count) return [...items];
    
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled.slice(0, count);
  }
  
  /**
   * Get a random integer between min and max (inclusive)
   */
  private getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  /**
   * Generate a random metadata set for a folder
   */
  private async generateMetadataForFolder(): Promise<MetadataSet> {
    const config = await storage.getImageEditConfig();
    const now = new Date();
    const randomPastDate = new Date(now.getTime() - this.getRandomInt(0, 365 * 2) * 24 * 60 * 60 * 1000);
    
    // Format date as "YYYY:MM:DD HH:MM:SS"
    const dateStr = randomPastDate.toISOString()
      .replace('T', ' ')
      .replace(/\.\d+Z$/, '');
    
    // Generate random metadata
    return {
      device: config.randomizeDevice ? this.deviceModels[this.getRandomInt(0, this.deviceModels.length - 1)] : 'Unknown Device',
      camera: config.randomizeCamera ? this.cameraModels[this.getRandomInt(0, this.cameraModels.length - 1)] : 'Unknown Camera',
      dateTime: config.randomizeDateTime ? dateStr : now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ''),
      focalLength: config.randomizeFocalLength ? `${this.getRandomInt(24, 200) / 10}mm` : '35mm',
      gpsCoordinates: config.randomizeGPS ? `${this.getRandomInt(-90, 90)},${this.getRandomInt(-180, 180)}` : undefined,
      exposure: config.randomizeExposure ? `1/${this.getRandomInt(30, 4000)}` : '1/125'
    };
  }
  
  /**
   * Apply metadata to an image using exiftool
   */
  private async applyMetadata(filePath: string, metadata: MetadataSet): Promise<void> {
    try {
      // Build exiftool command with metadata
      let command = `exiftool -overwrite_original`;
      
      // Add each piece of metadata
      if (metadata.device) {
        command += ` -Make="${metadata.device.split(' ')[0]}" -Model="${metadata.device}"`;
      }
      
      if (metadata.camera) {
        command += ` -LensModel="${metadata.camera}"`;
      }
      
      if (metadata.dateTime) {
        command += ` -DateTimeOriginal="${metadata.dateTime}" -CreateDate="${metadata.dateTime}"`;
      }
      
      if (metadata.focalLength) {
        command += ` -FocalLength="${metadata.focalLength}"`;
      }
      
      if (metadata.gpsCoordinates) {
        const [lat, long] = metadata.gpsCoordinates.split(',');
        command += ` -GPSLatitude="${lat}" -GPSLongitude="${long}"`;
      }
      
      if (metadata.exposure) {
        command += ` -ExposureTime="${metadata.exposure}"`;
      }
      
      // Execute command
      command += ` "${filePath}"`;
      await execAsync(command);
    } catch (error) {
      console.error(`Error applying metadata to ${filePath}:`, error);
    }
  }
}

export const imageModifier = new ImageModifierService();