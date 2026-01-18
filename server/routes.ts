import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Deals
  app.get(api.deals.list.path, async (req, res) => {
    const deals = await storage.getDeals();
    res.json(deals);
  });

  app.post(api.deals.create.path, async (req, res) => {
    try {
      const input = api.deals.create.input.parse(req.body);
      const deal = await storage.createDeal(input);
      res.status(201).json(deal);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.deals.kill.path, async (req, res) => {
    const id = parseInt(req.params.id);
    const deal = await storage.markDealAsKilled(id);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    res.json(deal);
  });

  // Snipers
  app.get(api.snipers.list.path, async (req, res) => {
    const snipers = await storage.getSnipers();
    res.json(snipers);
  });

  app.post(api.snipers.create.path, async (req, res) => {
    try {
      const input = api.snipers.create.input.parse(req.body);
      const sniper = await storage.createSniper(input);
      res.status(201).json(sniper);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Seed Data function
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingDeals = await storage.getDeals();
  if (existingDeals.length === 0) {
    // Create a dummy user
    const user = await storage.createUser({ 
      username: "GhostAssassin",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ghost",
      isOnline: true
    });

    // Create Snipers (Stories)
    await storage.createSniper({
      targetName: "PS5 Slim",
      targetPrice: "40000",
      currentPrice: "44990",
      status: "tracking",
      userId: user.id,
      imageUrl: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&q=80&w=200"
    });
    
    await storage.createSniper({
      targetName: "AirPods Pro",
      targetPrice: "18000",
      currentPrice: "16999", // Lower!
      status: "hit",
      userId: user.id,
      imageUrl: "https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?auto=format&fit=crop&q=80&w=200"
    });

    // Create Deals (Feed)
    await storage.createDeal({
      title: "Sony WH-1000XM5 Noise Cancelling Headphones",
      description: "Lowest price ever seen on Amazon! Grab it before it's gone.",
      price: "19999",
      originalPrice: "29990",
      currency: "₹",
      status: "active",
      finderId: user.id,
      imageUrl: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=800"
    });

    await storage.createDeal({
      title: "MacBook Air M2",
      description: "Midnight color, 256GB SSD. Student discount applicable.",
      price: "89900",
      originalPrice: "114900",
      currency: "₹",
      status: "killed",
      finderId: user.id,
      imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca4?auto=format&fit=crop&q=80&w=800"
    });
  }
}
