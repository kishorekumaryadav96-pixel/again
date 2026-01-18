import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  avatarUrl: text("avatar_url"), // For the "Assassin" profile pic
  isOnline: boolean("is_online").default(false),
});

export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  price: numeric("price").notNull(),
  originalPrice: numeric("original_price"),
  currency: text("currency").default("₹"),
  status: text("status", { enum: ["active", "killed"] }).default("active").notNull(),
  finderId: integer("finder_id").references(() => users.id), // The "Assassin"
  imageUrl: text("image_url"),
  killCount: integer("kill_count").default(0), // Social proof
  createdAt: timestamp("created_at").defaultNow(),
});

export const snipers = pgTable("snipers", {
  id: serial("id").primaryKey(),
  targetName: text("target_name").notNull(),
  targetPrice: numeric("target_price").notNull(),
  currentPrice: numeric("current_price"),
  imageUrl: text("image_url"),
  status: text("status", { enum: ["tracking", "hit"] }).default("tracking").notNull(),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// === SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertDealSchema = createInsertSchema(deals).omit({ id: true, createdAt: true, killCount: true });
export const insertSniperSchema = createInsertSchema(snipers).omit({ id: true, createdAt: true });

// === EXPLICIT TYPES ===

export type User = typeof users.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type Sniper = typeof snipers.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type InsertSniper = z.infer<typeof insertSniperSchema>;

export type CreateDealRequest = InsertDeal;
export type CreateSniperRequest = InsertSniper;
