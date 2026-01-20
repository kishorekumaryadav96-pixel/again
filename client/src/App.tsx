import { useState, createContext, useContext, useEffect } from "react";
import type React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { BottomNavigation } from "@/components/BottomNavigation";
import { formatCurrency } from "@/lib/formatCurrency";
import { MissionControl } from "@/components/MissionControl";
import Feed from "@/pages/Feed";
import Snipers from "@/pages/Snipers";
import Profile from "@/pages/Profile";
import Logistics from "@/pages/Logistics";
import Subscriptions from "@/pages/Subscriptions";
import NotFound from "@/pages/not-found";
import type { Saving } from "@/types/savings";
import type { Sniper } from "@shared/schema";

// Extended type for killed snipers with killedAt timestamp
export interface KilledSniper extends Sniper {
  killedAt: Date;
  savedAmount: number;
  originalPrice: number; // The original price when sniper was created
}

// Extended type for snipers with original price tracking
export interface SniperWithOriginal extends Sniper {
  originalPrice?: number; // The original price when sniper was created
}

const SAVINGS_STORAGE_KEY = "savings-feed-items";
const SNIPERS_STORAGE_KEY = "snipers-items";
const KILLED_SNIPERS_STORAGE_KEY = "killed-snipers-items";
const TRACKED_FLIGHTS_KEY = "tracked-flights";
const SUBSCRIPTIONS_KEY = "subscriptions-items";

interface TrackedFlight {
  id: string;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  originalPrice: number;
  currentPrice: number;
  status: "tracked" | "killed" | "Secured" | "Booked";
  trackedAt: Date;
  isBooked?: boolean; // Track if flight has been intercepted/booked
}

const mockSavings: Saving[] = [
  {
    id: "mock-1",
    title: "Coffee",
    currentPrice: 7,
    oldPrice: 10,
    category: "Food & Dining",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  {
    id: "mock-2",
    title: "Wireless Headphones",
    currentPrice: 79.99,
    oldPrice: 129.99,
    category: "Shopping",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
  },
  {
    id: "mock-3",
    title: "Gym Membership",
    currentPrice: 29.99,
    oldPrice: 49.99,
    category: "Health & Fitness",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  },
];

interface Subscription {
  id: string;
  name: string;
  price: number;
  status: "active" | "ghost" | "terminated";
  isGhost?: boolean;
  lastDetected?: Date;
  category: string;
}

interface SavingsContextType {
  localSavings: Saving[];
  addSaving: (saving: Saving) => void;
  totalSavings: number;
  localSnipers: Sniper[];
  addSniper: (sniper: Sniper, originalPrice?: number, category?: string) => void;
  deleteSniper: (id: number) => void;
  killSniper: (id: number) => void;
  killSaving: (id: string) => void;
  updateSniperPrice: (id: number, newPrice: number) => void;
  trackedFlights: TrackedFlight[];
  setTrackedFlights: React.Dispatch<React.SetStateAction<TrackedFlight[]>>;
  subscriptions: Subscription[];
  terminateSubscription: (id: string) => void;
  restoreSubscription: (id: string) => void;
}

// Helper function to load savings from localStorage
function loadSavingsFromStorage(): Saving[] {
  try {
    const stored = localStorage.getItem(SAVINGS_STORAGE_KEY);
    if (!stored) return []; // Don't return mockSavings - they're examples only
    
    const parsed = JSON.parse(stored);
    // Convert createdAt strings back to Date objects
    // Filter out mock savings (they're examples, not real savings)
    return parsed
      .map((item: Omit<Saving, "createdAt"> & { createdAt: string }) => ({
        ...item,
        createdAt: new Date(item.createdAt),
      }))
      .filter((item: Saving) => !item.id.startsWith("mock-"));
  } catch (error) {
    console.error("Error loading savings from localStorage:", error);
    return []; // Don't return mockSavings
  }
}

// Helper function to save savings to localStorage
function saveSavingsToStorage(savings: Saving[]): void {
  try {
    localStorage.setItem(SAVINGS_STORAGE_KEY, JSON.stringify(savings));
  } catch (error) {
    console.error("Error saving savings to localStorage:", error);
  }
}

// Helper function to load snipers from localStorage
function loadSnipersFromStorage(): Sniper[] {
  try {
    const stored = localStorage.getItem(SNIPERS_STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    // Convert createdAt strings back to Date objects
    return parsed.map((item: Omit<Sniper, "createdAt"> & { createdAt: string }) => ({
      ...item,
      createdAt: new Date(item.createdAt),
    }));
  } catch (error) {
    console.error("Error loading snipers from localStorage:", error);
    return [];
  }
}

// Helper function to save snipers to localStorage
function saveSnipersToStorage(snipers: Sniper[]): void {
  try {
    localStorage.setItem(SNIPERS_STORAGE_KEY, JSON.stringify(snipers));
  } catch (error) {
    console.error("Error saving snipers to localStorage:", error);
  }
}

// Helper function to load killed snipers from localStorage
function loadKilledSnipersFromStorage(): KilledSniper[] {
  try {
    const stored = localStorage.getItem(KILLED_SNIPERS_STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    // Convert createdAt and killedAt strings back to Date objects
    // Handle migration: if originalPrice doesn't exist, calculate it from saved data
    return parsed.map((item: Omit<KilledSniper, "createdAt" | "killedAt"> & { createdAt: string; killedAt: string; originalPrice?: number }) => ({
      ...item,
      createdAt: new Date(item.createdAt),
      killedAt: new Date(item.killedAt),
      originalPrice: item.originalPrice ?? (item.currentPrice ? Number(item.currentPrice) : Number(item.targetPrice)),
    }));
  } catch (error) {
    console.error("Error loading killed snipers from localStorage:", error);
    return [];
  }
}


const SavingsContext = createContext<SavingsContextType | undefined>(undefined);

export function useSavings() {
  const context = useContext(SavingsContext);
  if (!context) {
    throw new Error("useSavings must be used within SavingsProvider");
  }
  return context;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Feed} />
      <Route path="/snipers" component={Snipers} />
      <Route path="/profile" component={Profile} />
      <Route path="/logistics" component={Logistics} />
      <Route path="/subscriptions" component={Subscriptions} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Store original prices for snipers (when they were created)
const SNIPER_ORIGINAL_PRICES_KEY = "sniper-original-prices";
// Store categories for snipers
const SNIPER_CATEGORIES_KEY = "sniper-categories";

// Helper function to load flights from localStorage
// Ensure 3 Flights: Always return all 3 missions (Mumbai, Delhi, Bangalore)
function loadFlightsFromStorage(): TrackedFlight[] {
  const defaultFlights: TrackedFlight[] = [
    {
      id: "1",
      origin: "Mumbai",
      originCode: "BOM",
      destination: "Dubai",
      destinationCode: "DXB",
      originalPrice: 22000,
      currentPrice: 18500,
      status: "tracked",
      trackedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      id: "2",
      origin: "Delhi",
      originCode: "DEL",
      destination: "London",
      destinationCode: "LHR",
      originalPrice: 50000,
      currentPrice: 45000,
      status: "tracked",
      trackedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    },
    {
      id: "3",
      origin: "Bangalore",
      originCode: "BLR",
      destination: "Singapore",
      destinationCode: "SIN",
      originalPrice: 15000,
      currentPrice: 12000,
      status: "tracked",
      trackedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    },
  ];

  try {
    const stored = localStorage.getItem(TRACKED_FLIGHTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const loadedFlights = parsed.map((f: any) => ({
        ...f,
        trackedAt: new Date(f.trackedAt),
      }));
      
      // Ensure all 3 default flights are present
      // Merge stored flights with defaults, ensuring all 3 are included
      const flightMap = new Map(loadedFlights.map((f: any) => [f.id, f]));
      defaultFlights.forEach((defaultFlight) => {
        if (!flightMap.has(defaultFlight.id)) {
          flightMap.set(defaultFlight.id, defaultFlight);
        }
      });
      
      // Return all flights, ensuring at least the 3 defaults
      return Array.from(flightMap.values());
    }
  } catch (error) {
    console.error("Error loading flights from storage:", error);
  }
  
  // Return default flights if nothing in storage
  return defaultFlights;
}

// Helper function to load subscriptions from localStorage
function loadSubscriptionsFromStorage(): Subscription[] {
  try {
    const stored = localStorage.getItem(SUBSCRIPTIONS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const loaded = parsed.map((s: any) => ({
        ...s,
        lastDetected: s.lastDetected ? new Date(s.lastDetected) : undefined,
      }));
      
      // Subscription Purge: Force Gym Membership to be terminated and hidden
      const gymIndex = loaded.findIndex((s: any) => 
        s.name.toLowerCase().includes("gym") || s.name.toLowerCase().includes("membership")
      );
      if (gymIndex !== -1) {
        loaded[gymIndex] = {
          ...loaded[gymIndex],
          status: "terminated", // Explicitly terminated
          isGhost: true,
        };
      }
      
      return loaded;
    }
  } catch (error) {
    console.error("Error loading subscriptions from storage:", error);
  }
  // Default subscriptions - Subscription Purge: Gym Membership must be terminated
  return [
    {
      id: "1",
      name: "Netflix",
      price: 649,
      status: "active",
      lastDetected: new Date(),
      category: "Entertainment",
    },
    {
      id: "2",
      name: "iCloud",
      price: 149,
      status: "active",
      lastDetected: new Date(),
      category: "Cloud Storage",
    },
    {
      id: "3",
      name: "Gym Membership",
      price: 3701,
      status: "terminated", // Subscription Purge: Explicitly terminated
      isGhost: true,
      lastDetected: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      category: "Fitness",
    },
  ];
}

function App() {
  const { toast } = useToast();
  
  // Persist Kill Details and Total Savings - don't reset on app load
  const [trackedFlights, setTrackedFlights] = useState<TrackedFlight[]>(() => {
    return loadFlightsFromStorage();
  });

  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => {
    return loadSubscriptionsFromStorage();
  });

  const [localSavings, setLocalSavings] = useState<Saving[]>(() => {
    // Load from storage - MY SAVINGS list (empty by default)
    return loadSavingsFromStorage();
  });
  const [localSnipers, setLocalSnipers] = useState<Sniper[]>(() => {
    const loaded = loadSnipersFromStorage();
    // Initialize 5 fresh test products if they don't exist
    const testProducts = [
      { name: "Rolex Submariner", category: "LUXURY", was: 800000, now: 750000, target: 750500 }, // Target ₹500 higher than current to trigger green glow
      { name: "Nike Air Jordan", category: "FASHION", was: 15000, now: 12000, target: 12000 },
      { name: "MacBook Air M3", category: "ELECTRONICS", was: 115000, now: 110000, target: 105000 },
      { name: "Nespresso Pods", category: "FOOD & BEVERAGE", was: 1200, now: 1200, target: 1000 },
      { name: "Gaming Chair", category: "FURNITURE", was: 25000, now: 22000, target: 22000 },
    ];
    
    const originalPrices = JSON.parse(localStorage.getItem(SNIPER_ORIGINAL_PRICES_KEY) || "{}");
    const categories = JSON.parse(localStorage.getItem(SNIPER_CATEGORIES_KEY) || "{}");
    
    testProducts.forEach((product, index) => {
      const exists = loaded.some(s => s.targetName === product.name);
      if (!exists) {
        const sniper: Sniper = {
          id: Date.now() + index, // Unique ID
          targetName: product.name,
          targetPrice: String(product.target),
          currentPrice: String(product.now),
          imageUrl: null,
          status: "tracking",
          userId: null,
          createdAt: new Date(),
        };
        loaded.push(sniper);
        // Store original price (Was price)
        originalPrices[sniper.id] = product.was;
        // Store category
        categories[sniper.id] = product.category;
      }
    });
    
    localStorage.setItem(SNIPER_ORIGINAL_PRICES_KEY, JSON.stringify(originalPrices));
    localStorage.setItem(SNIPER_CATEGORIES_KEY, JSON.stringify(categories));
    
    if (loaded.length > loadSnipersFromStorage().length) {
      saveSnipersToStorage(loaded);
    }
    
    return loaded;
  });

  // Save to localStorage whenever savings change
  useEffect(() => {
    saveSavingsToStorage(localSavings);
  }, [localSavings]);

  // Save to localStorage whenever snipers change
  useEffect(() => {
    saveSnipersToStorage(localSnipers);
  }, [localSnipers]);

  // Save to localStorage whenever flights change
  useEffect(() => {
    try {
      localStorage.setItem(TRACKED_FLIGHTS_KEY, JSON.stringify(trackedFlights));
    } catch (error) {
      console.error("Error saving flights to storage:", error);
    }
  }, [trackedFlights]);

  // Save to localStorage whenever subscriptions change
  // Subscription Purge: Do NOT override terminated status - preserve it
  useEffect(() => {
    try {
      localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subscriptions));
    } catch (error) {
      console.error("Error saving subscriptions to storage:", error);
    }
  }, [subscriptions]);


  const addSaving = (saving: Saving) => {
    setLocalSavings((prev) => [saving, ...prev]);
  };

  const addSniper = (sniper: Sniper, originalPrice?: number, category?: string) => {
    setLocalSnipers((prev) => {
      const updated = [sniper, ...prev];
      // Store original price if provided, otherwise use currentPrice or targetPrice
      const originalPrices = JSON.parse(localStorage.getItem(SNIPER_ORIGINAL_PRICES_KEY) || "{}");
      const categories = JSON.parse(localStorage.getItem(SNIPER_CATEGORIES_KEY) || "{}");
      
      if (originalPrice !== undefined) {
        originalPrices[sniper.id] = originalPrice;
      } else {
        // Use currentPrice if set, otherwise targetPrice as original
        originalPrices[sniper.id] = sniper.currentPrice ? Number(sniper.currentPrice) : Number(sniper.targetPrice);
      }
      
      // Store category if provided
      if (category) {
        categories[sniper.id] = category;
      }
      
      localStorage.setItem(SNIPER_ORIGINAL_PRICES_KEY, JSON.stringify(originalPrices));
      localStorage.setItem(SNIPER_CATEGORIES_KEY, JSON.stringify(categories));
      
      return updated;
    });
  };

  const deleteSniper = (id: number) => {
    setLocalSnipers((prev) => prev.filter((sniper) => sniper.id !== id));
  };

  const killSniper = (id: number) => {
    const sniper = localSnipers.find((s) => s.id === id);
    if (sniper) {
      // Get original price from storage (the price when sniper was created)
      const originalPrices = JSON.parse(localStorage.getItem(SNIPER_ORIGINAL_PRICES_KEY) || "{}");
      const categories = JSON.parse(localStorage.getItem(SNIPER_CATEGORIES_KEY) || "{}");
      const originalPrice = Number(originalPrices[id] ?? (sniper.currentPrice ? Number(sniper.currentPrice) : Number(sniper.targetPrice)));
      
      // Current Price = the price when killed (what they actually paid)
      const currentPriceWhenKilled = sniper.currentPrice ? Number(sniper.currentPrice) : Number(sniper.targetPrice);
      
      // Check if overpriced (current price > original price)
      if (currentPriceWhenKilled > originalPrice) {
        // Overpriced: Delete the item and show toast
        toast({
          title: "Mission Aborted",
          description: "Target not met—Mission Aborted.",
          variant: "destructive",
        });
        
        // Remove from storage
        delete originalPrices[id];
        delete categories[id];
        localStorage.setItem(SNIPER_ORIGINAL_PRICES_KEY, JSON.stringify(originalPrices));
        localStorage.setItem(SNIPER_CATEGORIES_KEY, JSON.stringify(categories));
        
        // Remove sniper from active list (don't move to savings)
        setLocalSnipers((prev) => prev.filter((s) => s.id !== id));
        return;
      }
      
      // Calculate savings: Original Price - Current Price
      // Even if savings is ₹0.00, still move to MY SAVINGS
      // Example: Original (X) = ₹50,000, Current (Z) = ₹45,000, Savings = ₹50,000 - ₹45,000 = ₹5,000
      const savedAmount = Number(originalPrice) - Number(currentPriceWhenKilled);
      
      // Get category
      const category = categories[id] || "Other";
      
      // Create a Saving from the killed sniper and add to MY SAVINGS
      const killedSaving: Saving = {
        id: `killed-${sniper.id}`,
        title: sniper.targetName,
        oldPrice: originalPrice,
        currentPrice: currentPriceWhenKilled,
        category: category,
        createdAt: new Date(), // When it was killed
      };
      
      // Remove original price and category from storage
      delete originalPrices[id];
      delete categories[id];
      localStorage.setItem(SNIPER_ORIGINAL_PRICES_KEY, JSON.stringify(originalPrices));
      localStorage.setItem(SNIPER_CATEGORIES_KEY, JSON.stringify(categories));
      
      // Move sniper from active to MY SAVINGS list
      setLocalSnipers((prev) => prev.filter((s) => s.id !== id));
      setLocalSavings((prev) => [killedSaving, ...prev]);
    }
  };

  const killSaving = (id: string) => {
    // When a saving is "killed", it stays in MY SAVINGS
    // The KILL button just marks it as killed, but it remains in the list
    // This ensures all killed items are visible in MY SAVINGS
    // No action needed - the item is already in localSavings
  };

  // Update sniper price (for live market simulation)
  const updateSniperPrice = (id: number, newPrice: number) => {
    setLocalSnipers((prev) =>
      prev.map((sniper) =>
        sniper.id === id
          ? { ...sniper, currentPrice: String(newPrice) }
          : sniper
      )
    );
  };

  // Terminate subscription - remove from list and add to Total Savings
  const terminateSubscription = (id: string) => {
    const subscription = subscriptions.find((s) => s.id === id);
    if (subscription) {
      // Update subscription status to terminated: true
      setSubscriptions((prev) => 
        prev.map((s) => 
          s.id === id ? { ...s, status: "terminated" as const } : s
        )
      );
      
      // Add terminated amount to Total Savings with specific message
      const terminatedSaving: Saving = {
        id: `terminated-${subscription.id}`,
        title: subscription.name.toLowerCase().includes("gym") 
          ? `Gym Ghost Eliminated (+${formatCurrency(subscription.price)})`
          : `Ghost Terminated: ${subscription.name} (+${formatCurrency(subscription.price)})`,
        oldPrice: subscription.price,
        currentPrice: 0, // Terminated = no longer paying
        category: subscription.category,
        createdAt: new Date(),
      };
      addSaving(terminatedSaving);
    }
  };

  // Restore subscription - add back to list and remove from Total Savings
  const restoreSubscription = (id: string) => {
    // Find the terminated saving entry
    const terminatedSaving = localSavings.find((s) => s.id === `terminated-${id}`);
    if (terminatedSaving) {
      // Restore subscription to active status
      const restoredSubscription: Subscription = {
        id: id,
        name: terminatedSaving.title,
        price: Number(terminatedSaving.oldPrice),
        status: "active",
        lastDetected: new Date(),
        category: terminatedSaving.category,
      };
      setSubscriptions((prev) => [...prev, restoredSubscription]);
      
      // Remove from Total Savings by removing the terminated saving entry
      setLocalSavings((prev) => prev.filter((s) => s.id !== `terminated-${id}`));
    }
  };

  // Calculate total savings from MY SAVINGS list (localSavings)
  // Total Savings badge sums all items in the 'MY SAVINGS' list
  const totalSavings = (() => {
    const savingsTotal = localSavings.reduce((total, saving) => {
      const oldPrice = Number(saving.oldPrice) || 0;
      const currentPrice = Number(saving.currentPrice) || 0;
      const savings = Number(oldPrice) - Number(currentPrice);
      return total + (isNaN(savings) ? 0 : Number(savings));
    }, 0);
    
    const result = Number(savingsTotal);
    return isNaN(result) ? 0 : Number(result);
  })();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SavingsContext.Provider value={{ 
          localSavings, 
          addSaving, 
          totalSavings,
          localSnipers,
          addSniper,
          deleteSniper,
          killSniper,
          killSaving,
          updateSniperPrice,
          trackedFlights,
          setTrackedFlights,
          subscriptions,
          terminateSubscription,
          restoreSubscription,
        }}>
          <div className="min-h-screen bg-zinc-950 flex">
            <Navigation />
            <main className="flex-1 overflow-auto pb-20">
              <Router />
            </main>
          </div>
          <BottomNavigation />
          <MissionControl />
          <Toaster />
        </SavingsContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
