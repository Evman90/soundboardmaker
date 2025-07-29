import { pgTable, text, serial, integer, boolean, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const soundClips = pgTable("sound_clips", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  filename: text("filename").notNull(),
  format: text("format").notNull(),
  duration: real("duration").notNull(),
  size: integer("size").notNull(),
  url: text("url").notNull(),
  isDefault: boolean("is_default").default(true).notNull(), // All clips start as default clips
});

export const triggerWords = pgTable("trigger_words", {
  id: serial("id").primaryKey(),
  phrase: text("phrase").notNull(),
  soundClipIds: integer("sound_clip_ids").array().notNull(),
  currentIndex: integer("current_index").default(0),
  caseSensitive: boolean("case_sensitive").default(false),
  enabled: boolean("enabled").default(true),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  defaultResponseEnabled: boolean("default_response_enabled").default(true),
  defaultResponseSoundClipIds: integer("default_response_sound_clip_ids").array().default([]),
  defaultResponseDelay: integer("default_response_delay").default(2000), // milliseconds
  defaultResponseIndex: integer("default_response_index").default(0),
});

export const insertSoundClipSchema = createInsertSchema(soundClips).omit({
  id: true,
  isDefault: true, // Auto-managed, starts as true for all new clips
});

export const insertTriggerWordSchema = createInsertSchema(triggerWords).omit({
  id: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
});

export type InsertSoundClip = z.infer<typeof insertSoundClipSchema>;
export type SoundClip = typeof soundClips.$inferSelect;
export type InsertTriggerWord = z.infer<typeof insertTriggerWordSchema>;
export type TriggerWord = typeof triggerWords.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

// Profile export/import schemas
export const profileSchema = z.object({
  version: z.string().default("1.0"),
  exportDate: z.string(),
  soundClips: z.array(z.object({
    name: z.string(),
    filename: z.string(),
    format: z.string(),
    duration: z.number(),
    size: z.number(),
    audioData: z.string(), // base64 encoded audio data
  })),
  triggerWords: z.array(z.object({
    phrase: z.string(),
    soundClipNames: z.array(z.string()), // Multiple sound clips per trigger
    caseSensitive: z.boolean(),
    enabled: z.boolean(),
  })),
  settings: z.object({
    defaultResponseEnabled: z.boolean(),
    defaultResponseSoundClipNames: z.array(z.string()), // Reference by names instead of IDs
    defaultResponseDelay: z.number(),
  }),
});

export type Profile = z.infer<typeof profileSchema>;
