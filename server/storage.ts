import { db } from "./db";
import {
  users, deals, snipers,
  type User, type Deal, type Sniper,
  type InsertUser, type InsertDeal, type InsertSniper
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Deals
  getDeals(): Promise<Deal[]>;
  createDeal(deal: InsertDeal): Promise<Deal>;
  markDealAsKilled(id: number): Promise<Deal | undefined>;
  
  // Snipers
  getSnipers(): Promise<Sniper[]>;
  createSniper(sniper: InsertSniper): Promise<Sniper>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Deals
  async getDeals(): Promise<Deal[]> {
    return await db.select().from(deals).orderBy(desc(deals.createdAt));
  }

  async createDeal(deal: InsertDeal): Promise<Deal> {
    const [newDeal] = await db.insert(deals).values(deal).returning();
    return newDeal;
  }

  async markDealAsKilled(id: number): Promise<Deal | undefined> {
    const [updatedDeal] = await db
      .update(deals)
      .set({ status: 'killed', killCount: 1 }) // Increment logic can be more complex later
      .where(eq(deals.id, id))
      .returning();
    return updatedDeal;
  }

  // Snipers
  async getSnipers(): Promise<Sniper[]> {
    return await db.select().from(snipers).orderBy(desc(snipers.createdAt));
  }

  async createSniper(sniper: InsertSniper): Promise<Sniper> {
    const [newSniper] = await db.insert(snipers).values(sniper).returning();
    return newSniper;
  }
}

export const storage = new DatabaseStorage();
