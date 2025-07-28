import type { Express, Request } from "express";
import express from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { insertSoundClipSchema, insertTriggerWordSchema, insertSettingsSchema } from "@shared/schema";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = /\.(mp3|wav|ogg|webm|json)$/i;
    const allowedMimeTypes = [
      'audio/mpeg', 
      'audio/wav', 
      'audio/wave', 
      'audio/x-wav', 
      'audio/ogg', 
      'audio/webm',
      'application/json',
      'text/plain'
    ];
    
    if (allowedTypes.test(file.originalname) || allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only MP3, WAV, OGG, WebM audio files and JSON profile files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files
  app.use("/uploads", express.static(uploadDir));

  // Get all sound clips
  app.get("/api/sound-clips", async (req, res) => {
    try {
      const soundClips = await storage.getSoundClips();
      res.json(soundClips);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sound clips" });
    }
  });

  // Upload sound clip
  app.post("/api/sound-clips", upload.single("audio"), async (req: Request & { file?: Express.Multer.File }, res) => {
    try {
      console.log("Upload request received");
      console.log("Request file:", req.file);
      console.log("Request body:", req.body);
      console.log("Request headers:", req.headers);
      
      if (!req.file) {
        console.log("No file found in request");
        return res.status(400).json({ message: "No audio file provided" });
      }

      const { originalname, filename, size, mimetype } = req.file;
      let format = path.extname(originalname).toLowerCase().substring(1);
      
      // Handle WebM files that might not have proper extension
      if (!format && mimetype === 'audio/webm') {
        format = 'webm';
      }
      
      const name = req.body.name || path.basename(originalname, path.extname(originalname));

      // Get audio duration (simplified - in real app would use audio processing library)
      const duration = parseFloat(req.body.duration) || 0;

      const soundClipData = {
        name,
        filename,
        format,
        duration,
        size,
        url: `/uploads/${filename}`,
      };

      const validatedData = insertSoundClipSchema.parse(soundClipData);
      const soundClip = await storage.createSoundClip(validatedData);
      
      res.status(201).json(soundClip);
    } catch (error) {
      console.error("Error uploading sound clip:", error);
      res.status(500).json({ message: "Failed to upload sound clip" });
    }
  });

  // Delete sound clip
  app.delete("/api/sound-clips/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const soundClip = await storage.getSoundClip(id);
      
      if (!soundClip) {
        return res.status(404).json({ message: "Sound clip not found" });
      }

      // Delete file from disk
      const filePath = path.join(uploadDir, soundClip.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted file: ${filePath}`);
      }

      await storage.deleteSoundClip(id);
      console.log(`Deleted sound clip from database: ${id}`);
      res.json({ message: "Sound clip deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete sound clip" });
    }
  });

  // Get all trigger words
  app.get("/api/trigger-words", async (req, res) => {
    try {
      const triggerWords = await storage.getTriggerWords();
      res.json(triggerWords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trigger words" });
    }
  });

  // Create trigger word
  app.post("/api/trigger-words", async (req, res) => {
    try {
      console.log("Trigger word creation request body:", req.body);
      console.log("insertTriggerWordSchema:", insertTriggerWordSchema);
      
      const validatedData = insertTriggerWordSchema.parse(req.body);
      console.log("Validated data:", validatedData);
      
      const triggerWord = await storage.createTriggerWord(validatedData);
      console.log("Created trigger word:", triggerWord);
      
      res.status(201).json(triggerWord);
    } catch (error) {
      console.error("Error creating trigger word:", error);
      console.error("Request body:", req.body);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      res.status(400).json({ message: "Failed to create trigger word", error: error.message || String(error) });
    }
  });

  // Update trigger word
  app.patch("/api/trigger-words/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertTriggerWordSchema.partial().parse(req.body);
      const triggerWord = await storage.updateTriggerWord(id, updates);
      
      if (!triggerWord) {
        return res.status(404).json({ message: "Trigger word not found" });
      }
      
      res.json(triggerWord);
    } catch (error) {
      res.status(400).json({ message: "Invalid update data" });
    }
  });

  // Delete trigger word
  app.delete("/api/trigger-words/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTriggerWord(id);
      res.json({ message: "Trigger word deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete trigger word" });
    }
  });

  // Get settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // Update settings
  app.patch("/api/settings", async (req, res) => {
    try {
      const updates = insertSettingsSchema.partial().parse(req.body);
      const settings = await storage.updateSettings(updates);
      res.json(settings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(400).json({ message: "Invalid settings data" });
    }
  });

  // Get next default response sound clip ID
  app.get("/api/settings/next-default-response", async (req, res) => {
    try {
      const soundClipId = await storage.getNextDefaultResponse();
      res.json({ soundClipId });
    } catch (error) {
      console.error("Error getting next default response:", error);
      res.status(500).json({ message: "Failed to get next default response" });
    }
  });

  // Get next sound clip for a trigger word (cycling functionality)
  app.get("/api/trigger-words/:id/next-sound-clip", async (req, res) => {
    try {
      const triggerId = parseInt(req.params.id);
      const nextSoundClipId = await storage.getNextSoundClipForTrigger(triggerId);
      
      if (nextSoundClipId === null) {
        return res.status(404).json({ message: 'Trigger word not found or no sound clips associated' });
      }
      
      return res.status(200).json({ soundClipId: nextSoundClipId });
    } catch (error) {
      console.error('Error getting next sound clip for trigger:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Export profile
  app.get("/api/profile/export", async (req, res) => {
    try {
      const profileData = await storage.exportProfile();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="callsound-profile-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(profileData);
    } catch (error) {
      console.error("Error exporting profile:", error);
      res.status(500).json({ message: "Failed to export profile" });
    }
  });

  // Import profile
  app.post("/api/profile/import", upload.single("profile"), async (req: Request & { file?: Express.Multer.File }, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No profile file provided" });
      }

      // Read and parse the profile file
      const profileContent = fs.readFileSync(req.file.path, 'utf-8');
      const profileData = JSON.parse(profileContent);

      // Validate profile data structure
      if (!profileData.version || !profileData.soundClips || !profileData.triggerWords || !profileData.settings) {
        return res.status(400).json({ message: "Invalid profile file format" });
      }

      // Import the profile
      await storage.importProfile(profileData);

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      res.json({ message: "Profile imported successfully" });
    } catch (error) {
      console.error("Error importing profile:", error);
      res.status(500).json({ message: "Failed to import profile" });
    }
  });

  // Save profile to server
  app.post("/api/profile/save-to-server", async (req, res) => {
    try {
      const { filename, readOnly } = req.body;
      if (!filename || typeof filename !== 'string' || filename.trim() === '') {
        return res.status(400).json({ message: "Filename is required" });
      }

      const profile = await storage.exportProfile();
      
      // Validate that profile has at least one sound clip
      if (!profile.soundClips || profile.soundClips.length === 0) {
        return res.status(400).json({ message: "Cannot save profile: At least one sound clip is required" });
      }
      
      await storage.saveProfileToServer(profile, filename.trim(), readOnly || false);
      
      res.json({ message: "Profile saved to server successfully" });
    } catch (error) {
      console.error("Error saving profile to server:", error);
      res.status(500).json({ message: error.message || "Failed to save profile to server" });
    }
  });

  // Get server profiles list
  app.get("/api/profile/server-profiles", async (req, res) => {
    try {
      const profiles = await storage.getServerProfiles();
      res.json({ profiles });
    } catch (error) {
      console.error("Error getting server profiles:", error);
      res.status(500).json({ message: "Failed to get server profiles" });
    }
  });

  // Load profile from server
  app.get("/api/profile/load-from-server/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      if (!filename) {
        return res.status(400).json({ message: "Filename is required" });
      }

      const profileData = await storage.loadProfileFromServer(filename);
      await storage.importProfile(profileData);
      
      res.json({ message: "Profile loaded from server successfully" });
    } catch (error) {
      console.error("Error loading profile from server:", error);
      res.status(500).json({ message: error.message || "Failed to load profile from server" });
    }
  });

  // Delete profile from server
  app.delete("/api/profile/server-profiles/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      if (!filename) {
        return res.status(400).json({ message: "Filename is required" });
      }

      await storage.deleteServerProfile(filename);
      res.json({ message: "Profile deleted from server successfully" });
    } catch (error) {
      console.error("Error deleting profile from server:", error);
      res.status(500).json({ message: "Failed to delete profile from server" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
