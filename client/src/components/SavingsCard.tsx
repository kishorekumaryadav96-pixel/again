import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { 
  UtensilsCrossed, 
  ShoppingBag, 
  Receipt, 
  Car, 
  Film, 
  Heart, 
  Plane, 
  GraduationCap, 
  MoreHorizontal,
  Clock
} from "lucide-react";
import type { Saving, SavingCategory } from "@/types/savings";
import { formatCurrency, formatNumber } from "@/lib/formatCurrency";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import { useState } from "react";

interface SavingsCardProps {
  saving: Saving;
  onKill?: (id: string) => void;
}

const categoryIcons: Record<SavingCategory, typeof UtensilsCrossed> = {
  "Food & Dining": UtensilsCrossed,
  "Shopping": ShoppingBag,
  "Bills & Utilities": Receipt,
  "Transportation": Car,
  "Entertainment": Film,
  "Health & Fitness": Heart,
  "Travel": Plane,
  "Education": GraduationCap,
  "Other": MoreHorizontal,
};

const categoryColors: Record<SavingCategory, string> = {
  "Food & Dining": "text-orange-500",
  "Shopping": "text-pink-500",
  "Bills & Utilities": "text-blue-500",
  "Transportation": "text-purple-500",
  "Entertainment": "text-yellow-500",
  "Health & Fitness": "text-red-500",
  "Travel": "text-cyan-500",
  "Education": "text-indigo-500",
  "Other": "text-zinc-500",
};

export function SavingsCard({ saving, onKill }: SavingsCardProps) {
  const [isKilling, setIsKilling] = useState(false);
  const [showKillMessage, setShowKillMessage] = useState(false);
  const [killedAmount, setKilledAmount] = useState<number>(0);
  
  // Map category to SavingCategory type with fallback
  const normalizeCategory = (category: string): SavingCategory => {
    const upperCategory = category.toUpperCase();
    if (upperCategory.includes("ELECTRONICS") || upperCategory.includes("COMPUTER")) {
      return "Shopping";
    }
    if (upperCategory.includes("FOOD") || upperCategory.includes("BEVERAGE") || upperCategory.includes("GROCERIES")) {
      return "Food & Dining";
    }
    // Try to match existing categories
    const matchedCategory = Object.keys(categoryIcons).find(
      (key) => key.toUpperCase() === upperCategory || upperCategory.includes(key.toUpperCase())
    ) as SavingCategory | undefined;
    return matchedCategory || "Other";
  };
  
  const normalizedCategory = normalizeCategory(saving.category);
  const Icon = categoryIcons[normalizedCategory] || MoreHorizontal;
  const iconColor = categoryColors[normalizedCategory] || "text-zinc-500";
  const savingsAmount = Number(saving.oldPrice) - Number(saving.currentPrice);
  const savingsPercentage = saving.oldPrice > 0 ? Math.round((savingsAmount / saving.oldPrice) * 100) : 0;

  const handleKillClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Calculate savings: Original Price - Current Price
    const originalPrice = Number(saving.oldPrice);
    const currentPrice = Number(saving.currentPrice);
    const savedAmount = Math.max(0, Number(originalPrice) - Number(currentPrice));
    
    setKilledAmount(savedAmount);
    
    // Trigger confetti explosion
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    confetti({
      particleCount: 150,
      spread: 70,
      origin: { x, y },
      colors: ['#00FFFF', '#06B6D4', '#3B82F6', '#60A5FA'],
      disableForReducedMotion: true,
    });

    // Show overlay message
    setShowKillMessage(true);
    
    // After 2 seconds, remove the card
    setTimeout(() => {
      setShowKillMessage(false);
      setIsKilling(true);
      setTimeout(() => {
        if (onKill) {
          onKill(saving.id);
        }
      }, 300);
    }, 2000);
  };

  if (isKilling) {
    return (
      <motion.div
        initial={{ opacity: 1, scale: 1 }}
        animate={{ opacity: 0, scale: 0, rotate: -180 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-xl bg-zinc-900/50 border border-zinc-800"
      >
        <div className="p-5 h-32" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-green-500/30 transition-all duration-300 group"
    >
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Kill Message Overlay */}
      {showKillMessage && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/95 backdrop-blur-sm"
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="text-3xl font-display font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2"
            >
              MISSION KILLED!
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl font-display font-bold text-green-400"
            >
              You saved {formatCurrency(killedAmount)}!
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Content */}
      <div className="relative p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center ${iconColor} group-hover:scale-110 transition-transform duration-300`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-green-400 transition-colors break-words">
                {saving.title}
              </h3>
              {/* Category Label - Below Product Name with proper padding */}
              <div className="mt-2 pt-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em]">
                  {saving.category.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-zinc-800/50">
          {/* Price Comparison */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Was:</span>
                <span className="text-sm text-zinc-400 line-through">
                  {formatCurrency(saving.oldPrice)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Now:</span>
                <span className="text-lg font-bold text-green-500">
                  {formatCurrency(saving.currentPrice)}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-1">
              {savingsPercentage > 0 && (
                <div className="px-2 py-1 rounded bg-green-500/10 border border-green-500/20">
                  <span className="text-xs font-bold text-green-500 uppercase tracking-wider">
                    -{savingsPercentage}%
                  </span>
                </div>
              )}
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-display font-bold text-green-500">
                  {formatCurrency(savingsAmount)}
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">SAVED</span>
            </div>
          </div>

          {/* Timestamp and Kill Button - Bottom Section */}
          <div className="mt-4 pt-3 border-t border-zinc-800/30">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 text-zinc-400 flex-shrink-0">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs whitespace-nowrap">
                  {formatDistanceToNow(saving.createdAt, { addSuffix: true })}
                </span>
              </div>
              
              {/* Kill Button - Red Button with Neon Borders */}
              {onKill && !showKillMessage && (
                <Button
                  onClick={handleKillClick}
                  className="px-4 py-2 bg-red-950/90 hover:bg-red-900/90 text-red-400 font-display font-bold text-xs uppercase tracking-wider border-2 border-red-500/50 hover:border-red-400 shadow-lg hover:shadow-red-500/50 transition-all rounded-lg flex-shrink-0"
                  title="Kill Sniper"
                >
                  KILL
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
