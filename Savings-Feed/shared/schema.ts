import { pgTable, text, serial, integer, boolean, timestamp, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  avatarUrl: text("avatar_url"),
  isOnline: boolean("is_online").default(false),
  totalXp: integer("total_xp").default(0).notNull(),
  totalSaved: numeric("total_saved").default("0").notNull(),
});

export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  price: numeric("price").notNull(),
  originalPrice: numeric("original_price"),
  currency: text("currency").default("₹"),
  status: text("status", { enum: ["active", "killed"] }).default("active").notNull(),
  finderId: integer("finder_id").references(() => users.id),
  imageUrl: text("image_url"),
  killCount: integer("kill_count").default(0),
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

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: numeric("price").notNull(),
  status: text("status", { enum: ["active", "killed"] }).default("active").notNull(),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const flights = pgTable("flights", {
  id: serial("id").primaryKey(),
  flightNumber: text("flight_number").notNull(),
  pricePaid: numeric("price_paid").notNull(),
  currentPrice: numeric("current_price"),
  priceHistory: jsonb("price_history").$type<{ date: string; price: number }[]>().default([]),
  status: text("status", { enum: ["tracking", "opportunity"] }).default("tracking").notNull(),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// === SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertDealSchema = createInsertSchema(deals).omit({ id: true, createdAt: true, killCount: true });
export const insertSniperSchema = createInsertSchema(snipers).omit({ id: true, createdAt: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true });
export const insertFlightSchema = createInsertSchema(flights).omit({ id: true, createdAt: true, priceHistory: true });

// === EXPLICIT TYPES ===

export type User = typeof users.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type Sniper = typeof snipers.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Flight = typeof flights.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type InsertSniper = z.infer<typeof insertSniperSchema>;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type InsertFlight = z.infer<typeof insertFlightSchema>;
