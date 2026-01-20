import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Mic, MicOff, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useSavings } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Sniper } from "@shared/schema";
import { formatCurrency } from "@/lib/formatCurrency";

// TypeScript declarations for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface Message {
  id: string;
  text: string;
  sender: "ai" | "user";
  timestamp: Date;
  flightOptions?: { flightId: string; flight: any }; // For interactive flight buttons
}

interface ConversationTopic {
  id: string;
  topic: string;
  timestamp: Date;
  context?: any;
}

type Intent = 
  | "kill" 
  | "hold" 
  | "find" 
  | "status" 
  | "analyze" 
  | "clear" 
  | "price_difference" 
  | "add_product" 
  | "modify_product" 
  | "delete_product" 
  | "other_products" 
  | "unknown";

export function MissionControl() {
  const { localSnipers, localSavings, totalSavings, deleteSniper, addSniper, killSniper, updateSniperPrice, trackedFlights, setTrackedFlights, subscriptions, restoreSubscription, terminateSubscription, addSaving } = useSavings();
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const chatPanelRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: string; data?: any } | null>(null);
  const [lastSuggestedAction, setLastSuggestedAction] = useState<number | null>(null);
  const [discountedItems, setDiscountedItems] = useState<Sniper[]>([]);
  const [showDiscountedItems, setShowDiscountedItems] = useState(false);
  const [currentDiscountedItem, setCurrentDiscountedItem] = useState<number | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<"kill" | "checkOther" | "intercept" | "terminateGhost" | null>(null);
  const [pendingInterceptFlight, setPendingInterceptFlight] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationTopic[]>([]);
  const [multiStepFlow, setMultiStepFlow] = useState<{ type: "product_search"; step: "budget" | "suggestions" | "deploy"; data?: any } | null>(null);
  const [highlightedProductId, setHighlightedProductId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const rolexTargetUpdatedRef = useRef<boolean>(false);

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
        handleCommand(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        addAIMessage("Sorry, I couldn't understand that. Please try again.");
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Star's introduction when panel first opens
  const [hasIntroduced, setHasIntroduced] = useState(false);
  useEffect(() => {
    if (isOpen && !hasIntroduced && messages.length === 0) {
      setHasIntroduced(true);
      // Identity Check: Use exact format
      // Identity: Star's greeting must show exact counts (3 flights, 6 snipers, 2 active, 1 ghost)
      const flightCount = trackedFlights ? trackedFlights.length : 0;
      const sniperCount = localSnipers.length;
      // Subscription Purge: Filter out terminated subscriptions from counts
      const activeSubscriptions = subscriptions.filter((s: any) => s.status === "active" && s.isGhost !== true && s.status !== "terminated");
      const ghostSubscriptions = subscriptions.filter((s: any) => s.isGhost === true && s.status !== "terminated");
      
      const introMessage = `I am Star, your tactical operative. Monitoring ${flightCount} flight${flightCount !== 1 ? 's' : ''}, ${sniperCount} sniper${sniperCount !== 1 ? 's' : ''}, ${activeSubscriptions.length} active subscription${activeSubscriptions.length !== 1 ? 's' : ''}, and ${ghostSubscriptions.length} ghost subscription${ghostSubscriptions.length !== 1 ? 's' : ''}. How can I assist you today?`;
      addAIMessage(introMessage, "general");
    }
  }, [isOpen, hasIntroduced, messages.length, trackedFlights, localSnipers, subscriptions]);

  // UI Retraction: Close chat when clicking outside or switching tabs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && chatPanelRef.current) {
        const target = event.target as HTMLElement;
        // Check if click is outside the chat panel and not on the floating button
        if (!chatPanelRef.current.contains(target)) {
          const floatingButton = target.closest('button[class*="fixed bottom-6 right-6"]');
          if (!floatingButton) {
            setIsOpen(false);
          }
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close chat when route changes
  useEffect(() => {
    if (isOpen) {
      setIsOpen(false);
    }
  }, [location]);

  // Temporarily set Rolex target price to ₹500 higher than current price to trigger green glow
  useEffect(() => {
    if (rolexTargetUpdatedRef.current) return; // Only update once
    
    const rolexSniper = localSnipers.find(s => s.targetName.toLowerCase().includes("rolex"));
    if (rolexSniper) {
      const currentPrice = rolexSniper.currentPrice ? Number(rolexSniper.currentPrice) : Number(rolexSniper.targetPrice);
      const newTargetPrice = currentPrice + 500; // ₹500 higher than current
      
      // Only update if target hasn't been set yet (check if target is still the old value)
      if (Number(rolexSniper.targetPrice) !== newTargetPrice) {
        rolexTargetUpdatedRef.current = true; // Mark as updated
        const updatedSniper: Sniper = {
          ...rolexSniper,
          targetPrice: String(newTargetPrice),
        };
        // Get original price and category from storage
        const originalPrices = JSON.parse(localStorage.getItem("sniper-original-prices") || "{}");
        const categories = JSON.parse(localStorage.getItem("sniper-categories") || "{}");
        const originalPrice = originalPrices[rolexSniper.id];
        const category = categories[rolexSniper.id] || "LUXURY";
        
        // Update by deleting and re-adding
        deleteSniper(rolexSniper.id);
        setTimeout(() => {
          addSniper(updatedSniper, originalPrice, category);
        }, 100);
      }
    }
  }, [localSnipers, deleteSniper, addSniper]);

  // Star Pulse: Live market simulation - update prices +/- ₹20 every 8 seconds
  useEffect(() => {
    if (localSnipers.length === 0) return;

    const interval = setInterval(() => {
      localSnipers.forEach((sniper) => {
        const currentPrice = sniper.currentPrice ? Number(sniper.currentPrice) : Number(sniper.targetPrice);
        // Random change between -20 and +20
        const change = Math.floor(Math.random() * 41) - 20; // -20 to +20
        const newPrice = Math.max(1, currentPrice + change); // Ensure price doesn't go below 1
        updateSniperPrice(sniper.id, newPrice);
      });
    }, 8000); // Every 8 seconds

    return () => clearInterval(interval);
  }, [localSnipers, updateSniperPrice]);

  // Get original prices from storage
  const getOriginalPrice = (sniperId: number): number => {
    const originalPrices = JSON.parse(localStorage.getItem("sniper-original-prices") || "{}");
    return Number(originalPrices[sniperId] ?? 0);
  };

  // Analyze missions and find targets reached or closest to target
  const analyzeMissions = () => {
    if (localSnipers.length === 0) {
      addAIMessage("At your service, Commander. I've analyzed the market for you. You currently have no active snipers. Deploy a new mission to get started!", "analyze");
      return;
    }

    // First, find all snipers that have reached their target (currentPrice <= targetPrice)
    const reachedTargets: Sniper[] = [];
    const notReached: Array<{ sniper: Sniper; gap: number }> = [];

    localSnipers.forEach((sniper) => {
      const targetPrice = Number(sniper.targetPrice);
      const currentPrice = sniper.currentPrice ? Number(sniper.currentPrice) : targetPrice;
      
      if (currentPrice <= targetPrice) {
        reachedTargets.push(sniper);
      } else {
        const gap = currentPrice - targetPrice;
        notReached.push({ sniper, gap });
      }
    });

    // Scenario 1: Multiple targets reached
    if (reachedTargets.length > 1) {
      const productNames = reachedTargets.map(s => `**${s.targetName}**`).join(" and ");
      const message = `At your service, Commander. I've analyzed the market for you. We have **${reachedTargets.length}** successful missions ready for execution: ${productNames}. Shall we execute the KILL now, Commander?`;
      addAIMessage(message, "analyze");
      
      // Store the first reached target for context (user can specify which one to kill)
      setLastSuggestedAction(reachedTargets[0].id);
      return;
    }

    // Scenario 2: Single target reached
    if (reachedTargets.length === 1) {
      const sniper = reachedTargets[0];
      const targetPrice = Number(sniper.targetPrice);
      const currentPrice = sniper.currentPrice ? Number(sniper.currentPrice) : targetPrice;
      
      // Use proactive market insight
      const insight = generateMarketInsight(sniper);
      addAIMessage(insight, "analyze");
      
      // Store the reached target for context memory
      setLastSuggestedAction(sniper.id);
      return;
    }

    // Scenario 3: No targets reached - find closest
    if (notReached.length > 0) {
      // Sort by gap (smallest first)
      notReached.sort((a, b) => a.gap - b.gap);
      const closest = notReached[0].sniper;
      const targetPrice = Number(closest.targetPrice);
      const currentPrice = closest.currentPrice ? Number(closest.currentPrice) : targetPrice;
      const originalPrice = getOriginalPrice(closest.id);
      const gap = currentPrice - targetPrice;
      const gapPercentage = originalPrice > 0 ? Math.round((gap / originalPrice) * 100) : 0;
      
      let status = "";
      if (gapPercentage <= 5) {
        status = "Very close to target!";
      } else if (gapPercentage <= 15) {
        status = "Getting close.";
      } else {
        status = "Still scanning.";
      }

      // Check for price drops (Was > Now)
      const discounted = findDiscountedItems();
      
      // Use proactive market insight for closest target
      const insight = generateMarketInsight(closest);
      let message = `At your service, Commander. I've analyzed the market for you. You have ${localSnipers.length} active sniper${localSnipers.length > 1 ? 's' : ''}. ${insight}`;
      
      if (discounted.length > 0) {
        message += `\n\nI am also tracking **${discounted.length}** other price drop${discounted.length > 1 ? 's' : ''}. Would you like to review the list?`;
        setPendingQuestion("checkOther");
        setDiscountedItems(discounted);
      } else {
        message += `\n\nWould you like me to check for other price drops or add a new mission to the feed?`;
        setPendingQuestion(null);
      }
      
      addAIMessage(message, "analyze");
      
      // Store the closest sniper ID for context memory
      setLastSuggestedAction(closest.id);
    }
  };

  // Add conversation topic to history (keep last 3)
  const addConversationTopic = (topic: string, context?: any) => {
    const newTopic: ConversationTopic = {
      id: Date.now().toString(),
      topic,
      timestamp: new Date(),
      context,
    };
    setConversationHistory((prev) => {
      const updated = [newTopic, ...prev].slice(0, 3); // Keep last 3
      return updated;
    });
  };

  const addAIMessage = (text: string, topic?: string, options?: { flightOptions?: { flightId: string; flight: any } }) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: "ai",
      timestamp: new Date(),
      flightOptions: options?.flightOptions,
    };
    setMessages((prev) => [...prev, newMessage]);
    
    // Track conversation topic
    if (topic) {
      addConversationTopic(topic);
    }
  };

  // Natural Language Understanding - Intent Detection with Fuzzy Logic
  const detectIntent = (command: string): { intent: Intent; confidence: number; entities?: any } => {
    const lowerCommand = command.toLowerCase().trim();
    
    // Kill Intent - Fuzzy matching for various expressions
    const killPhrases = [
      "kill", "execute", "pull the trigger", "get rid of", "remove it", "delete it",
      "take it out", "eliminate", "terminate", "destroy", "end it", "finish it",
      "do it now", "go ahead", "proceed", "confirm kill"
    ];
    if (killPhrases.some(phrase => lowerCommand.includes(phrase))) {
      return { intent: "kill", confidence: 0.9 };
    }
    
    // Hold Intent - Fuzzy matching
    const holdPhrases = [
      "hold", "wait", "not now", "later", "not yet", "keep watching", "maintain position",
      "keep tracking", "don't kill", "abort kill", "cancel kill", "stop", "pause"
    ];
    if (holdPhrases.some(phrase => lowerCommand.includes(phrase))) {
      return { intent: "hold", confidence: 0.9 };
    }
    
    // Find/Add Product Intent
    const findPhrases = [
      "find", "search", "look for", "i need", "i want", "add", "create", "new",
      "looking for", "need a", "want a", "get me", "show me"
    ];
    if (findPhrases.some(phrase => lowerCommand.includes(phrase))) {
      return { intent: "add_product", confidence: 0.85 };
    }
    
    // Intent Classification: Price Analysis vs Math Engine
    // Smart Intent Recognition: "How are they looking", "Any news" - triggers price check
    const priceAnalysisPhrases = [
      "what's the deal", "whats the deal", "any news", "any updates", "what's happening",
      "how are they looking", "how are they", "how's it looking", "hows it looking",
      "status", "report", "summary", "overview", "how am i doing", "what's my",
      "tell me about", "show me my", "current state", "update", "updates"
    ];
    if (priceAnalysisPhrases.some(phrase => lowerCommand.includes(phrase))) {
      return { intent: "price_difference", confidence: 0.9, entities: { analysisType: "comprehensive" } };
    }
    
    // Math Engine Intent: "Cheaper", "Difference", "Savings" - triggers math calculation (Original - Current)
    const mathEnginePhrases = [
      "cheaper", "cheap", "difference", "savings", "saved", "save", "saving",
      "how much", "price difference", "difference of", "price of", "saved on",
      "how much did", "what's the difference", "compare prices", "how much can i save",
      "is it cheaper", "is it cheaper now", "cheaper now", "can i save", "how much saved",
      "cheaper than", "cheaper than before", "is cheaper", "get cheaper", "went cheaper", "became cheaper"
    ];
    if (mathEnginePhrases.some(phrase => lowerCommand.includes(phrase))) {
      return { intent: "price_difference", confidence: 0.9, entities: { analysisType: "math" } };
    }
    
    // Status Intent (fallback for general status queries)
    const statusPhrases = [
      "status report", "full status", "complete status"
    ];
    if (statusPhrases.some(phrase => lowerCommand.includes(phrase))) {
      return { intent: "status", confidence: 0.85 };
    }
    
    // Analyze Intent
    const analyzePhrases = [
      "analyze", "analysis", "review", "check", "scan", "inspect", "examine"
    ];
    if (analyzePhrases.some(phrase => lowerCommand.includes(phrase))) {
      return { intent: "analyze", confidence: 0.85 };
    }
    
    // Clear Intent
    const clearPhrases = [
      "clear", "remove all", "delete all", "wipe", "reset", "empty"
    ];
    if (clearPhrases.some(phrase => lowerCommand.includes(phrase))) {
      return { intent: "clear", confidence: 0.9 };
    }
    
    // Other Products Intent
    const otherProductsPhrases = [
      "other", "another", "more", "what about", "any other", "other deals",
      "other items", "show me other"
    ];
    if (otherProductsPhrases.some(phrase => lowerCommand.includes(phrase))) {
      return { intent: "other_products", confidence: 0.8 };
    }
    
    // Modify Product Intent
    const modifyPhrases = [
      "change", "update", "modify", "edit", "adjust", "set", "update price",
      "change target", "modify target"
    ];
    if (modifyPhrases.some(phrase => lowerCommand.includes(phrase))) {
      return { intent: "modify_product", confidence: 0.8 };
    }
    
    // Delete Product Intent
    const deletePhrases = [
      "delete", "remove", "cancel", "drop", "abandon"
    ];
    if (deletePhrases.some(phrase => lowerCommand.includes(phrase) && !killPhrases.some(kp => lowerCommand.includes(kp)))) {
      return { intent: "delete_product", confidence: 0.75 };
    }
    
    return { intent: "unknown", confidence: 0.0 };
  };

  // Generate Proactive Market Insights
  const generateMarketInsight = (sniper: Sniper): string => {
    const originalPrices = JSON.parse(localStorage.getItem("sniper-original-prices") || "{}");
    const originalPrice = Number(originalPrices[sniper.id] ?? (sniper.currentPrice ? Number(sniper.currentPrice) : Number(sniper.targetPrice)));
    const currentPrice = sniper.currentPrice ? Number(sniper.currentPrice) : originalPrice;
    const targetPrice = Number(sniper.targetPrice);
    const difference = originalPrice - currentPrice;
    const gapToTarget = currentPrice - targetPrice;
    
    // Simulate market data (48-hour tracking)
    const hoursSinceDeployment = Math.floor((Date.now() - new Date(sniper.createdAt).getTime()) / (1000 * 60 * 60));
    const isLowestIn48h = difference > 0 && hoursSinceDeployment >= 2;
    
    let insight = "";
    
    // I've analyzed the targets for you, Commander
    if (difference > 0) {
      // There's a price drop - report savings (even if it's just ₹1)
      insight = `I've analyzed the targets for you, Commander. Excellent catch on that price drop. The **${sniper.targetName}** was ${formatCurrency(originalPrice)} and is now ${formatCurrency(currentPrice)}. You have saved ${formatCurrency(difference)} so far.`;
      if (isLowestIn48h) {
        insight += ` This is the lowest it has been in the past 48 hours.`;
      }
      if (gapToTarget > 0) {
        insight += ` You're still ${formatCurrency(gapToTarget)} away from your target of ${formatCurrency(targetPrice)}.`;
      } else {
        insight += ` Your target has been reached!`;
      }
      insight += ` Would you like to execute the kill at this price?`;
    } else if (difference < 0) {
      insight = `I've analyzed the targets for you, Commander. The **${sniper.targetName}** is currently ${formatCurrency(Math.abs(difference))} above your entry price. The market is trending upward. I recommend holding position.`;
    } else {
      // Only say "Maintaining sniper position" if price change is exactly zero
      insight = `I've analyzed the targets for you, Commander. The **${sniper.targetName}** is at your entry price. Maintaining sniper position.`;
    }
    
    return insight;
  };

  // Multi-Step Problem Solving: Handle product search requests
  const handleMultiStepProductSearch = (command: string) => {
    const lowerCommand = command.toLowerCase();
    
    // Detect product category
    const phoneKeywords = ["phone", "smartphone", "mobile", "iphone", "samsung", "android"];
    const laptopKeywords = ["laptop", "notebook", "macbook", "computer"];
    const watchKeywords = ["watch", "smartwatch", "apple watch"];
    
    let category = "phone";
    if (phoneKeywords.some(kw => lowerCommand.includes(kw))) {
      category = "phone";
    } else if (laptopKeywords.some(kw => lowerCommand.includes(kw))) {
      category = "laptop";
    } else if (watchKeywords.some(kw => lowerCommand.includes(kw))) {
      category = "watch";
    }
    
    // Step 1: Ask for budget
    if (!multiStepFlow || multiStepFlow.step === "budget") {
      addAIMessage("At your service, Commander. I've analyzed the market for you. To find the best deal, what is your budget range?", "product_search");
      setMultiStepFlow({ type: "product_search", step: "budget", data: { category } });
      return;
    }
    
    // Step 2: Parse budget and suggest products
    if (multiStepFlow.step === "budget") {
      const budgetMatch = command.match(/(\d+[,\d]*)/);
      const budget = budgetMatch ? Number(budgetMatch[1].replace(/,/g, "")) : null;
      
      if (!budget || budget <= 0) {
        addAIMessage("Commander, I need a valid budget amount. Please provide a number (e.g., '₹50,000' or '50000').", "product_search");
        return;
      }
      
      // Suggest 2 market leaders based on category
      let suggestions: { name: string; price: number; target: number }[] = [];
      
      if (category === "phone") {
        suggestions = [
          { name: "iPhone 16 Pro", price: 120000, target: 110000 },
          { name: "Samsung Galaxy S24 Ultra", price: 115000, target: 105000 }
        ];
      } else if (category === "laptop") {
        suggestions = [
          { name: "MacBook Air M3", price: 115000, target: 105000 },
          { name: "Dell XPS 15", price: 140000, target: 130000 }
        ];
      } else {
        suggestions = [
          { name: "Apple Watch Series 9", price: 45000, target: 40000 },
          { name: "Samsung Galaxy Watch 6", price: 35000, target: 30000 }
        ];
      }
      
      // Filter suggestions by budget
      const affordable = suggestions.filter(s => s.price <= budget * 1.2); // Allow 20% over budget
      
      if (affordable.length === 0) {
        addAIMessage(`Commander, with a budget of ${formatCurrency(budget)}, I recommend increasing your budget slightly or considering refurbished options. Would you like me to search for alternatives?`, "product_search");
        setMultiStepFlow(null);
        return;
      }
      
      let message = `Excellent, Commander. Based on your budget of ${formatCurrency(budget)}, I've identified **${affordable.length}** top market leaders:\n\n`;
      affordable.forEach((s, idx) => {
        message += `${idx + 1}. **${s.name}** - Current: ${formatCurrency(s.price)}, Suggested Target: ${formatCurrency(s.target)}\n`;
      });
      message += `\nWhich one would you like me to start a Sniper mission for?`;
      
      addAIMessage(message, "product_search");
      setMultiStepFlow({ type: "product_search", step: "suggestions", data: { category, budget, suggestions: affordable } });
      return;
    }
    
    // Step 3: Deploy sniper for selected product
    if (multiStepFlow.step === "suggestions" && multiStepFlow.data?.suggestions) {
      const selected = multiStepFlow.data.suggestions.find((s: any) => 
        command.toLowerCase().includes(s.name.toLowerCase().split(" ")[0]) ||
        command.toLowerCase().includes("iphone") && s.name.includes("iPhone") ||
        command.toLowerCase().includes("samsung") && s.name.includes("Samsung") ||
        command.toLowerCase().includes("macbook") && s.name.includes("MacBook")
      );
      
      if (selected) {
        const newSniper: Sniper = {
          id: Date.now(),
          targetName: selected.name,
          targetPrice: selected.target,
          currentPrice: selected.price,
          imageUrl: null,
          status: "tracking",
          userId: null,
          createdAt: new Date(),
        };
        addSniper(newSniper, selected.price, "ELECTRONICS");
        addAIMessage(`Mission deployed, Commander! I've started tracking **${selected.name}** with a target of ${formatCurrency(selected.target)}. I'll alert you when the price drops.`, "product_search");
        setMultiStepFlow(null);
      } else {
        addAIMessage("Commander, please specify which product you'd like to track. You can say 'iPhone', 'Samsung', or the product number.", "product_search");
      }
      return;
    }
  };

  // Modify/Update Sniper Handler (Full CRUD Autonomy)
  const handleModifySniper = (command: string) => {
    const lowerCommand = command.toLowerCase();
    
    // Extract product name
    const productMatch = command.match(/(?:update|change|modify|edit|set|adjust)\s+(?:the\s+)?([a-z\s]+?)(?:\s+(?:target|price|to))?/i);
    const productName = productMatch ? productMatch[1].trim() : null;
    
    if (!productName) {
      addAIMessage("Commander, please specify which product you'd like to modify. Example: 'Update Rolex target to ₹7,00,000'", "modify_product");
      return;
    }
    
    const sniper = findSniperByName(productName);
    if (!sniper) {
      addAIMessage(`Commander, I couldn't find **${productName}** in your active snipers.`, "modify_product");
      return;
    }
    
    // Extract new target price
    const priceMatch = command.match(/₹?\s*(\d+[,\d]*)/);
    const newTarget = priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : null;
    
    if (newTarget && newTarget > 0) {
      // Update target price in localStorage and sniper object
      const updatedSniper: Sniper = {
        ...sniper,
        targetPrice: newTarget as unknown as number,
      };
      
      // Delete old and add new (simulating update)
      deleteSniper(sniper.id);
      addSniper(updatedSniper, updatedSniper.currentPrice || newTarget, "ELECTRONICS");
      
      addAIMessage(`Commander, I've updated the target price for **${sniper.targetName}** to ${formatCurrency(newTarget)}. The mission parameters have been adjusted.`, "modify_product");
    } else {
      addAIMessage("Commander, please provide a valid target price. Example: 'Update Rolex target to ₹7,00,000'", "modify_product");
    }
  };

  // Handle voice input
  const handleMicClick = () => {
    if (!recognitionRef.current) {
      addAIMessage("At your service, Commander. Speech recognition is not available in your browser. Please type your commands instead.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  // Process commands
  const handleCommand = (command: string) => {
    const lowerCommand = command.toLowerCase().trim();

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: command,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // Simulate AI thinking
    setTimeout(() => {
      // PRIORITY 0: MULTI-INTENT HANDLING - Handle complex queries with multiple intents
      // Strict Intent Routing: Only mention flights when asked about flights, only snipers when asked about snipers
      const hasIdentityQuery = /who are you|what are you|identify yourself/i.test(command);
      // Strict Category Filtering: Flight keywords MUST route to flights array only
      const hasFlightStatusQuery = /flight|flights|logistics|mission|missions|bom|dxb|del|blr|sin|lhr|mumbai|dubai|delhi|london|bangalore|singapore|intercept|abort.*flight/i.test(command);
      // Sniper keywords (exclude 'mission' which is now flight-only)
      const hasSniperStatusQuery = /sniper|snipers|target|targets|product|products|shopping|rolex|nike|jordan|macbook|gaming.*chair|chair/i.test(command);
      
      // INTERCEPT command: Buy/Book flight - Check for pending confirmation first
      const hasInterceptCommand = /intercept|buy.*flight|book.*flight|purchase.*flight|book the flight|buy the flight/i.test(command);
      if (hasInterceptCommand || pendingQuestion === "intercept") {
        // Check if there's a pending intercept confirmation
        if (pendingQuestion === "intercept" && pendingInterceptFlight) {
          const confirmationKeywords = ["yes", "do it", "confirm", "proceed", "execute", "go ahead"];
          const rejectionKeywords = ["no", "cancel", "abort", "stop", "hold", "wait"];
          
          if (confirmationKeywords.some(keyword => lowerCommand.includes(keyword))) {
            // User confirmed - execute intercept
            const flight = trackedFlights?.find(f => f.id === pendingInterceptFlight);
            if (flight) {
              const currentPrice = Number(flight.currentPrice || flight.originalPrice);
              const originalPrice = Number(flight.originalPrice || currentPrice);
              const savings = originalPrice - currentPrice;
              
              // Execute INTERCEPT - open booking URL with affiliate tag
              const bookingUrl = `https://example.com/flights/${flight.originCode}-${flight.destinationCode}?price=${currentPrice}`;
              const separator = bookingUrl.includes('?') ? '&' : '?';
              const affiliateUrl = `${bookingUrl}${separator}tag=commander-21`;
              window.open(affiliateUrl, '_blank', 'noopener,noreferrer');
              
              // Add green pulse effect message with visual indicator
              addAIMessage(`🟢 **INTERCEPT EXECUTED** 🟢\n\nCommander, opening booking for ${flight.origin} (${flight.originCode}) → ${flight.destination} (${flight.destinationCode}) at ${formatCurrency(currentPrice)}. You're saving ${formatCurrency(savings)} on this flight.`, "general");
              
              // Trigger green pulse effect similar to Kill button
              const chatPanel = document.querySelector('[class*="bg-zinc-900/95"]') as HTMLElement;
              if (chatPanel) {
                // Add green pulse animation
                chatPanel.style.animation = 'pulse 2s infinite';
                chatPanel.style.boxShadow = '0 0 20px rgba(34, 197, 94, 0.8), 0 0 40px rgba(34, 197, 94, 0.4)';
                chatPanel.style.borderColor = 'rgba(34, 197, 94, 0.5)';
                setTimeout(() => {
                  chatPanel.style.animation = '';
                  chatPanel.style.boxShadow = '';
                  chatPanel.style.borderColor = '';
                }, 2000);
              }
              
              // Clear pending state
              setPendingQuestion(null);
              setPendingInterceptFlight(null);
            }
            return;
          } else if (rejectionKeywords.some(keyword => lowerCommand.includes(keyword))) {
            // User rejected
            addAIMessage("Understood, Commander. Intercept cancelled.", "general");
            setPendingQuestion(null);
            setPendingInterceptFlight(null);
            return;
          }
        }
        
        // New intercept request - require confirmation
        // Deep Intel: Search entire flights array for city matches
        if (trackedFlights && trackedFlights.length > 0 && !pendingQuestion) {
          // Try to find a specific flight based on city mentions
          const cityPatterns = [
            { name: "mumbai", codes: ["BOM"], keywords: ["mumbai", "bom", "dubai", "dxb"] },
            { name: "delhi", codes: ["DEL"], keywords: ["delhi", "del", "london", "lhr"] },
            { name: "bangalore", codes: ["BLR"], keywords: ["bangalore", "blr", "singapore", "sin"] },
          ];
          
          let matchedFlight = null;
          for (const city of cityPatterns) {
            const cityMentioned = city.keywords.some(keyword => 
              new RegExp(`\\b${keyword}\\b`, 'i').test(command)
            );
            if (cityMentioned) {
              matchedFlight = trackedFlights.find((f: any) => 
                city.codes.some(code => 
                  f.originCode === code || f.destinationCode === code
                )
              );
              if (matchedFlight) break;
            }
          }
          
          // Default to first flight if no specific match
          const flight = matchedFlight || trackedFlights[0];
          const currentPrice = Number(flight.currentPrice || flight.originalPrice);
          const originalPrice = Number(flight.originalPrice || currentPrice);
          const savings = originalPrice - currentPrice;
          
          // Ask for confirmation
          addAIMessage(`Commander, I found ${flight.origin} (${flight.originCode}) → ${flight.destination} (${flight.destinationCode}) at ${formatCurrency(currentPrice)}. You'll save ${formatCurrency(savings)}. Should I proceed with the intercept?`, "general");
          setPendingQuestion("intercept");
          setPendingInterceptFlight(flight.id);
        } else if (!trackedFlights || trackedFlights.length === 0) {
          addAIMessage("Commander, no tracked flight found to intercept. Please track a flight first.", "general");
        }
        return;
      }
      
      if (hasIdentityQuery && (hasFlightStatusQuery || hasSniperStatusQuery)) {
        // Multi-intent: Identity + Status - Use exact format requested
        // If just identity query, use the standard format
        if (!hasFlightStatusQuery && !hasSniperStatusQuery) {
      // Identity: Star's greeting must show exact counts (3 flights, 6 snipers, 2 active, 1 ghost)
      const flightCount = trackedFlights ? trackedFlights.length : 0;
      const sniperCount = localSnipers.length;
      // Subscription Purge: Filter out terminated subscriptions from counts
      const activeSubscriptions = subscriptions.filter((s: any) => s.status === "active" && s.isGhost !== true && s.status !== "terminated");
      const ghostSubscriptions = subscriptions.filter((s: any) => s.isGhost === true && s.status !== "terminated");
          
          const tacticalSummary = `I am Star, your tactical operative. Monitoring ${flightCount} flight${flightCount !== 1 ? 's' : ''}, ${sniperCount} sniper${sniperCount !== 1 ? 's' : ''}, ${activeSubscriptions.length} active subscription${activeSubscriptions.length !== 1 ? 's' : ''}, and ${ghostSubscriptions.length} ghost subscription${ghostSubscriptions.length !== 1 ? 's' : ''}.`;
          addAIMessage(tacticalSummary, "general");
          return;
        }
        
        let response = "I am Star, your tactical operative. ";
        
        if (hasFlightStatusQuery) {
          // Deep Intel: Array Search Logic - Search entire flights array for city matches
          // Extract city names from command
          const cityPatterns = [
            { name: "mumbai", codes: ["BOM", "Mumbai"], flight: null },
            { name: "dubai", codes: ["DXB", "Dubai"], flight: null },
            { name: "delhi", codes: ["DEL", "Delhi"], flight: null },
            { name: "london", codes: ["LHR", "London"], flight: null },
            { name: "bangalore", codes: ["BLR", "Bangalore"], flight: null },
            { name: "singapore", codes: ["SIN", "Singapore"], flight: null },
          ];
          
          // Find matching flight based on city mentions in command
          let matchedFlight = null;
          
          // Check for specific city mentions
          for (const city of cityPatterns) {
            const cityMentioned = city.codes.some(code => 
              new RegExp(`\\b${code}\\b|\\b${city.name}\\b`, 'i').test(command)
            );
            
            if (cityMentioned && trackedFlights) {
              // Search entire flights array for matching city
              matchedFlight = trackedFlights.find((f: any) => 
                city.codes.some(code => 
                  f.originCode === code || 
                  f.destinationCode === code ||
                  f.origin?.toLowerCase().includes(city.name) ||
                  f.destination?.toLowerCase().includes(city.name)
                )
              );
              
              if (matchedFlight) break;
            }
          }
          
          // If no specific city match, check for BOM->DXB (Mumbai->Dubai) as default
          if (!matchedFlight && trackedFlights) {
            matchedFlight = trackedFlights.find((f: any) => 
              (f.originCode === "BOM" && f.destinationCode === "DXB") ||
              (f.origin?.toLowerCase().includes("mumbai") && f.destination?.toLowerCase().includes("dubai"))
            );
          }
          
          if (matchedFlight) {
            const currentPrice = Number(matchedFlight.currentPrice || matchedFlight.originalPrice);
            const originalPrice = Number(matchedFlight.originalPrice || currentPrice);
            const savings = originalPrice - currentPrice;
            const savingsPercentage = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;
            
            response += `I am currently tracking your ${matchedFlight.originCode} -> ${matchedFlight.destinationCode} flight at ${formatCurrency(currentPrice)} (${savingsPercentage}% savings).`;
          } else if (trackedFlights && trackedFlights.length > 0) {
            // Fallback: Report all flights if no specific match
            const flightList = trackedFlights.map((f: any) => {
              const currentPrice = Number(f.currentPrice || f.originalPrice);
              return `${f.originCode} -> ${f.destinationCode} at ${formatCurrency(currentPrice)}`;
            }).join(", ");
            response += `I am tracking ${trackedFlights.length} flight${trackedFlights.length > 1 ? 's' : ''}: ${flightList}.`;
          } else {
            response += "No tracked flights found.";
          }
        }
        
        // Only mention snipers if explicitly asked about snipers (not flights)
        if (hasSniperStatusQuery && !hasFlightStatusQuery && localSnipers.length > 0) {
          response += ` You have ${localSnipers.length} active sniper${localSnipers.length > 1 ? 's' : ''} tracking.`;
        }
        
        addAIMessage(response.trim(), "general");
        return;
      }
      
      // PRIORITY: Subscription Queries - Handle active and ghost subscription queries
      // Intelligence Link: Filter by status: 'active' for active queries, isGhost: true for ghost queries
      const hasActiveSubscriptionQuery = /show.*active|list.*active|my.*active|active.*subscription/i.test(command);
      const hasGhostQuery = /ghost|ghosts|do i have.*ghost|any ghost|subscription.*ghost/i.test(command);
      
      if (hasActiveSubscriptionQuery) {
        // Filter for status: 'active' subscriptions
        const activeSubscriptions = subscriptions.filter((s: any) => s.status === "active");
        if (activeSubscriptions.length > 0) {
          const subscriptionList = activeSubscriptions.map((s: any) => 
            `**${s.name}** (${formatCurrency(s.price)})`
          ).join(", ");
          addAIMessage(`Commander, you have ${activeSubscriptions.length} active subscription${activeSubscriptions.length > 1 ? 's' : ''}: ${subscriptionList}.`, "general");
        } else {
          addAIMessage("Commander, no active subscriptions found.", "general");
        }
        return;
      }
      
      if (hasGhostQuery) {
        // Filter for isGhost: true subscriptions (regardless of status)
        const ghostSubscriptions = subscriptions.filter((s: any) => s.isGhost === true);
        if (ghostSubscriptions.length > 0) {
          // Identify Gym Membership (₹3,701) as the primary ghost target
          const gymMembership = ghostSubscriptions.find((s: any) => 
            s.name.toLowerCase().includes("gym") || s.name.toLowerCase().includes("membership")
          ) || ghostSubscriptions[0];
          
          addAIMessage(`Commander, I've identified ${ghostSubscriptions.length} Ghost subscription${ghostSubscriptions.length > 1 ? 's' : ''}. The primary target is **${gymMembership.name}** at ${formatCurrency(gymMembership.price)}. No activity detected in 30 days.`, "general");
        } else {
          addAIMessage("Commander, no Ghost subscriptions detected. All subscriptions are active.", "general");
        }
        // Anti-Double Prompt: Return immediately, no follow-up questions
        return;
      }
      
      // Execution Command: Handle 'Terminate' command for ghost subscriptions ONLY
      // Kill Override: Ensure 'Terminate' only applies to Gym Membership ghost subscription, NOT snipers
      const hasTerminateCommand = /terminate.*ghost|terminate.*subscription|terminate.*gym|kill.*ghost.*subscription|kill.*gym/i.test(command);
      const isTerminateConfirmation = pendingQuestion === "terminateGhost" && (
        /yes|confirm|execute|do it|proceed|go ahead/i.test(lowerCommand)
      );
      
      // Only process terminate if it's explicitly about ghost/subscription, not snipers
      if ((hasTerminateCommand || isTerminateConfirmation) && !/sniper|product|gaming.*chair|chair|rolex|nike|jordan/i.test(command)) {
        // Intelligence Link: Filter ghost subscriptions by isGhost: true
        const ghostSubscriptions = subscriptions.filter((s: any) => 
          s.isGhost === true && s.status !== "terminated"
        );
        
        if (isTerminateConfirmation && pendingQuestion === "terminateGhost") {
          // User confirmed termination
          const gymMembership = ghostSubscriptions.find((s: any) => 
            s.name.toLowerCase().includes("gym") || s.name.toLowerCase().includes("membership")
          ) || ghostSubscriptions[0];
          
          if (gymMembership) {
            terminateSubscription(gymMembership.id);
            addAIMessage(`Commander, **${gymMembership.name}** has been terminated. ₹${gymMembership.price.toLocaleString('en-IN')} has been added to Total Savings.`, "general");
            setPendingQuestion(null);
          }
          return;
        }
        
        if (ghostSubscriptions.length > 0) {
          const gymMembership = ghostSubscriptions.find((s: any) => 
            s.name.toLowerCase().includes("gym") || s.name.toLowerCase().includes("membership")
          ) || ghostSubscriptions[0];
          
          if (gymMembership) {
            addAIMessage(`Commander, I've identified **${gymMembership.name}** (₹${gymMembership.price.toLocaleString('en-IN')}) as a Ghost subscription. Should I terminate it? This will add ₹${gymMembership.price.toLocaleString('en-IN')} to your Total Savings.`, "general");
            setPendingQuestion("terminateGhost");
          }
        } else {
          addAIMessage("Commander, no active Ghost subscriptions found to terminate.", "general");
        }
        return;
      }
      
      // Undo/Restore Subscription: Handle undo commands for terminated subscriptions
      const hasUndoCommand = /undo|restore|bring back/i.test(command);
      const hasGymRestore = /restore.*gym|undo.*gym|bring back.*gym|gym.*restore|gym.*undo/i.test(command);
      if (hasUndoCommand || hasGymRestore) {
        // First, check if Gym is terminated (exists in localSavings as terminated-{id})
        const terminatedGym = localSavings.find((s: any) => 
          s.id.startsWith("terminated-") && 
          (s.title.toLowerCase().includes("gym") || s.title.toLowerCase().includes("membership"))
        );
        
        if (terminatedGym) {
          // Extract ID from terminated-{id} format
          const gymId = terminatedGym.id.replace("terminated-", "");
          restoreSubscription(gymId);
          addAIMessage(`Commander, **${terminatedGym.title}** has been restored to Active status. ₹${Number(terminatedGym.oldPrice).toLocaleString('en-IN')} has been subtracted from Total Savings.`, "general");
        } else {
          // Check if Gym exists in subscriptions (might already be active)
          const activeGym = subscriptions.find((s: any) => 
            (s.name.toLowerCase().includes("gym") || s.name.toLowerCase().includes("membership")) && s.status === "active"
          );
          if (activeGym) {
            addAIMessage(`Commander, **${activeGym.name}** is already Active. No action needed.`, "general");
          } else {
            addAIMessage("Commander, I couldn't find a terminated Gym Membership to restore. Please check your subscriptions.", "general");
          }
        }
        return;
      }
      
      // Strict Intent Routing: If asked about flights, ONLY report flights (ignore snipers)
      // Deep Intel: Array Search Logic - Search entire flights array for city matches
      if (hasFlightStatusQuery && !hasIdentityQuery) {
        // Extract city names from command for intelligent matching
        const cityPatterns = [
          { name: "mumbai", codes: ["BOM", "Mumbai"], keywords: ["mumbai", "bom"] },
          { name: "dubai", codes: ["DXB", "Dubai"], keywords: ["dubai", "dxb"] },
          { name: "delhi", codes: ["DEL", "Delhi"], keywords: ["delhi", "del"] },
          { name: "london", codes: ["LHR", "London"], keywords: ["london", "lhr"] },
          { name: "bangalore", codes: ["BLR", "Bangalore"], keywords: ["bangalore", "blr", "bengaluru"] },
          { name: "singapore", codes: ["SIN", "Singapore"], keywords: ["singapore", "sin"] },
        ];
        
        // Find matching flight based on city mentions in command
        let matchedFlight = null;
        
        // Check for specific city mentions in the command
        for (const city of cityPatterns) {
          const cityMentioned = city.keywords.some(keyword => 
            new RegExp(`\\b${keyword}\\b`, 'i').test(command)
          );
          
          if (cityMentioned && trackedFlights) {
            // Search entire flights array for matching city (origin or destination)
            matchedFlight = trackedFlights.find((f: any) => 
              city.codes.some(code => 
                f.originCode === code || 
                f.destinationCode === code ||
                f.origin?.toLowerCase().includes(city.name) ||
                f.destination?.toLowerCase().includes(city.name)
              )
            );
            
            if (matchedFlight) break;
          }
        }
        
        // If no specific city match, check for BOM->DXB (Mumbai->Dubai) as default
        if (!matchedFlight && trackedFlights) {
          matchedFlight = trackedFlights.find((f: any) => 
            (f.originCode === "BOM" && f.destinationCode === "DXB") ||
            (f.origin?.toLowerCase().includes("mumbai") && f.destination?.toLowerCase().includes("dubai"))
          );
        }
        
        if (matchedFlight) {
          const currentPrice = Number(matchedFlight.currentPrice || matchedFlight.originalPrice);
          const originalPrice = Number(matchedFlight.originalPrice || currentPrice);
          const savings = originalPrice - currentPrice;
          const savingsPercentage = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;
          
          addAIMessage(`Commander, your ${matchedFlight.originCode} -> ${matchedFlight.destinationCode} flight is currently at ${formatCurrency(currentPrice)} (${savingsPercentage}% savings from original ${formatCurrency(originalPrice)}).`, "general");
        } else if (trackedFlights && trackedFlights.length > 0) {
          // Report all flights if no specific match
          const flightList = trackedFlights.map((f: any) => {
            const currentPrice = Number(f.currentPrice || f.originalPrice);
            const originalPrice = Number(f.originalPrice || currentPrice);
            const savingsPercentage = originalPrice > 0 ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
            return `${f.originCode} -> ${f.destinationCode} at ${formatCurrency(currentPrice)} (${savingsPercentage}% savings)`;
          }).join(", ");
          addAIMessage(`Commander, I'm tracking ${trackedFlights.length} flight${trackedFlights.length > 1 ? 's' : ''}: ${flightList}.`, "general");
        } else {
          addAIMessage("Commander, no tracked flights found.", "general");
        }
        return;
      }
      
      // Strict Category Filtering: If flight keywords detected, skip product matching entirely
      // This prevents flight queries from falling through to sniper/product handlers
      if (hasFlightStatusQuery) {
        // Deep Search Implementation: Case-insensitive search for specific flights
        const cityPatterns = [
          { name: "london", codes: ["LHR"], keywords: ["london", "lhr"], route: "DEL -> LHR" },
          { name: "singapore", codes: ["SIN"], keywords: ["singapore", "sin"], route: "BLR -> SIN" },
          { name: "dubai", codes: ["DXB"], keywords: ["dubai", "dxb"], route: "BOM -> DXB" },
          { name: "mumbai", codes: ["BOM"], keywords: ["mumbai", "bom"], route: "BOM -> DXB" },
          { name: "delhi", codes: ["DEL"], keywords: ["delhi", "del"], route: "DEL -> LHR" },
          { name: "bangalore", codes: ["BLR"], keywords: ["bangalore", "blr", "bengaluru"], route: "BLR -> SIN" },
        ];
        
        let matchedFlight = null;
        for (const city of cityPatterns) {
          const cityMentioned = city.keywords.some(keyword => 
            new RegExp(`\\b${keyword}\\b`, 'i').test(command)
          );
          
          if (cityMentioned && trackedFlights) {
            matchedFlight = trackedFlights.find((f: any) => 
              city.codes.some(code => 
                f.originCode === code || 
                f.destinationCode === code ||
                f.origin?.toLowerCase().includes(city.name) ||
                f.destination?.toLowerCase().includes(city.name)
              )
            );
            
            if (matchedFlight) break;
          }
        }
        
        // Default to first flight if no specific match but flight keywords present
        if (!matchedFlight && trackedFlights && trackedFlights.length > 0) {
          matchedFlight = trackedFlights[0];
        }
        
        if (matchedFlight) {
          const currentPrice = Number(matchedFlight.currentPrice || matchedFlight.originalPrice);
          const originalPrice = Number(matchedFlight.originalPrice || currentPrice);
          const savings = originalPrice - currentPrice;
          const savingsPercentage = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;
          
          // Flight Search & Intercept: When asked about any flight, MUST respond with price and follow-up question
          // Dialogue Lockdown: Priority - ALWAYS append intercept phrase when flight is found
          const statusMessage = `Commander, your ${matchedFlight.originCode} -> ${matchedFlight.destinationCode} flight is currently at ${formatCurrency(currentPrice)} (${savingsPercentage}% savings from original ${formatCurrency(originalPrice)}). Commander, shall we INTERCEPT or HOLD?`;
          addAIMessage(statusMessage, "general", { flightOptions: { flightId: matchedFlight.id, flight: matchedFlight } });
        } else {
          addAIMessage("Commander, no tracked flights found matching your query.", "general");
        }
        return; // Exit immediately - do NOT fall through to product matching
      }
      
      // PRIORITY 1: FUZZY PRODUCT MATCHING - Extract product name from command first
      // This prioritizes product names even if other words are confusing
      // Only runs if flight keywords were NOT detected
      const matchedProductResult = extractProductFromCommand(command);
      
      // PRIORITY 2: INTENT MAPPING - Check for price-related intents (with typo tolerance)
      // Contextual Auto-Correct: Map 'difrence' or 'savngs' to Math Intent
      const cleanedForIntent = cleanInput(command);
      const priceRelatedKeywords = [
        "price difference", "price of", "difference", "difrence", "diference",
        "saved", "save", "saving", "savings", "savngs", "savng",
        "cheaper", "cheap", "deal", "deals", "what's the deal", "whats the deal",
        "any cheaper", "cheaper than", "cheaper than before", "is cheaper", "get cheaper",
        "how much", "cost", "amount", "money", "compare", "comparison"
      ];
      
      const hasPriceKeyword = priceRelatedKeywords.some(keyword => cleanedForIntent.includes(keyword));
      
      // If product found AND price-related keyword present, route to price difference handler
      if (matchedProductResult && hasPriceKeyword) {
        handlePriceDifference(undefined, matchedProductResult.sniper, matchedProductResult.correctedInput);
        return; // Exit immediately
      }
      
      // No More 'Not Sure': If product found, ignore stop words like 'looking' and 'how'
      // Focus only on the keyword (e.g., 'Jordan'). If match found, give price report immediately
      if (matchedProductResult) {
        // The Data Bridge: Immediately pull currentPrice and originalPrice from missions array
        // No need to check intent - if product keyword found, report price immediately
        handlePriceDifference(undefined, matchedProductResult.sniper, matchedProductResult.correctedInput);
        return;
      }
      
      // PRIORITY 3: Pattern-based extraction (fallback for edge cases)
      const priceDiffPatterns = [
        /price\s+difference\s+of\s+(.+)/i,
        /how\s+much\s+did\s+(?:i|you)\s+save\s+(?:on|with|for)\s+(.+)/i,
        /difference\s+of\s+(.+)/i,
        /price\s+of\s+(.+)/i,
        /how\s+much\s+saved\s+(?:on|with|for)\s+(.+)/i,
        /(?:what|tell me)\s+(?:is|about)\s+the\s+price\s+(?:of|for)\s+(.+)/i,
        /(?:price|difference|saved)\s+(?:for|on|with)\s+(.+)/i,
        /how\s+much\s+can\s+(?:i|you)\s+save\s+(?:on|with|for)?\s*(.+)/i
      ];
      
      for (const pattern of priceDiffPatterns) {
        const match = command.match(pattern);
        if (match && match[1]) {
          const extractedName = cleanProductName(match[1]);
          if (extractedName && extractedName.length > 0) {
            const sniper = findSniperByName(extractedName);
            if (sniper) {
              handlePriceDifference(undefined, sniper);
              return;
            }
            
            // Try fuzzy matching if exact match failed
            const fuzzyMatches = fuzzyMatchProduct(extractedName);
            if (fuzzyMatches.length === 1) {
              handlePriceDifference(undefined, fuzzyMatches[0].sniper, fuzzyMatches[0].correctedInput);
              return;
            }
          }
        }
      }
      
      // Detect intent using NLU (do this once and reuse)
      const intentResult = detectIntent(command);
      const { intent, confidence } = intentResult;
      
      // PRIORITY 4: Smart Intent Recognition - If "How are they looking" or "Any news" detected
      // Check all products and report price status
      if (intent === "price_difference" && localSnipers.length > 0) {
        // Check for "How are they looking" or "Any news" - these should check all products
        const statusPhrases = ["how are they looking", "how are they", "any news", "what's the deal"];
        const isStatusQuery = statusPhrases.some(phrase => lowerCommand.includes(phrase));
        
        if (isStatusQuery && localSnipers.length > 1) {
          // Multiple products - check if a specific product was mentioned
          if (matchedProductResult) {
            handlePriceDifference(undefined, matchedProductResult.sniper, matchedProductResult.correctedInput);
            return;
          } else {
            // No specific product - provide status for all or ask which one
            const productList = localSnipers.map(s => `**${s.targetName}**`).join(", ");
            addAIMessage(`I see ${localSnipers.length} products in your feed: ${productList}. Which one would you like me to check, Commander?`, "price_difference");
            return;
          }
        }
        
        // If only one sniper, use it
        if (localSnipers.length === 1) {
          handlePriceDifference(undefined, localSnipers[0]);
          return;
        }
        // If multiple snipers and product found, use it
        if (matchedProductResult) {
          handlePriceDifference(undefined, matchedProductResult.sniper, matchedProductResult.correctedInput);
          return;
        }
      }
      
      // Handle multi-step flows
      if (multiStepFlow) {
        if (intent === "hold" || lowerCommand.includes("cancel") || lowerCommand.includes("abort")) {
          setMultiStepFlow(null);
          addAIMessage("At your service, Commander. Cancelled the product search.", "product_search");
          return;
        }
        handleMultiStepProductSearch(command);
        return;
      }
      
      // Route by intent for new commands
      if (intent === "add_product" && confidence > 0.8) {
        // Check for "I need a new phone" type requests
        if (lowerCommand.includes("need") || lowerCommand.includes("want") || lowerCommand.includes("looking for")) {
          const phoneMatch = lowerCommand.match(/(?:need|want|looking for|get)\s+(?:a\s+)?(?:new\s+)?(phone|smartphone|mobile|laptop|watch|computer)/i);
          if (phoneMatch) {
            handleMultiStepProductSearch(command);
            return;
          }
        }
        // Regular product add
        const productMatch = command.match(/(?:find|search|look for|i need|i want|add|create|new)\s+(?:a|an|the)?\s*([a-z]+(?:\s+[a-z]+)*)/i);
        if (productMatch && productMatch[1]) {
          const detectedProduct = productMatch[1].trim();
          const commandKeywords = ["find", "kill", "clear", "status", "analyze", "display", "show", "list"];
          if (!commandKeywords.some(keyword => detectedProduct.toLowerCase().includes(keyword))) {
            handleSmartProductAdd(detectedProduct);
            return;
          }
        }
      }
      
      if (intent === "modify_product" && confidence > 0.7) {
        handleModifySniper(command);
        return;
      }
      
      if (intent === "delete_product" && confidence > 0.7) {
        const productMatch = command.match(/(?:delete|remove|cancel|drop|abandon)\s+(?:the\s+)?([a-z\s]+)/i);
        if (productMatch && productMatch[1]) {
          const sniper = findSniperByName(productMatch[1].trim());
          if (sniper) {
            deleteSniper(sniper.id);
            addAIMessage(`At your service, Commander. I've removed **${sniper.targetName}** from your active snipers.`, "delete_product");
            return;
          }
        }
      }
      
      // Price difference is now handled at the top priority, so this section is removed
      
      if (intent === "status" && confidence > 0.8) {
        handleStatusReport();
        return;
      }
      
      if (intent === "analyze" && confidence > 0.8) {
        analyzeMissions();
        return;
      }
      
      // Implement General Small Talk (Communication)
      // General Intent: Handle greetings and casual conversation
      const generalGreetings = ["hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening"];
      const howAreYouPhrases = ["how are you", "how are things", "how's it going", "hows it going", "how do you do"];
      const whatCanYouDoPhrases = ["what can you do", "what do you do", "help", "what are your capabilities", "what are you", "who are you"];
      const summarizePhrases = ["summarize", "summary", "summarize my missions", "mission summary"];
      const exitPhrases = ["thanks", "thank you", "bye", "goodbye", "see you", "later"];
      
      const isGreeting = generalGreetings.some(greeting => lowerCommand.includes(greeting));
      const isHowAreYou = howAreYouPhrases.some(phrase => lowerCommand.includes(phrase));
      const isWhatCanYouDo = whatCanYouDoPhrases.some(phrase => lowerCommand.includes(phrase));
      const isSummarize = summarizePhrases.some(phrase => lowerCommand.includes(phrase));
      const isExit = exitPhrases.some(phrase => lowerCommand.includes(phrase));
      
      // Unique Sign-offs: When user says 'Thanks', reply with unique responses
      if (isExit) {
        const exitResponses = [
          "Always watching the shadows for you, Commander.",
          "Standing by for the next price drop, Commander.",
          "Happy hunting, Commander!",
          "Standing by for your next strike, Commander.",
          "Mission control is always ready. Until next time, Commander!",
          "Excellent work today, Commander. I'll be here when you need me.",
          "Ready to strike when you are, Commander. Until then!"
        ];
        // Dynamic Personality (The Randomizer): Use Math.floor(Math.random() * length) for unique response
        const randomIndex = Math.floor(Math.random() * exitResponses.length);
        const randomExit = exitResponses[randomIndex];
        addAIMessage(randomExit, "general");
        return;
      }
      
      // Smart Summaries: Handle summarize command
      if (isSummarize) {
        handleSmartSummary();
        return;
      }
      
      // Small Talk Enhancement: Expand greeting logic with market status
      if (lowerCommand.includes("good morning") || lowerCommand.includes("good afternoon") || lowerCommand.includes("good evening")) {
        // Find highest priority target (one with price drop, or first one)
        const originalPrices = JSON.parse(localStorage.getItem("sniper-original-prices") || "{}");
        const discounted = localSnipers.filter(s => {
          const original = Number(originalPrices[s.id] ?? (s.currentPrice ? Number(s.currentPrice) : Number(s.targetPrice)));
          const current = s.currentPrice ? Number(s.currentPrice) : original;
          return current < original;
        });
        
        const priorityTarget = discounted.length > 0 ? discounted[0] : (localSnipers.length > 0 ? localSnipers[0] : null);
        
        if (priorityTarget) {
          const timeOfDay = lowerCommand.includes("good morning") ? "Good morning" : 
                           lowerCommand.includes("good afternoon") ? "Good afternoon" : "Good evening";
          const targetName = priorityTarget.targetName.toLowerCase();
          if (targetName.includes("rolex")) {
            addAIMessage(`${timeOfDay}, Commander. The markets have been busy. The **Rolex** is currently your highest priority target. How can I assist?`, "general");
          } else if (targetName.includes("jordan") || targetName.includes("nike")) {
            addAIMessage(`${timeOfDay}, Commander. The markets have been busy. The **Nike Jordans** are currently your highest priority target. How can I assist?`, "general");
          } else {
            addAIMessage(`${timeOfDay}, Commander. The markets have been busy. The **${priorityTarget.targetName}** is currently your highest priority target. How can I assist?`, "general");
          }
        } else {
          const timeOfDay = lowerCommand.includes("good morning") ? "Good morning" : 
                           lowerCommand.includes("good afternoon") ? "Good afternoon" : "Good evening";
          addAIMessage(`${timeOfDay}, Commander. The markets have been busy. You currently have no active missions. How can I assist?`, "general");
        }
        return;
      }
      
      if (isHowAreYou || (isGreeting && lowerCommand.length < 20)) {
        // Identity Update: Exact format - 'I am Star, your tactical operative. Monitoring 3 flights, 6 snipers, 2 active subscriptions, and 1 ghost subscription.'
        // Identity Check: Ensure counts exclude terminated subscriptions
        const flightCount = trackedFlights ? trackedFlights.length : 0;
        const sniperCount = localSnipers.length;
        const activeSubscriptions = subscriptions.filter((s: any) => s.status === "active" && s.isGhost !== true && s.status !== "terminated");
        const ghostSubscriptions = subscriptions.filter((s: any) => s.isGhost === true && s.status !== "terminated");
        
        const tacticalSummary = `I am Star, your tactical operative. Monitoring ${flightCount} flight${flightCount !== 1 ? 's' : ''}, ${sniperCount} sniper${sniperCount !== 1 ? 's' : ''}, ${activeSubscriptions.length} active subscription${activeSubscriptions.length !== 1 ? 's' : ''}, and ${ghostSubscriptions.length} ghost subscription${ghostSubscriptions.length !== 1 ? 's' : ''}.`;
        addAIMessage(tacticalSummary, "general");
        return;
      }
      
      if (isWhatCanYouDo) {
        // Capability Menu: Dynamic response based on active missions
        const activeMissionCount = localSnipers.length;
        // Get real-time flight count from global state
        const flightCount = trackedFlights ? trackedFlights.length : 0;
        const activeSubscriptions = subscriptions.filter((s: any) => s.status === "active" && s.isGhost !== true);
        const ghostSubscriptions = subscriptions.filter((s: any) => s.isGhost === true && s.status !== "terminated");
        
        let response = `I'm Star, your tactical AI assistant. I can analyze price differences, execute purchase orders, track flights, and give you status reports. `;
        response += `I am monitoring ${flightCount} flight${flightCount !== 1 ? 's' : ''}, ${activeMissionCount} sniper${activeMissionCount > 1 ? 's' : ''}, ${activeSubscriptions.length} active subscription${activeSubscriptions.length !== 1 ? 's' : ''}, and ${ghostSubscriptions.length} ghost subscription${ghostSubscriptions.length !== 1 ? 's' : ''}. `;
        response += `How can I assist you, Commander?`;
        addAIMessage(response, "general");
        return;
      }
      
      if (intent === "clear" && confidence > 0.8) {
        handleClearActive();
        return;
      }
      
      if (intent === "other_products" && confidence > 0.7) {
        handleOtherProducts();
        return;
      }
      
      // Check for contextual responses when lastSuggestedAction is set (using intent)
      if (lastSuggestedAction !== null) {
        const confirmationKeywords = ["yes", "do it", "confirm", "proceed", "execute", "go ahead", "display them", "show them", "list them"];
        const rejectionKeywords = ["no", "cancel", "abort", "stop", "hold", "wait"];
        const killKeywords = ["kill", "kill it", "kill now", "kill the", "execute kill"];
        
        // Special case: lastSuggestedAction = -1 means display discounted items
        if (lastSuggestedAction === -1) {
          if (confirmationKeywords.some(keyword => lowerCommand.includes(keyword))) {
            handleDisplayDiscountedItems();
            setLastSuggestedAction(null);
            return;
          } else if (rejectionKeywords.some(keyword => lowerCommand.includes(keyword))) {
            setLastSuggestedAction(null);
            // Confirmation Safety: Do NOT ask unrequested follow-up questions
            return;
          }
        } else if (currentDiscountedItem !== null) {
          // Handle discounted item kill confirmation
          const executeKeywords = ["yes", "execute", "do it", "kill", "kill it", "proceed"];
          const waitKeywords = ["no", "wait", "hold", "not yet", "later"];
          
          if (executeKeywords.some(keyword => lowerCommand.includes(keyword))) {
            // Execute kill for discounted item - Single action confirmation
            handleKillById(currentDiscountedItem, true);
            setCurrentDiscountedItem(null);
            setPendingQuestion(null);
            setLastSuggestedAction(null); // Clear to prevent double execution
            return;
          } else if (waitKeywords.some(keyword => lowerCommand.includes(keyword))) {
            // User wants to wait - check if there's a price drop
            const sniper = localSnipers.find(s => s.id === currentDiscountedItem);
            if (sniper) {
              const originalPrices = JSON.parse(localStorage.getItem("sniper-original-prices") || "{}");
              const originalPrice = Number(originalPrices[sniper.id] ?? (sniper.currentPrice ? Number(sniper.currentPrice) : Number(sniper.targetPrice)));
              const currentPrice = sniper.currentPrice ? Number(sniper.currentPrice) : originalPrice;
              const priceChange = originalPrice - currentPrice;
              
              // Only say "Maintaining sniper position" if price change is exactly zero
              if (priceChange === 0) {
                addAIMessage("Understood, Commander. Maintaining sniper position. I will alert you if the price drops further.");
              } else {
                // There's a price drop - report savings and ask about kill
                // Prevent Memory Overlap: Rename savedAmount to currentSavings
                const currentSavings = Math.max(0, priceChange);
                addAIMessage(`Excellent catch on that price drop, Commander. The **${sniper.targetName}** was ${formatCurrency(originalPrice)} and is now ${formatCurrency(currentPrice)}. You have saved ${formatCurrency(currentSavings)} so far. Would you like to execute the kill at this price?`);
                // Keep the context for potential kill
                setLastSuggestedAction(sniper.id);
                setPendingQuestion("kill");
                return;
              }
            } else {
              addAIMessage("Understood, Commander. Maintaining sniper position. I will alert you if the price drops further.");
            }
            setCurrentDiscountedItem(null);
            setLastSuggestedAction(null);
            setPendingQuestion(null);
            // Confirmation Safety: Do NOT ask unrequested follow-up questions
            return;
          }
        } else if (pendingQuestion === "checkOther") {
          // Handle "check for other price drops" question
          if (confirmationKeywords.some(keyword => lowerCommand.includes(keyword))) {
            // User wants to see other price drops
            handleDisplayAllPriceDrops();
            setPendingQuestion(null);
            return;
          } else if (rejectionKeywords.some(keyword => lowerCommand.includes(keyword))) {
            setPendingQuestion(null);
            addAIMessage("Understood, Commander.");
            return;
          }
        } else if (pendingQuestion === "kill") {
          // Normal kill confirmation flow - Single action confirmation
          if (confirmationKeywords.some(keyword => lowerCommand.includes(keyword))) {
            // User confirmed - proceed with kill for THIS specific item only
            handleKillById(lastSuggestedAction, true);
            setPendingQuestion(null);
            setLastSuggestedAction(null); // Clear after execution to prevent double execution
            return;
          } else if (rejectionKeywords.some(keyword => lowerCommand.includes(keyword))) {
            // User rejected - clear memory and provide proactive follow-up
            setLastSuggestedAction(null);
            setPendingQuestion(null);
            // Confirmation Safety: Do NOT ask unrequested follow-up questions
            return;
          } else if (killKeywords.some(keyword => lowerCommand.includes(keyword))) {
            // User said "kill" - double check before proceeding
            handleKillById(lastSuggestedAction, false);
            setPendingQuestion("kill");
            return;
          }
        }
      }
      
      // Check if command contains "kill" without product name - use top target
      if (lowerCommand.includes("kill") && !lowerCommand.startsWith("kill ")) {
        // Just "kill" or "kill it" - use closest/top target
        if (localSnipers.length > 0) {
          // Find closest sniper to target
          let closestSniper: Sniper | null = null;
          let smallestGap = Infinity;
          
          localSnipers.forEach((sniper) => {
            const targetPrice = Number(sniper.targetPrice);
            const currentPrice = sniper.currentPrice ? Number(sniper.currentPrice) : targetPrice;
            const gap = Math.abs(currentPrice - targetPrice);
            
            if (gap < smallestGap) {
              smallestGap = gap;
              closestSniper = sniper;
            }
          });
          
          if (closestSniper) {
            handleKillById(closestSniper.id, false);
            return;
          }
        }
      }
      
      // Price difference is now handled at PRIORITY 1 (top of function), so this duplicate check is removed
      
      // Check for multi-product inquiries
      const otherProductsKeywords = ["other products", "other deals", "other items", "any other", "what about", "show me other"];
      if (otherProductsKeywords.some(keyword => lowerCommand.includes(keyword))) {
        handleOtherProducts();
        return;
      }
      
      // Check for display/filter commands
      const displayKeywords = ["display them", "show them", "list them", "show these", "display these"];
      if (displayKeywords.some(keyword => lowerCommand.includes(keyword)) && discountedItems.length > 0) {
        handleDisplayDiscountedItems();
        return;
      }
      
      // Smart product name detection - check if user mentioned a product name
      const productNamePattern = /(?:i want|looking for|need|find|search for|add)\s+(?:a|an|the)?\s*([a-z]+(?:\s+[a-z]+)*)/i;
      const productMatch = command.match(productNamePattern);
      if (productMatch && productMatch[1]) {
        const detectedProduct = productMatch[1].trim();
        // Check if it's not already a command keyword
        const commandKeywords = ["find", "kill", "clear", "status", "analyze", "display", "show", "list"];
        if (!commandKeywords.some(keyword => detectedProduct.toLowerCase().includes(keyword))) {
          handleSmartProductAdd(detectedProduct);
          return;
        }
      }
      
      // Check if user is providing target price for pending sniper add
      if (pendingAction?.type === "addSniperWithTarget") {
        const targetPrice = parseTargetPrice(command);
        if (targetPrice) {
          const { name, currentPrice } = pendingAction.data;
          const newSniper: Sniper = {
            id: Date.now(),
            targetName: name,
            targetPrice: targetPrice as unknown as number,
            currentPrice: currentPrice as unknown as number,
            imageUrl: null,
            status: "tracking",
            userId: null,
            createdAt: new Date(),
          };
          addSniper(newSniper, currentPrice, "ELECTRONICS");
          addAIMessage(`Excellent, Commander! **${name}** sniper mission deployed. Target: ${formatCurrency(targetPrice)}. I'll monitor the price and alert you when it drops.`);
          setPendingAction(null);
          // Confirmation Safety: Do NOT ask unrequested follow-up questions
          return;
        } else {
          addAIMessage("Commander, I couldn't parse that target price. Please provide a valid amount (e.g., '₹1,25,000' or '125000').");
          return;
        }
      }
      
      // Standard command handling
      if (lowerCommand.startsWith("find ")) {
        handleFindCommand(command.substring(5).trim());
      } else if (lowerCommand.startsWith("kill ")) {
        // Handle "Kill [Product]" or "Kill the [Product]"
        const productName = lowerCommand.replace(/^kill\s+(the\s+)?/i, "").trim();
        handleKillCommand(productName);
      } else if (lowerCommand === "clear active" || lowerCommand === "clear all") {
        handleClearActive();
      } else if (lowerCommand === "status report" || lowerCommand === "status") {
        handleStatusReport();
      } else if (lowerCommand === "analyze missions" || lowerCommand === "analyze") {
        analyzeMissions();
      } else {
        // Concierge Persona: Eliminate 'I didn't understand' messages
        // Provide helpful suggestions based on available products
        // Error-Free Fallback: If question is truly unrecognizable, do not crash
        const productNames = localSnipers.map(s => s.targetName);
        if (productNames.length === 0) {
          addAIMessage("At your service, Commander. You currently have no active snipers. Would you like me to help you add a product to track?", "unknown");
        } else if (productNames.length === 1) {
          addAIMessage(`I couldn't quite map that to a mission, Commander. Would you like a status report on the **${productNames[0]}** instead?`, "unknown");
        } else if (productNames.length === 2) {
          // Check if one is Rolex and one is Jordan
          const hasRolex = productNames[0].toLowerCase().includes("rolex") || productNames[1].toLowerCase().includes("rolex");
          const hasJordan = productNames[0].toLowerCase().includes("jordan") || productNames[0].toLowerCase().includes("nike") ||
                           productNames[1].toLowerCase().includes("jordan") || productNames[1].toLowerCase().includes("nike");
          if (hasRolex && hasJordan) {
            addAIMessage(`I couldn't quite map that to a mission, Commander. Would you like a status report on the **Rolex** or the **Jordans** instead?`, "unknown");
          } else {
            addAIMessage(`I couldn't quite map that to a mission, Commander. Would you like a status report on the **${productNames[0]}** or the **${productNames[1]}** instead?`, "unknown");
          }
        } else {
          // Find Rolex and Jordan if they exist
          const rolexProduct = productNames.find(p => p.toLowerCase().includes("rolex"));
          const jordanProduct = productNames.find(p => p.toLowerCase().includes("jordan") || p.toLowerCase().includes("nike"));
          if (rolexProduct && jordanProduct) {
            addAIMessage(`I couldn't quite map that to a mission, Commander. Would you like a status report on the **Rolex** or the **Jordans** instead?`, "unknown");
          } else {
            const firstTwo = productNames.slice(0, 2).map(name => `**${name}**`).join(" or the ");
            addAIMessage(`I couldn't quite map that to a mission, Commander. Would you like a status report on the ${firstTwo} instead?`, "unknown");
          }
        }
      }
    }, 500);
  };

  // Clean the 'Funky' Input: Strip special characters and extra spaces
  const cleanInput = (text: string): string => {
    // Step 1: Convert to lowercase
    let cleaned = text.toLowerCase();
    
    // Step 2: Strip special characters (keep only letters, numbers, and spaces)
    cleaned = cleaned.replace(/[^a-z0-9\s]/g, " ");
    
    // Step 3: Remove extra spaces (replace multiple spaces with single space)
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    
    return cleaned;
  };

  // Funky Phrase Filtering: Clean input by ignoring stop words
  // No More 'Not Sure': Ignore stop words like 'looking' and 'how' - focus only on keywords
  // Example: 'How are the Jordans looking before?' → extracts ONLY 'Jordan'
  const cleanProductName = (text: string): string => {
    // First, clean the input (strip special chars and extra spaces)
    const cleanedInput = cleanInput(text);
    
    // Stop words to ignore when searching for product names
    // No More 'Not Sure': Ignore 'looking', 'how', 'are', 'the' - focus on product keywords
    const ignoreWords = [
      "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
      "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
      "what", "what's", "whats", "which", "who", "where", "when", "why", "how",
      "this", "that", "these", "those", "it", "its", "they", "them",
      "before", "now", "then", "after", "later", "still", "yet", "already",
      "deal", "deals", "price", "prices", "cheaper", "cheap", "expensive", "cost", "costs",
      "save", "saved", "saving", "difference", "different", "compare", "comparison",
      "on", "in", "at", "for", "with", "from", "to", "of", "about", "by",
      "any", "some", "all", "every", "each", "both", "either", "neither",
      "can", "may", "might", "must", "shall", "should", "ought",
      // No More 'Not Sure': Additional stop words - ignore 'looking', 'how', 'are'
      "looking", "look", "looks", "status", "report", "summary", "overview",
      "news", "update", "updates", "check", "checking", "checked"
    ];
    
    // Split text into words and filter out ignore words
    const words = cleanedInput.split(/\s+/).filter(word => {
      const trimmed = word.trim();
      return trimmed.length > 0 && !ignoreWords.includes(trimmed);
    });
    
    return words.join(" ").trim();
  };

  // Implement Fuzzy Matching: Levenshtein distance for typo tolerance
  const levenshteinDistance = (str1: string, str2: string): number => {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,     // deletion
            dp[i][j - 1] + 1,     // insertion
            dp[i - 1][j - 1] + 1  // substitution
          );
        }
      }
    }
    
    return dp[m][n];
  };

  // Calculate similarity score (0-1, where 1 is perfect match)
  const similarityScore = (str1: string, str2: string): number => {
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1;
    const distance = levenshteinDistance(str1, str2);
    return 1 - (distance / maxLen);
  };

  // Contextual Auto-Correct: Map common typos to correct words
  const autoCorrectTypo = (word: string): string => {
    const typoMap: Record<string, string> = {
      // Rolex typos
      "rilex": "rolex",
      "rolx": "rolex",
      "rolexx": "rolex",
      "role": "rolex",
      // Jordan typos
      "jordens": "jordans",
      "jordanss": "jordans",
      "jordan": "jordans",
      "jordn": "jordans",
      "jord": "jordans",
      // Nike typos
      "nike": "nike",
      "nik": "nike",
      // Watch typos
      "wach": "watch",
      "watc": "watch",
      "wath": "watch",
      // Intent typos
      "difrence": "difference",
      "savngs": "savings",
      "savings": "savings",
      "savng": "savings"
    };
    
    const lowerWord = word.toLowerCase();
    return typoMap[lowerWord] || word;
  };

  // Implement Alias Mapping: Comprehensive dictionary for product recognition
  const getProductAliases = (): Map<string, string> => {
    const aliases = new Map<string, string>();
    
    // Build alias map from existing snipers
    for (const sniper of localSnipers) {
      const sniperNameLower = sniper.targetName.toLowerCase();
      
      // Nike Jordan aliases: 'Jordans', 'Nike', 'Shoes' = Nike Air Jordan
      if (sniperNameLower.includes("nike") && sniperNameLower.includes("jordan")) {
        aliases.set("jordans", sniper.targetName);
        aliases.set("jordan", sniper.targetName);
        aliases.set("nike", sniper.targetName);
        aliases.set("nike jordan", sniper.targetName);
        aliases.set("nike air jordan", sniper.targetName);
        aliases.set("the shoes", sniper.targetName);
        aliases.set("shoes", sniper.targetName);
        aliases.set("sneakers", sniper.targetName);
        aliases.set("sneaker", sniper.targetName);
        aliases.set("air jordan", sniper.targetName);
        aliases.set("air jordans", sniper.targetName);
      }
      
      // Rolex aliases: 'Rolex', 'Watch', 'Luxury' = Rolex Submariner
      if (sniperNameLower.includes("rolex")) {
        aliases.set("rolex", sniper.targetName);
        aliases.set("the watch", sniper.targetName);
        aliases.set("watch", sniper.targetName);
        aliases.set("watches", sniper.targetName);
        aliases.set("luxury", sniper.targetName);
        aliases.set("luxury watch", sniper.targetName);
        if (sniperNameLower.includes("submariner")) {
          aliases.set("submariner", sniper.targetName);
        }
      }
      
      // Generic product type mappings (only if not already mapped to avoid confusion)
      if (sniperNameLower.includes("watch") && !sniperNameLower.includes("rolex")) {
        // Only map "watch" if it's not a Rolex (to avoid confusion)
        if (!aliases.has("watch")) {
          aliases.set("the watch", sniper.targetName);
          aliases.set("watch", sniper.targetName);
        }
      }
      if ((sniperNameLower.includes("shoe") || sniperNameLower.includes("sneaker")) && 
          !sniperNameLower.includes("nike") && !sniperNameLower.includes("jordan")) {
        // Only map "shoes" if it's not Nike/Jordan (to avoid confusion)
        if (!aliases.has("shoes")) {
          aliases.set("the shoes", sniper.targetName);
          aliases.set("shoes", sniper.targetName);
        }
      }
    }
    
    return aliases;
  };
  
  // Find product by alias with fuzzy matching for typos
  const findProductByAlias = (command: string): { sniper: Sniper; correctedInput?: string } | null => {
    const cleanedCommand = cleanInput(command);
    const aliases = getProductAliases();
    
    // Step 1: Check exact alias matches first (highest priority)
    for (const alias of Array.from(aliases.keys())) {
      const aliasRegex = new RegExp(`\\b${alias}\\b`, 'i');
      if (aliasRegex.test(cleanedCommand)) {
        const fullName = aliases.get(alias);
        if (fullName) {
          const matchedSniper = localSnipers.find(s => s.targetName === fullName);
          if (matchedSniper) {
            return { sniper: matchedSniper };
          }
        }
      }
    }
    
    // Step 2: Contextual Auto-Correct - try auto-corrected aliases
    const words = cleanedCommand.split(/\s+/);
    for (const word of words) {
      if (word.length < 2) continue;
      const correctedWord = autoCorrectTypo(word);
      if (correctedWord !== word) {
        // Try to find alias with corrected word
        for (const alias of Array.from(aliases.keys())) {
          if (alias.includes(correctedWord) || correctedWord.includes(alias)) {
            const fullName = aliases.get(alias);
            if (fullName) {
              const matchedSniper = localSnipers.find(s => s.targetName === fullName);
              if (matchedSniper) {
                return { sniper: matchedSniper, correctedInput: word };
              }
            }
          }
        }
      }
    }
    
    // Step 3: Fuzzy matching with Levenshtein distance for aliases
    const aliasArray = Array.from(aliases.keys());
    let bestMatch: { alias: string; score: number; correctedInput?: string } | null = null;
    const threshold = 0.7; // 70% similarity threshold
    
    for (const word of words) {
      if (word.length < 2) continue;
      for (const alias of aliasArray) {
        const score = similarityScore(word, alias);
        if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { alias, score, correctedInput: word !== alias ? word : undefined };
        }
      }
    }
    
    if (bestMatch) {
      const fullName = aliases.get(bestMatch.alias);
      if (fullName) {
        const matchedSniper = localSnipers.find(s => s.targetName === fullName);
        if (matchedSniper) {
          return { sniper: matchedSniper, correctedInput: bestMatch.correctedInput };
        }
      }
    }
    
    // Step 4: Substring match as fallback
    for (const alias of Array.from(aliases.keys())) {
      if (cleanedCommand.includes(alias)) {
        const fullName = aliases.get(alias);
        if (fullName) {
          const matchedSniper = localSnipers.find(s => s.targetName === fullName);
          if (matchedSniper) {
            return { sniper: matchedSniper };
          }
        }
      }
    }
    
    return null;
  };

  // Fuzzy Search & 'S' Handling: 
  // 1. Convert to lowercase
  // 2. If word ends in 's' (like 'Jordans'), strip the 's' for the search query
  // 3. Use .includes() logic so that 'Jordan' matches the full 'Nike Air Jordan' title
  const normalizeWord = (word: string): string => {
    // Step 1: Convert to lowercase
    const trimmed = word.trim().toLowerCase();
    
    // Step 2: Strip trailing 's' for plural handling (Jordans → Jordan, Watches → Watch)
    // But preserve words ending in 'ss' (like 'class')
    if (trimmed.length > 1 && trimmed.endsWith('s') && !trimmed.endsWith('ss')) {
      return trimmed.slice(0, -1);
    }
    
    return trimmed;
  };

  // Fuzzy Product Matching with typo tolerance: Check if user's word matches product name
  // Uses Levenshtein distance for typo handling (Rilex → Rolex, Jordens → Jordans)
  // Resolve Variable Errors: sniperWord is properly defined within loop scope
  const fuzzyMatchProduct = (command: string): Array<{ sniper: Sniper; score: number; correctedInput?: string }> => {
    const cleanedCommand = cleanInput(command);
    const matches: Array<{ sniper: Sniper; score: number; correctedInput?: string }> = [];
    
    // Extract all words from command (after cleaning)
    const productWords = cleanProductName(command);
    const commandWords = productWords.split(/\s+/).filter(w => w.length > 0);
    
    // Normalize and auto-correct command words
    const normalizedCommandWords = commandWords.map(word => {
      const corrected = autoCorrectTypo(word);
      return normalizeWord(corrected);
    });
    
    for (const sniper of localSnipers) {
      const sniperNameLower = sniper.targetName.toLowerCase();
      const sniperWords = sniperNameLower.split(/\s+/).filter(w => w.length > 0);
      const normalizedSniperWords = sniperWords.map(normalizeWord);
      
      let bestScore = 0;
      let correctedInput: string | undefined = undefined;
      
      // Check each command word against product name
      for (let i = 0; i < normalizedCommandWords.length; i++) {
        const cmdWord = normalizedCommandWords[i];
        const originalWord = commandWords[i];
        
        if (cmdWord.length < 2) continue;
        
        // Method 1: Direct containment check
        // Define the Variable: Ensure sniperWord is properly declared as a constant
        for (const sniperWord of normalizedSniperWords) {
          // sniperWord is properly declared as const within this for loop
          const normalizedSniperWord = sniperWord.toLowerCase();
          const normalizedCmdWord = cmdWord.toLowerCase();
          if (normalizedSniperWord.includes(normalizedCmdWord) || normalizedCmdWord.includes(normalizedSniperWord)) {
            bestScore = Math.max(bestScore, 0.9);
            break;
          }
        }
        
        // Method 2: Check full product name
        if (sniperNameLower.includes(cmdWord)) {
          bestScore = Math.max(bestScore, 0.9);
        }
        
        // Method 3: Fuzzy matching with Levenshtein distance
        // Define the Variable: Ensure sniperWord is properly declared as a constant
        for (const sniperWord of normalizedSniperWords) {
          // sniperWord is properly declared as const within this for loop
          const score = similarityScore(cmdWord, sniperWord);
          if (score > bestScore) {
            bestScore = score;
            if (originalWord !== sniperWord && score >= 0.7) {
              correctedInput = originalWord;
            }
          }
        }
        
        // Method 4: Check against full product name with fuzzy matching
        const fullNameScore = similarityScore(cmdWord, sniperNameLower.replace(/\s+/g, ""));
        if (fullNameScore > bestScore) {
          bestScore = fullNameScore;
          if (originalWord !== sniperNameLower && fullNameScore >= 0.7) {
            correctedInput = originalWord;
          }
        }
      }
      
      // Threshold: 70% similarity or direct match
      if (bestScore >= 0.7) {
        matches.push({ sniper, score: bestScore, correctedInput });
      }
    }
    
    // Sort by score (highest first)
    matches.sort((a, b) => b.score - a.score);
    
    return matches;
  };

  // Fuzzy product matching: Extract product name from command with typo tolerance
  // Returns sniper and any corrected input for dynamic response
  const extractProductFromCommand = (command: string): { sniper: Sniper; correctedInput?: string } | null => {
    const cleanedCommand = cleanInput(command);
    
    // PRIORITY 1: Alias Mapping with fuzzy matching - Check aliases FIRST
    // If user says 'Jordans' or 'Jordens' (typo), go straight to Nike product
    const aliasMatch = findProductByAlias(command);
    if (aliasMatch) {
      return aliasMatch;
    }
    
    // PRIORITY 2: Fuzzy matching with Levenshtein distance - handles typos
    const fuzzyMatches = fuzzyMatchProduct(command);
    if (fuzzyMatches.length === 1) {
      return { sniper: fuzzyMatches[0].sniper, correctedInput: fuzzyMatches[0].correctedInput };
    }
    if (fuzzyMatches.length > 1) {
      // Multiple matches - check if scores are close (within 0.1)
      const topScore = fuzzyMatches[0].score;
      const closeMatches = fuzzyMatches.filter(m => Math.abs(m.score - topScore) <= 0.1);
      
      if (closeMatches.length === 1) {
        // One clear winner
        return { sniper: closeMatches[0].sniper, correctedInput: closeMatches[0].correctedInput };
      }
      
      // Multiple close matches - will be handled by caller with "Did you mean?" logic
      return null; // Return null to trigger confirmation
    }
    
    // PRIORITY 3: Try to find exact product name matches (after cleaning)
    for (const sniper of localSnipers) {
      const sniperNameLower = sniper.targetName.toLowerCase();
      
      // Exact match
      if (cleanedCommand.includes(sniperNameLower)) {
        return { sniper };
      }
      
      // Word-by-word matching with fuzzy tolerance
      const sniperWords = sniperNameLower.split(/\s+/).filter(w => w.length > 2);
      const commandWords = cleanedCommand.split(/\s+/);
      
      // Check if significant words from product name appear in command
      if (sniperWords.length > 0) {
        // Fix the 'sniperWord' ReferenceError: Define sniperWord within the search function
        const matchingWords = sniperWords.filter(sniperWord => {
          // sniperWord is properly declared as const within this filter callback
          const normalizedSniperWord = sniperWord.toLowerCase().trim();
          return commandWords.some(cmdWord => {
            const normalizedCmd = normalizeWord(autoCorrectTypo(cmdWord));
            const normalizedSniper = normalizeWord(normalizedSniperWord);
            // Use fuzzy matching for typo tolerance
            const score = similarityScore(normalizedCmd, normalizedSniper);
            return score >= 0.7 || normalizedCmd.includes(normalizedSniper) || normalizedSniper.includes(normalizedCmd);
          });
        });
        
        // If most significant words match, consider it a match
        if (matchingWords.length >= Math.min(2, sniperWords.length) || 
            (sniperWords.length === 1 && matchingWords.length === 1)) {
          return { sniper };
        }
      }
    }
    
    // PRIORITY 4: Clean command and try again with plural handling and fuzzy matching
    const cleanedProductWords = cleanProductName(command);
    if (cleanedProductWords.length > 0) {
      const cleanedWords = cleanedProductWords.split(/\s+/).map(w => normalizeWord(autoCorrectTypo(w)));
      for (const sniper of localSnipers) {
        const sniperNameLower = sniper.targetName.toLowerCase();
        const cleanedSniperName = cleanProductName(sniper.targetName);
        const sniperWords = cleanedSniperName.split(/\s+/).map(normalizeWord);
        
        // Check if any cleaned command word matches any sniper word (with fuzzy tolerance)
        for (const cmdWord of cleanedWords) {
          if (cmdWord.length < 2) continue;
          // Fix the 'sniperWord' ReferenceError: Define sniperWord within the search function
          // Use: const sniperWord = userInput.toLowerCase().trim();
          for (const sniperWord of sniperWords) {
            // sniperWord is properly declared as const within this for loop
            const normalizedSniperWord = sniperWord.toLowerCase().trim();
            const normalizedCmdWord = cmdWord.toLowerCase().trim();
            const score = similarityScore(normalizedCmdWord, normalizedSniperWord);
            if (score >= 0.7 || normalizedSniperWord.includes(normalizedCmdWord) || normalizedCmdWord.includes(normalizedSniperWord)) {
              return { sniper };
            }
          }
        }
      }
    }
    
    return null;
  };

  // Fuzzy matching function to find sniper by name
  // Connect Chat to State: Scan the missions array to find current prices
  // Force Data Visibility: Use .toLowerCase().includes() so 'rolex' matches 'Rolex Submariner'
  const findSniperByName = (searchTerm: string): Sniper | null => {
    const normalizedSearch = cleanProductName(searchTerm).toLowerCase().trim();
    
    if (!normalizedSearch) return null;
    
    // Connect Chat to State: Always search in the current localSnipers array (missions array)
    // Force Data Visibility: Use .toLowerCase().includes() for flexible matching
    // First, try exact match (case-insensitive)
    let match = localSnipers.find(
      (sniper) => sniper.targetName.toLowerCase() === normalizedSearch
    );
    
    if (match) return match;
    
    // Force Data Visibility: Try partial match using .toLowerCase().includes()
    match = localSnipers.find(
      (sniper) => {
        const sniperNameLower = sniper.targetName.toLowerCase();
        return sniperNameLower.includes(normalizedSearch) || normalizedSearch.includes(sniperNameLower);
      }
    );
    
    if (match) return match;
    
    // Force Data Visibility: Try keyword matching with .toLowerCase().includes()
    const searchWords = normalizedSearch.split(/\s+/).filter(w => w.length > 2);
    if (searchWords.length > 0) {
      match = localSnipers.find((sniper) => {
        const sniperNameLower = sniper.targetName.toLowerCase();
        const sniperWords = sniperNameLower.split(/\s+/);
        return searchWords.some((word) =>
          sniperWords.some((sniperWord) => {
            // Fix the 'sniperWord' ReferenceError: Define sniperWord within the search function
            // Use: const sniperWord = userInput.toLowerCase().trim();
            // sniperWord is properly declared as const within this .some() callback
            const normalizedSniperWord = sniperWord.toLowerCase().trim();
            const normalizedWord = word.toLowerCase().trim();
            return normalizedSniperWord.includes(normalizedWord) || normalizedWord.includes(normalizedSniperWord);
          })
        );
      });
    }
    
    return match || null;
  };

  // Handle Kill by ID (with confirmation logic)
  const handleKillById = (sniperId: number, confirmed: boolean) => {
    const sniper = localSnipers.find((s) => s.id === sniperId);
    if (!sniper) {
      addAIMessage("Commander, I couldn't find that sniper. It may have already been killed.");
      setLastSuggestedAction(null);
      return;
    }

    // If not confirmed, ask for confirmation
    if (!confirmed) {
      const originalPrices = JSON.parse(localStorage.getItem("sniper-original-prices") || "{}");
      const originalPrice = Number(originalPrices[sniper.id] ?? (sniper.currentPrice ? Number(sniper.currentPrice) : Number(sniper.targetPrice)));
      const currentPriceWhenKilled = sniper.currentPrice ? Number(sniper.currentPrice) : Number(sniper.targetPrice);
      const savedAmount = Math.max(0, originalPrice - currentPriceWhenKilled);
      
      addAIMessage(`Confirming: Should I kill **${sniper.targetName}** now? This will save ${formatCurrency(savedAmount)}. Type 'yes' to confirm or 'no' to cancel.`);
      setLastSuggestedAction(sniperId);
      setPendingQuestion("kill");
      return;
    }

    // Confirmed - proceed with kill
    executeKill(sniper);
  };

  // Execute the kill action
  const executeKill = (sniper: Sniper) => {
    // Get original price to calculate savings
    const originalPrices = JSON.parse(localStorage.getItem("sniper-original-prices") || "{}");
    const originalPrice = Number(originalPrices[sniper.id] ?? (sniper.currentPrice ? Number(sniper.currentPrice) : Number(sniper.targetPrice)));
    const currentPriceWhenKilled = sniper.currentPrice ? Number(sniper.currentPrice) : Number(sniper.targetPrice);
    
    // Calculate savings
    const savedAmount = Math.max(0, originalPrice - currentPriceWhenKilled);

    // Check if overpriced
    if (currentPriceWhenKilled > originalPrice) {
      addAIMessage(`**${sniper.targetName}** is overpriced (Current: ${formatCurrency(currentPriceWhenKilled)} > Original: ${formatCurrency(originalPrice)}). Mission aborted - target not met.`);
      // Still kill it (which will delete it per the killSniper logic)
      killSniper(sniper.id);
      setLastSuggestedAction(null);
      return;
    }

    // Kill the sniper
    killSniper(sniper.id);

    // Show success message
    const message = `Mission accomplished, Commander! **${sniper.targetName}** killed. ${formatCurrency(savedAmount)} added to your savings.`;
    addAIMessage(message);
    
    // Clear pending state to prevent double execution
    setLastSuggestedAction(null);
    setPendingQuestion(null);
    
    // Clear memory after successful kill
    setLastSuggestedAction(null);
    setCurrentDiscountedItem(null);
    
      // Confirmation Safety: Do NOT ask unrequested follow-up questions
  };

  // Handle Kill command with product name
  const handleKillCommand = (productName: string) => {
    if (!productName) {
      addAIMessage("Please specify a product name. Example: 'Kill Sony Headphones' or 'Kill the iPhone'");
      return;
    }

    // Find the sniper using fuzzy matching
    const sniper = findSniperByName(productName);

    if (!sniper) {
      addAIMessage(`I couldn't find **${productName}** in your active snipers. Please check the name and try again.`);
      return;
    }

    // Use the kill by ID function with confirmation
    handleKillById(sniper.id, false);
  };

  // Handle Find command
  const handleFindCommand = (productName: string) => {
    if (!productName) {
      addAIMessage("Please specify a product name. Example: 'Find iPhone'");
      return;
    }

    // Simulate search with concierge tone
    addAIMessage(`At your service, Commander. I've analyzed the market for you. Searching for **${productName}**...`, "find");

    setTimeout(() => {
      // Generate mock price data
      const mockPrices: Record<string, { current: number; suggested: number }> = {
        iphone: { current: 140000, suggested: 125000 },
        laptop: { current: 80000, suggested: 70000 },
        headphones: { current: 15000, suggested: 12000 },
        watch: { current: 25000, suggested: 20000 },
        tablet: { current: 40000, suggested: 35000 },
      };

      const productKey = productName.toLowerCase();
      const priceData = mockPrices[productKey] || {
        current: Math.floor(Math.random() * 100000) + 50000,
        suggested: Math.floor(Math.random() * 80000) + 40000,
      };

      const message = `Found! Current price is ${formatCurrency(priceData.current)}. Suggested sniper target: ${formatCurrency(priceData.suggested)}. Shall I add it?`;
      addAIMessage(message, "find");

      // Store pending action
      setPendingAction({
        type: "addSniper",
        data: {
          name: productName,
          currentPrice: priceData.current,
          targetPrice: priceData.suggested,
        },
      });
    }, 1500);
  };

  // Handle Clear Active command
  const handleClearActive = () => {
    if (localSnipers.length === 0) {
      addAIMessage("At your service, Commander. No active snipers to clear.", "clear");
      return;
    }

    addAIMessage(`At your service, Commander. Are you sure you want to clear all ${localSnipers.length} active sniper${localSnipers.length > 1 ? 's' : ''}? This action cannot be undone.`, "clear");
    setPendingAction({ type: "clearActive" });
  };

  // Proactive follow-up after actions
  const handleProactiveFollowUp = (actionType: "hold" | "kill") => {
    const discounted = findDiscountedItems();
    
    // Exclude the just-killed item if action was kill
    const availableDiscounted = actionType === "kill" 
      ? discounted.filter(item => {
          // Filter out items that might have been just killed (check if still in localSnipers)
          return localSnipers.some(s => s.id === item.id);
        })
      : discounted;
    
    if (availableDiscounted.length > 0) {
      // Scenario A: Other discounts exist - show first one with new phrasing
      const firstDiscounted = availableDiscounted[0];
      const originalPrices = JSON.parse(localStorage.getItem("sniper-original-prices") || "{}");
      const originalPrice = Number(originalPrices[firstDiscounted.id] ?? (firstDiscounted.currentPrice ? Number(firstDiscounted.currentPrice) : Number(firstDiscounted.targetPrice)));
      const currentPrice = firstDiscounted.currentPrice ? Number(firstDiscounted.currentPrice) : originalPrice;
      const targetPrice = Number(firstDiscounted.targetPrice);
      const gapToTarget = currentPrice - targetPrice;
      const savedAmount = Math.max(0, originalPrice - currentPrice);
      
      let message = `I've analyzed the targets for you, Commander. Excellent catch on that price drop. The **${firstDiscounted.targetName}** was ${formatCurrency(originalPrice)} and is now ${formatCurrency(currentPrice)}. You have saved ${formatCurrency(savedAmount)} so far.`;
      
      if (gapToTarget > 0) {
        message += ` You're still ${formatCurrency(gapToTarget)} away from your target of ${formatCurrency(targetPrice)}.`;
      }
      
      message += ` Would you like to execute the kill at this price?`;
      
      setTimeout(() => {
        addAIMessage(message);
        setDiscountedItems(availableDiscounted);
        setCurrentDiscountedItem(firstDiscounted.id);
        setLastSuggestedAction(firstDiscounted.id);
        setPendingQuestion("kill");
      }, 500);
    } else {
      // Scenario B: No current discounts
      setTimeout(() => {
        addAIMessage(`I've analyzed the targets for you, Commander. We are currently waiting for the market to move on your other targets. Do you have any new products in mind? Tell me what you're looking for, and I'll start a new Sniper mission for you.`);
      }, 500);
    }
  };

  // Smart product add logic
  const handleSmartProductAdd = (productName: string) => {
    // Generate mock price data
    const mockPrices: Record<string, { current: number; suggested: number }> = {
      rolex: { current: 500000, suggested: 450000 },
      iphone: { current: 140000, suggested: 125000 },
      laptop: { current: 80000, suggested: 70000 },
      headphones: { current: 15000, suggested: 12000 },
      watch: { current: 25000, suggested: 20000 },
      tablet: { current: 40000, suggested: 35000 },
      macbook: { current: 150000, suggested: 130000 },
      samsung: { current: 90000, suggested: 80000 },
    };

    const productKey = productName.toLowerCase().replace(/\s+/g, "");
    const priceData = mockPrices[productKey] || {
      current: Math.floor(Math.random() * 200000) + 50000,
      suggested: Math.floor(Math.random() * 150000) + 40000,
    };

    // Capitalize product name properly
    const capitalizedProduct = productName.split(" ").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(" ");

    addAIMessage(`${capitalizedProduct}? Excellent choice, Commander. Searching for current market rates...`);
    
    setTimeout(() => {
      addAIMessage(`Found! It's currently at ${formatCurrency(priceData.current)}. What is your target price for this mission?`);
      
      // Store pending action for target price input
      setPendingAction({
        type: "addSniperWithTarget",
        data: {
          name: capitalizedProduct,
          currentPrice: priceData.current,
          suggestedPrice: priceData.suggested,
        },
      });
    }, 1500);
  };

  // Find products with price drops (currentPrice < originalPrice)
  const findDiscountedItems = (): Sniper[] => {
    const discounted: Sniper[] = [];
    const originalPrices = JSON.parse(localStorage.getItem("sniper-original-prices") || "{}");
    
    localSnipers.forEach((sniper) => {
      const originalPrice = Number(originalPrices[sniper.id] ?? (sniper.currentPrice ? Number(sniper.currentPrice) : Number(sniper.targetPrice)));
      const currentPrice = sniper.currentPrice ? Number(sniper.currentPrice) : originalPrice;
      
      // Price drop detected: currentPrice < originalPrice
      if (currentPrice < originalPrice) {
        discounted.push(sniper);
      }
    });
    
    return discounted;
  };

  // Handle Price Difference inquiry with Proactive Pricing Check and Dynamic Response
  const handlePriceDifference = (productName?: string, matchedSniper?: Sniper, correctedInput?: string) => {
    let sniper: Sniper | null = null;
    let correctedWord: string | undefined = correctedInput;
    
    // Fix Logic Loop: Ensure all variables are correctly defined
    // correctedWord will be set from fuzzy matching if not provided
    
    // If sniper already matched, use it
    if (matchedSniper) {
      sniper = matchedSniper;
    } else if (productName) {
      // Try fuzzy matching first with typo tolerance
      const fuzzyMatches = fuzzyMatchProduct(productName);
      
      if (fuzzyMatches.length === 0) {
        // No matches found - Concierge Persona: Never say 'I didn't understand'
        // If a likely product match exists, offer choices
        const productNames = localSnipers.map(s => s.targetName);
        if (productNames.length === 0) {
          addAIMessage("At your service, Commander. You currently have no active snipers. Would you like me to help you add a product to track?", "price_difference");
        } else if (productNames.length === 1) {
          addAIMessage(`Did you want a status on the **${productNames[0]}**, Commander?`, "price_difference");
        } else if (productNames.length === 2) {
          // Check if one is Rolex and one is Jordan
          const hasRolex = productNames[0].toLowerCase().includes("rolex") || productNames[1].toLowerCase().includes("rolex");
          const hasJordan = productNames[0].toLowerCase().includes("jordan") || productNames[0].toLowerCase().includes("nike") ||
                           productNames[1].toLowerCase().includes("jordan") || productNames[1].toLowerCase().includes("nike");
          if (hasRolex && hasJordan) {
            addAIMessage(`Did you want a status on the **Rolex** or the **Jordans**, Commander?`, "price_difference");
          } else {
            addAIMessage(`Did you want a status on the **${productNames[0]}** or the **${productNames[1]}**, Commander?`, "price_difference");
          }
        } else {
          // Find Rolex and Jordan if they exist
          const rolexProduct = productNames.find(p => p.toLowerCase().includes("rolex"));
          const jordanProduct = productNames.find(p => p.toLowerCase().includes("jordan") || p.toLowerCase().includes("nike"));
          if (rolexProduct && jordanProduct) {
            addAIMessage(`Did you want a status on the **Rolex** or the **Jordans**, Commander?`, "price_difference");
          } else {
            const firstTwo = productNames.slice(0, 2).map(name => `**${name}**`).join(" or the ");
            addAIMessage(`Did you want a status on the ${firstTwo}, Commander?`, "price_difference");
          }
        }
        return;
      } else if (fuzzyMatches.length === 1) {
        // Single match - use it
        sniper = fuzzyMatches[0].sniper;
        correctedWord = fuzzyMatches[0].correctedInput || correctedWord;
      } else if (fuzzyMatches.length > 1) {
        // Multiple matches - use the best one if score is high enough
        const bestMatch = fuzzyMatches[0];
        if (bestMatch.score >= 0.8) {
          // High confidence - use it
          sniper = bestMatch.sniper;
          correctedWord = bestMatch.correctedInput || correctedWord;
        } else {
          // Low confidence - trigger "Did you mean?" logic
          const topMatches = fuzzyMatches.slice(0, 3);
          if (topMatches.length === 2) {
            const product1 = topMatches[0].sniper.targetName;
            const product2 = topMatches[1].sniper.targetName;
            const hasRolex = product1.toLowerCase().includes("rolex") || product2.toLowerCase().includes("rolex");
            const hasJordan = product1.toLowerCase().includes("jordan") || product1.toLowerCase().includes("nike") ||
                             product2.toLowerCase().includes("jordan") || product2.toLowerCase().includes("nike");
            if (hasRolex && hasJordan) {
              addAIMessage(`I couldn't find a perfect match, Commander. Did you mean the **Rolex Submariner** or the **Nike Air Jordan**?`, "price_difference");
            } else {
              addAIMessage(`I couldn't find a perfect match, Commander. Did you mean the **${product1}** or the **${product2}**?`, "price_difference");
            }
          } else {
            const productList = topMatches.map(m => `**${m.sniper.targetName}**`).join(", ");
            addAIMessage(`I couldn't find a perfect match, Commander. Did you mean ${productList}?`, "price_difference");
          }
          return;
        }
      } else {
        // Multiple matches - The 'Did you mean?' Logic
        // If spelling mistake is too large (e.g., 'Wach'), ask politely
        const topMatches = fuzzyMatches.slice(0, 3); // Get top 3 matches
        
        if (topMatches.length === 2) {
          // Two products - use friendly format
          const product1 = topMatches[0].sniper.targetName;
          const product2 = topMatches[1].sniper.targetName;
          
          // Check if one is Rolex and one is Nike/Jordan
          const hasRolex = product1.toLowerCase().includes("rolex") || product2.toLowerCase().includes("rolex");
          const hasJordan = product1.toLowerCase().includes("jordan") || product1.toLowerCase().includes("nike") ||
                           product2.toLowerCase().includes("jordan") || product2.toLowerCase().includes("nike");
          
          if (hasRolex && hasJordan) {
            addAIMessage(`I couldn't find a perfect match, Commander. Did you mean the **Rolex Submariner** or the **Nike Air Jordan**?`, "price_difference");
          } else {
            addAIMessage(`I couldn't find a perfect match, Commander. Did you mean the **${product1}** or the **${product2}**?`, "price_difference");
          }
        } else {
          // Multiple matches - list them with concierge tone
          const productList = topMatches.map(m => `**${m.sniper.targetName}**`).join(", ");
          addAIMessage(`I couldn't find a perfect match, Commander. Did you mean ${productList}?`, "price_difference");
        }
        return;
      }
    } else {
      // No product name provided
      addAIMessage("At your service, Commander. Please specify a product name. Example: 'Price difference of Rolex Submariner' or 'How much did I save on MacBook'", "price_difference");
      return;
    }

    if (!sniper) {
      return;
    }

    // Connect Chat to State: Scan the missions array to find the current mission
    // Live Data Sync: Always pull the absolute latest currentPrice from the mission list
    // Do not use cached or hardcoded numbers - refresh from localSnipers array
    const mission = localSnipers.find(s => s.id === sniper.id);
    if (!mission) {
      // No Hallucinations: If product not in active mission feed, report accurately
      addAIMessage(`I don't have live data for that target yet, Commander. The **${sniper.targetName}** is not currently in your active mission feed.`, "price_difference");
      return;
    }

    // Fix Math Retrieval: Pull originalPrice and currentPrice directly from the mission object
    // Get original price from localStorage (this is the deployment price stored when mission was created)
    const originalPrices = JSON.parse(localStorage.getItem("sniper-original-prices") || "{}");
    const missionOriginalPrice = Number(originalPrices[mission.id] ?? 0);
    
    // If original price not found in storage, use currentPrice or targetPrice as original
    const originalPrice = missionOriginalPrice > 0 
      ? missionOriginalPrice 
      : (mission.currentPrice ? Number(mission.currentPrice) : Number(mission.targetPrice));
    
    // Bridge the Data Gap: Pull currentPrice directly from mission object (dashboard data)
    const currentPrice = mission.currentPrice ? Number(mission.currentPrice) : originalPrice;
    
    // Calculation: Savings = originalPrice - currentPrice
    // Bridge the Data Gap: Calculate directly from mission data
    const savings = originalPrice - currentPrice;
    
    // Verify Every Answer: Before the AI speaks, verify the numbers
    // If the dashboard shows ₹50,000 savings, the AI MUST say ₹50,000
    const verifiedSavings = savings > 0 ? savings : 0;
    const verifiedIncrease = savings < 0 ? Math.abs(savings) : 0;
    
    // Fix 'Identifier already declared': Rename to missionSavings to prevent crash
    // If savedAmount is already used in the dashboard, use missionSavings for chat variable
    const missionSavings = verifiedSavings;
    const priceIncrease = verifiedIncrease;
    const priceChange = savings;
    
    // Smart Warning Logic: Correctly identify price increases vs decreases
    let message = "";
    
    // Visual Feedback: Highlight the product card when AI mentions it
    // Smart Dashboard Sync: If AI mentions a product, visually highlight that mission card
    // Store in localStorage so Feed component can read it
    localStorage.setItem("highlighted-product-id", JSON.stringify({ id: mission.id, timestamp: Date.now() }));
    setHighlightedProductId(mission.id);
    setTimeout(() => {
      setHighlightedProductId(null);
      localStorage.removeItem("highlighted-product-id");
    }, 3000); // Remove highlight after 3 seconds
    
    // Dynamic Response: If AI corrected a spelling mistake, acknowledge it
    // Example: 'I've analyzed the Rolex (I assume you meant "Rilex"), and you have saved ₹50,000...'
    let correctionNote = "";
    if (correctedWord) {
      // Find the correct product name word that was matched
      const productWords = mission.targetName.toLowerCase().split(/\s+/);
      const correctedLower = correctedWord.toLowerCase();
      const matchedWord = productWords.find(w => 
        w.includes(correctedLower) || 
        similarityScore(correctedLower, w) >= 0.7 ||
        autoCorrectTypo(correctedLower) === w
      );
      
      if (matchedWord && matchedWord !== correctedLower) {
        // Format: (I assume you meant "corrected_word")
        correctionNote = ` (I assume you meant "${correctedWord}")`;
      } else if (correctedLower !== mission.targetName.toLowerCase()) {
        // If no specific word match but correction was made, still acknowledge
        correctionNote = ` (I assume you meant "${mission.targetName}")`;
      }
    }
    
    // Verification Logic: Double-check - if priceChange is negative, it's an increase
    // This ensures we never report savings when there's actually a price increase
    const isPriceDrop = priceChange > 0;
    const isPriceIncrease = priceChange < 0;
    const isNoChange = priceChange === 0;
    
    // Proactive Pricing Check: Explicitly check current price against original
    if (isNoChange) {
      // Small Talk with Facts: Keep 'Excellent, Commander' personality with facts
      // Verify Every Answer: Numbers verified before speaking
      const productNameLower = mission.targetName.toLowerCase();
      if (productNameLower.includes("jordan") || productNameLower.includes("nike")) {
        message = `Excellent, Commander. I am ready. No movement on the **${mission.targetName}** yet${correctionNote}, but I am still watching them closely for any sign of weakness. They remain at ${formatCurrency(currentPrice)}, matching your deployment price of ${formatCurrency(originalPrice)}.`;
      } else {
        message = `Excellent, Commander. I am ready. No movement on the **${mission.targetName}** yet${correctionNote}, but I am still watching it closely for any sign of weakness. It remains at ${formatCurrency(currentPrice)}, matching your deployment price of ${formatCurrency(originalPrice)}.`;
      }
      // Don't set kill context if no price change
      setCurrentDiscountedItem(null);
      setLastSuggestedAction(null);
      setPendingQuestion(null);
      
      // Proactive Follow-up: Suggest checking another target
      // Confirmation Safety: Do NOT ask unrequested follow-up questions
    } else if (isPriceDrop) {
      // Math Verification: Ensure the AI verifies the math before it speaks
      // The Data Bridge: missionSavings comes directly from missions array calculation
      // Verify: missionSavings = originalPrice - currentPrice (must be positive for price drop)
      const verifiedMissionSavings = Math.max(0, originalPrice - currentPrice);
      
      // Math Verification: Double-check the calculation matches
      if (Math.abs(missionSavings - verifiedMissionSavings) > 0.01) {
        // If mismatch, use the verified value
        console.warn(`Math verification mismatch for ${mission.targetName}. Using verified value.`);
      }
      
      const percentageSavings = ((verifiedMissionSavings / originalPrice) * 100).toFixed(2);
      
      // Math Verification: Ensure the AI says 'The Rolex is down ₹50,000' with verified numbers
      // Small Talk with Facts: Keep 'Excellent, Commander' personality, but follow it up with a fact
      const productNameLower = mission.targetName.toLowerCase();
      if (productNameLower.includes("rolex")) {
        message = `Excellent, Commander. I am ready. The **${mission.targetName}**${correctionNote} is down ${formatCurrency(verifiedMissionSavings)}. Shall we strike?`;
      } else {
        // Generic price drop message with verified math
        message = `Excellent, Commander. I am ready. The **${mission.targetName}**${correctionNote} is down ${formatCurrency(verifiedMissionSavings)}. Shall we strike?`;
      }
      
      // Set context for kill execution
      setCurrentDiscountedItem(mission.id);
      setLastSuggestedAction(mission.id);
      setPendingQuestion("kill");
      
      // Proactive Follow-up: Every time the AI answers, suggest a next step
      setTimeout(() => {
        const otherSnipers = localSnipers.filter(s => s.id !== mission.id);
        if (otherSnipers.length > 0) {
          // Find another target to suggest (prefer one with price drop, or just another one)
          const otherDiscounted = otherSnipers.filter(s => {
            const otherOriginalPrices = JSON.parse(localStorage.getItem("sniper-original-prices") || "{}");
            const otherOriginal = Number(otherOriginalPrices[s.id] ?? (s.currentPrice ? Number(s.currentPrice) : Number(s.targetPrice)));
            const otherCurrent = s.currentPrice ? Number(s.currentPrice) : otherOriginal;
            return otherCurrent < otherOriginal;
          });
          
          const targetToSuggest = otherDiscounted.length > 0 ? otherDiscounted[0] : otherSnipers[0];
          if (targetToSuggest) {
            const targetNameLower = targetToSuggest.targetName.toLowerCase();
            const productNameLower = mission.targetName.toLowerCase();
            
            // Confirmation Safety: Do NOT ask unrequested follow-up questions
          }
        }
      }, 1500);
    } else if (isPriceIncrease) {
      // Math Verification: Ensure the AI verifies the math before it speaks
      // The Data Bridge: priceIncrease comes directly from missions array calculation
      // Verify: priceIncrease = currentPrice - originalPrice (must be positive for price increase)
      const verifiedPriceIncrease = Math.max(0, currentPrice - originalPrice);
      
      // Math Verification: Ensure the AI says 'The Jordans are up ₹3,000' with verified numbers
      // Small Talk with Facts: Keep 'Excellent, Commander' personality with facts
      const productNameLower = mission.targetName.toLowerCase();
      if (productNameLower.includes("jordan") || productNameLower.includes("nike")) {
        message = `Excellent, Commander. I am ready. The **${mission.targetName}**${correctionNote} are up ${formatCurrency(verifiedPriceIncrease)}. I recommend we maintain sniper position.`;
      } else {
        // Generic price increase message with verified math
        message = `Excellent, Commander. I am ready. The **${mission.targetName}**${correctionNote} is up ${formatCurrency(verifiedPriceIncrease)}. I recommend we maintain sniper position.`;
      }
      setCurrentDiscountedItem(null);
      setLastSuggestedAction(null);
      setPendingQuestion(null);
      
      // Proactive Follow-up: After price increase, suggest checking another target
      setTimeout(() => {
        const otherSnipers = localSnipers.filter(s => s.id !== mission.id);
        if (otherSnipers.length > 0) {
          const targetToSuggest = otherSnipers[0];
          const targetNameLower = targetToSuggest.targetName.toLowerCase();
          const productNameLower = mission.targetName.toLowerCase();
          
          // Confirmation Safety: Do NOT ask unrequested follow-up questions
        }
      }, 1500);
    }
    
    // Force state update - addAIMessage already updates messages state, triggering re-render
    addAIMessage(message, "price_difference");
  };

  // Handle Other Products inquiry
  const handleOtherProducts = () => {
    const discounted = findDiscountedItems();
    setDiscountedItems(discounted);
    
    if (discounted.length === 0) {
      addAIMessage("I've analyzed the targets for you, Commander. I've scanned all your active snipers. No other items have price drops at the moment. All targets are still above their original prices.");
      return;
    }
    
    // Show first item with new phrasing
    const example = discounted[0];
    const originalPrices = JSON.parse(localStorage.getItem("sniper-original-prices") || "{}");
    const originalPrice = Number(originalPrices[example.id] ?? (example.currentPrice ? Number(example.currentPrice) : Number(example.targetPrice)));
    const currentPrice = example.currentPrice ? Number(example.currentPrice) : originalPrice;
    const targetPrice = Number(example.targetPrice);
    const gapToTarget = currentPrice - targetPrice;
    const savedAmount = Math.max(0, originalPrice - currentPrice);
    
    let message = `I've analyzed the targets for you, Commander. Excellent catch on that price drop. The **${example.targetName}** was ${formatCurrency(originalPrice)} and is now ${formatCurrency(currentPrice)}. You have saved ${formatCurrency(savedAmount)} so far.`;
    
    if (gapToTarget > 0) {
      message += ` You're still ${formatCurrency(gapToTarget)} away from your target of ${formatCurrency(targetPrice)}.`;
    }
    
    message += ` Would you like to execute the kill at this price?`;
    
    addAIMessage(message);
    setCurrentDiscountedItem(example.id);
    setLastSuggestedAction(example.id);
    setPendingQuestion("kill");
  };

  // Handle Display All Price Drops (when user says yes to "check for other price drops")
  const handleDisplayAllPriceDrops = () => {
    const discounted = findDiscountedItems();
    
    if (discounted.length === 0) {
      addAIMessage("I've analyzed the targets for you, Commander. I've scanned all your active snipers. No items have price drops at the moment.");
      return;
    }
    
    let displayMessage = `I've analyzed the targets for you, Commander. **PRICE DROPS DETECTED (${discounted.length})**\n\n`;
    const originalPrices = JSON.parse(localStorage.getItem("sniper-original-prices") || "{}");
    
    discounted.forEach((sniper, index) => {
      const originalPrice = Number(originalPrices[sniper.id] ?? (sniper.currentPrice ? Number(sniper.currentPrice) : Number(sniper.targetPrice)));
      const currentPrice = sniper.currentPrice ? Number(sniper.currentPrice) : originalPrice;
      const targetPrice = Number(sniper.targetPrice);
      const dropAmount = originalPrice - currentPrice;
      const gapToTarget = currentPrice - targetPrice;
      
      displayMessage += `${index + 1}. **${sniper.targetName}**\n`;
      displayMessage += `   Was: ${formatCurrency(originalPrice)} → Now: ${formatCurrency(currentPrice)} (↓${formatCurrency(dropAmount)})\n`;
      
      if (currentPrice <= targetPrice) {
        displayMessage += `   ✅ TARGET REACHED!\n`;
      } else {
        displayMessage += `   Target: ${formatCurrency(targetPrice)} (${formatCurrency(gapToTarget)} away)\n`;
      }
      displayMessage += `\n`;
    });
    
    displayMessage += `Would you like to execute a kill on any of these, Commander?`;
    addAIMessage(displayMessage);
    setDiscountedItems(discounted);
  };

  // Handle Display Discounted Items (legacy - for other flows)
  const handleDisplayDiscountedItems = () => {
    if (discountedItems.length === 0) {
      addAIMessage("I've analyzed the targets for you, Commander. No discounted items to display at the moment.");
      return;
    }
    
    // Show first item with new phrasing and ask about it
    const firstItem = discountedItems[0];
    const originalPrices = JSON.parse(localStorage.getItem("sniper-original-prices") || "{}");
    const originalPrice = Number(originalPrices[firstItem.id] ?? (firstItem.currentPrice ? Number(firstItem.currentPrice) : Number(firstItem.targetPrice)));
    const currentPrice = firstItem.currentPrice ? Number(firstItem.currentPrice) : originalPrice;
    const targetPrice = Number(firstItem.targetPrice);
    const gapToTarget = currentPrice - targetPrice;
    const savedAmount = Math.max(0, originalPrice - currentPrice);
    
    let message = `I've analyzed the targets for you, Commander. Excellent catch on that price drop. The **${firstItem.targetName}** was ${formatCurrency(originalPrice)} and is now ${formatCurrency(currentPrice)}. You have saved ${formatCurrency(savedAmount)} so far.`;
    
    if (gapToTarget > 0) {
      message += ` You're still ${formatCurrency(gapToTarget)} away from your target of ${formatCurrency(targetPrice)}.`;
    }
    
    message += ` Would you like to execute the kill at this price?`;
    
    addAIMessage(message);
    setCurrentDiscountedItem(firstItem.id);
    setLastSuggestedAction(firstItem.id);
    setPendingQuestion("kill");
  };

  // Smart Summaries: Categorize missions into 'Ready to Kill' and 'Waiting in Shadows'
  const handleSmartSummary = () => {
    const originalPrices = JSON.parse(localStorage.getItem("sniper-original-prices") || "{}");
    const readyToKill: Sniper[] = [];
    const waitingInShadows: Sniper[] = [];
    
    localSnipers.forEach((sniper) => {
      const originalPrice = Number(originalPrices[sniper.id] ?? (sniper.currentPrice ? Number(sniper.currentPrice) : Number(sniper.targetPrice)));
      const currentPrice = sniper.currentPrice ? Number(sniper.currentPrice) : originalPrice;
      const priceChange = originalPrice - currentPrice;
      
      if (priceChange > 0) {
        // Price dropped - Ready to Kill
        readyToKill.push(sniper);
      } else {
        // Price increased or stable - Waiting in Shadows
        waitingInShadows.push(sniper);
      }
    });
    
    let summary = `**MISSION SUMMARY**\n\n`;
    
    if (readyToKill.length > 0) {
      summary += `🎯 **Ready to Kill** (${readyToKill.length}):\n`;
      readyToKill.forEach((sniper) => {
        const originalPrice = Number(originalPrices[sniper.id] ?? (sniper.currentPrice ? Number(sniper.currentPrice) : Number(sniper.targetPrice)));
        const currentPrice = sniper.currentPrice ? Number(sniper.currentPrice) : originalPrice;
        const savings = originalPrice - currentPrice;
        const percentage = ((savings / originalPrice) * 100).toFixed(2);
        summary += `• **${sniper.targetName}**: Saved ${formatCurrency(savings)} (${percentage}%)\n`;
      });
      summary += `\n`;
    } else {
      summary += `🎯 **Ready to Kill**: None at the moment.\n\n`;
    }
    
    if (waitingInShadows.length > 0) {
      summary += `⏳ **Waiting in Shadows** (${waitingInShadows.length}):\n`;
      waitingInShadows.forEach((sniper) => {
        const originalPrice = Number(originalPrices[sniper.id] ?? (sniper.currentPrice ? Number(sniper.currentPrice) : Number(sniper.targetPrice)));
        const currentPrice = sniper.currentPrice ? Number(sniper.currentPrice) : originalPrice;
        const priceChange = originalPrice - currentPrice;
        
        if (priceChange < 0) {
          const increase = Math.abs(priceChange);
          summary += `• **${sniper.targetName}**: Increased by ${formatCurrency(increase)} - Hold position\n`;
        } else {
          summary += `• **${sniper.targetName}**: Stable at ${formatCurrency(currentPrice)} - Monitoring\n`;
        }
      });
    } else {
      summary += `⏳ **Waiting in Shadows**: None.\n`;
    }
    
    addAIMessage(summary, "summary");
  };

  // Handle Status Report command
  const handleStatusReport = () => {
    const activeCount = localSnipers.length;
    const savingsCount = localSavings.length;
    const mostRecentKill = localSavings.length > 0 ? localSavings[0] : null;
    const discounted = findDiscountedItems();

    let report = `**STATUS REPORT**\n\n`;
    report += `Active Missions: ${activeCount}\n`;
    report += `Total Savings: ${formatCurrency(totalSavings)}\n`;
    report += `Kills Confirmed: ${savingsCount}\n`;

    if (mostRecentKill) {
      const savings = mostRecentKill.oldPrice - mostRecentKill.currentPrice;
      report += `\nMost Recent Kill: **${mostRecentKill.title}**\n`;
      report += `Saved: ${formatCurrency(savings)}`;
    } else {
      report += `\nNo kills yet. Deploy snipers to start saving!`;
    }
    
    // Proactive suggestion about discounted items
    if (discounted.length > 0) {
      report += `\n\n💡 Would you like to see other items that are currently trending down?`;
      setDiscountedItems(discounted);
    }

    addAIMessage(report);
  };

  // Parse target price from user input
  const parseTargetPrice = (input: string): number | null => {
    // Remove currency symbols and commas
    const cleaned = input.replace(/[₹,]/g, "").trim();
    const number = Number(cleaned);
    return isNaN(number) || number <= 0 ? null : number;
  };

  // Confirm pending actions
  const confirmAction = () => {
    if (!pendingAction) return;

    if (pendingAction.type === "addSniper") {
      const { name, currentPrice, targetPrice } = pendingAction.data;
      const newSniper: Sniper = {
        id: Date.now(),
        targetName: name,
        targetPrice: targetPrice as unknown as number,
        currentPrice: currentPrice as unknown as number,
        imageUrl: null,
        status: "tracking",
        userId: null,
        createdAt: new Date(),
      };
      addSniper(newSniper, currentPrice, "ELECTRONICS");
      addAIMessage(`**${name}** has been added to your active snipers, Commander!`);
      setPendingAction(null);
    } else if (pendingAction.type === "addSniperWithTarget") {
      // This requires target price input - handled in command processing
      setPendingAction(null);
    } else if (pendingAction.type === "clearActive") {
      localSnipers.forEach((sniper) => deleteSniper(sniper.id));
      addAIMessage("All active snipers have been cleared, Commander.");
      setPendingAction(null);
    }
  };

  const cancelAction = () => {
    setPendingAction(null);
    addAIMessage("Action cancelled.");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      handleCommand(inputValue);
    }
  };

  const handleAnalyzeClick = () => {
    handleCommand("Analyze Missions");
  };

  // State Mapping: Explicitly connected to flights array
  // Click Logic: INTERCEPT - Change flight status to 'Secured' and add savings to feed
  const handleFlightIntercept = (flightId: string) => {
    if (!trackedFlights || !setTrackedFlights || !addSaving) return;
    
    const flight = trackedFlights.find((f: any) => f.id === flightId);
    if (!flight) return;
    
    const currentPrice = Number(flight.currentPrice || flight.originalPrice);
    const originalPrice = Number(flight.originalPrice || currentPrice);
    const savings = originalPrice - currentPrice;
    
    // Action Buttons: Clicking Intercept marks flight as 'Booked' in Logistics tab
    const updatedFlights = trackedFlights.map((f: any) => {
      if (f.id === flightId) {
        return { ...f, isBooked: true, status: "Booked" as const };
      }
      return f;
    });
    
    setTrackedFlights(updatedFlights);
    
    // Add savings to the feed
    if (savings > 0) {
      addSaving({
        id: `flight-intercept-${flightId}-${Date.now()}`,
        title: `Flight Intercepted: ${flight.originCode} → ${flight.destinationCode}`,
        currentPrice: currentPrice,
        oldPrice: originalPrice,
        category: "Travel",
        createdAt: new Date(),
      });
    }
    
    addAIMessage(`🟢 **INTERCEPT EXECUTED** 🟢\n\nCommander, flight ${flight.originCode} -> ${flight.destinationCode} has been booked. Savings of ${formatCurrency(savings)} added to feed.`, "general");
  };

  // Click Logic: HOLD - Trigger exact phrase
  const handleFlightHold = (flightId: string) => {
    if (!trackedFlights) return;
    
    // Exact phrase as requested
    addAIMessage("Understood. Monitoring for further drops.", "general");
  };

  return (
    <>
      {/* Floating AI Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] transition-all duration-300 flex items-center justify-center group"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Sparkles className="w-7 h-7 group-hover:rotate-12 transition-transform duration-300" />
        {!isOpen && (
          <motion.div
            className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-950"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={chatPanelRef}
            initial={{ opacity: 0, x: 400, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 400, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 z-50 w-96 h-[500px] bg-zinc-900/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/20 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-blue-600/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                    STAR
                  </h3>
                  <p className="text-xs text-zinc-400">Star Online</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-cyan-400" />
                  </div>
                  <p className="text-sm text-zinc-400 mb-2">Star Ready</p>
                  <p className="text-xs text-zinc-500">Click "Analyze Missions" to begin</p>
                </div>
              ) : (
                messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.sender === "ai"
                          ? "bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-zinc-100"
                          : "bg-zinc-800 border border-zinc-700 text-zinc-300"
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.text.split("**").map((part, i) =>
                          i % 2 === 1 ? (
                            <strong key={i} className="text-cyan-400 font-semibold">
                              {part}
                            </strong>
                          ) : (
                            part
                          )
                        )}
                      </p>
                      {/* Interactive UI: Render two clickable buttons in the chat window */}
                      {message.flightOptions && message.sender === "ai" && (
                        <div className="mt-3 flex gap-2">
                          <Button
                            onClick={() => handleFlightIntercept(message.flightOptions!.flightId)}
                            size="sm"
                            className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-display font-bold text-[10px] uppercase tracking-wider border border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                          >
                            INTERCEPT
                          </Button>
                          <Button
                            onClick={() => handleFlightHold(message.flightOptions!.flightId)}
                            size="sm"
                            className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-display font-bold text-[10px] uppercase tracking-wider border border-zinc-600"
                          >
                            HOLD
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-cyan-500/20 bg-zinc-900/50 space-y-3">
              {/* Pending Action Confirmation */}
              {pendingAction && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2"
                >
                  <Button
                    onClick={confirmAction}
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs"
                  >
                    Confirm
                  </Button>
                  <Button
                    onClick={cancelAction}
                    size="sm"
                    variant="outline"
                    className="flex-1 border-zinc-700 text-zinc-400 hover:text-white text-xs"
                  >
                    Cancel
                  </Button>
                </motion.div>
              )}

              {/* Text Input */}
              <form onSubmit={handleSubmit} className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Command Star..."
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-500 focus:ring-cyan-500/20 pr-10"
                  />
                  <button
                    type="button"
                    onClick={handleMicClick}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isListening
                        ? "bg-red-600 text-white animate-pulse"
                        : "bg-zinc-700 hover:bg-zinc-600 text-zinc-400 hover:text-cyan-400"
                    }`}
                  >
                    {isListening ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <Button
                  type="submit"
                  size="icon"
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>

              {/* Quick Action Button */}
              <Button
                onClick={handleAnalyzeClick}
                variant="outline"
                className="w-full border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 font-display font-bold text-xs uppercase tracking-wider"
              >
                <Sparkles className="w-3 h-3 mr-2" />
                Analyze Missions
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
