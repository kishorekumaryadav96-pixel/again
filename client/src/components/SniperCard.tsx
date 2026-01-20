import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Crosshair, Clock, AlertCircle } from "lucide-react";
import type { Sniper } from "@shared/schema";
import { formatCurrency } from "@/lib/formatCurrency";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import { useState } from "react";

interface SniperCardProps {
  sniper: Sniper;
  onKill?: (id: number) => void;
  isHighlighted?: boolean;
}

export function SniperCard({ sniper, onKill, isHighlighted = false }: SniperCardProps) {
  const [isKilling, setIsKilling] = useState(false);
  const [showKillMessage, setShowKillMessage] = useState(false);
  const [killedAmount, setKilledAmount] = useState<number>(0);
  
  const targetPrice = Number(sniper.targetPrice);
  const currentPrice = sniper.currentPrice ? Number(sniper.currentPrice) : null;
  
  // Get original price from storage
  const originalPrices = JSON.parse(localStorage.getItem("sniper-original-prices") || "{}");
  const originalPrice = Number(originalPrices[sniper.id] ?? (currentPrice !== null ? currentPrice : targetPrice));
  
  // Current price for display (use currentPrice if available, otherwise originalPrice)
  const displayCurrentPrice = currentPrice !== null ? Number(currentPrice) : originalPrice;
  
  // Calculate savings: Original Price - Current Price
  const savingsAmount = Math.max(0, originalPrice - displayCurrentPrice);
  const savingsPercentage = originalPrice > 0 ? Math.round((savingsAmount / originalPrice) * 100) : 0;

  // Tactical Glow: Determine button and card states
  const isPriceBelowTarget = displayCurrentPrice < targetPrice;
  const isPriceAboveOriginal = displayCurrentPrice > originalPrice;
  
  // Affiliate Wrapper: executeStrike function
  const executeStrike = (url: string) => {
    // Append affiliate tag to URL
    const separator = url.includes('?') ? '&' : '?';
    const affiliateUrl = `${url}${separator}tag=commander-21`;
    // Open in new tab
    window.open(affiliateUrl, '_blank', 'noopener,noreferrer');
  };

  const handleKillClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Get original price from storage
    const originalPrices = JSON.parse(localStorage.getItem("sniper-original-prices") || "{}");
    const originalPrice = Number(originalPrices[sniper.id] ?? (currentPrice !== null ? currentPrice : targetPrice));
    
    // Current Price = the price when killed (what they actually paid)
    const currentPriceWhenKilled = currentPrice !== null ? Number(currentPrice) : Number(targetPrice);
    
    // Calculate savings: Original Price - Current Price
    // Example: Original = ₹50,000, Current = ₹45,000, Savings = ₹50,000 - ₹45,000 = ₹5,000
    const savingsAmount = Math.max(0, Number(originalPrice) - Number(currentPriceWhenKilled));
    
    setKilledAmount(savingsAmount);
    
    // Trigger confetti explosion (blue and cyan)
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
          onKill(sniper.id);
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
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-xl bg-zinc-900/50 border transition-all duration-300 group ${
          isHighlighted 
            ? "border-cyan-500 shadow-[0_0_30px_rgba(34,211,238,0.5)] ring-2 ring-cyan-500/50" 
            : isPriceAboveOriginal
            ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
            : "border-zinc-800 hover:border-cyan-500/30"
        }`}
      >
        {/* Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

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
              <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-cyan-500 group-hover:scale-110 transition-transform duration-300">
                <Crosshair className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-green-400 transition-colors break-words">
                  {sniper.targetName}
                </h3>
                {/* Category Label - Below Product Name with proper padding */}
                <div className="mt-2 pt-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em]">
                    {(() => {
                      const categories = JSON.parse(localStorage.getItem("sniper-categories") || "{}");
                      return categories[sniper.id] || "OTHER";
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-zinc-800/50">
            {/* Price Comparison - Same layout as SavingsCard */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Was:</span>
                  <span className="text-sm text-zinc-400 line-through">
                    {formatCurrency(originalPrice)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Now:</span>
                  <span className="text-lg font-bold text-green-500">
                    {formatCurrency(displayCurrentPrice)}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-1">
                <div className="px-2 py-1 rounded bg-green-500/10 border border-green-500/20">
                  <span className="text-xs font-bold text-green-500 uppercase tracking-wider">
                    -{savingsPercentage}%
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-display font-bold text-green-500">
                    {formatCurrency(savingsAmount)}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Saved</span>
              </div>
            </div>

            {/* Target Price - Small and non-intrusive at bottom */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/30">
              <div className="flex items-center gap-1.5 text-zinc-400 flex-shrink-0">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs whitespace-nowrap">
                  {formatDistanceToNow(sniper.createdAt, { addSuffix: true })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500">Target:</span>
                <span className="text-xs text-zinc-400">
                  {formatCurrency(targetPrice)}
                </span>
              </div>
            </div>

            {/* Kill Button - Bottom Right with Tactical Glow */}
            {onKill && !showKillMessage && (
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleKillClick}
                  className={`px-4 py-2 font-display font-bold text-xs uppercase tracking-wider border-2 transition-all rounded-lg flex-shrink-0 relative overflow-hidden ${
                    isPriceBelowTarget
                      ? "bg-green-600 hover:bg-green-500 text-white border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.8)] hover:shadow-[0_0_30px_rgba(34,197,94,1)] animate-pulse"
                      : "bg-red-950/90 hover:bg-red-900/90 text-red-400 border-red-500/50 hover:border-red-400 shadow-lg hover:shadow-red-500/50"
                  }`}
                  style={isPriceBelowTarget ? { 
                    animation: 'pulse 2s infinite',
                    boxShadow: '0 0 20px rgba(34, 197, 94, 0.8), 0 0 40px rgba(34, 197, 94, 0.4), inset 0 0 20px rgba(34, 197, 94, 0.2)'
                  } : {}}
                  title="Kill Sniper"
                >
                  {isPriceBelowTarget && (
                    <span className="absolute inset-0 bg-green-400/30 animate-ping" style={{ animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
                  )}
                  <span className="relative z-10">KILL</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
