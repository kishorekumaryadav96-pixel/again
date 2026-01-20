import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, X } from "lucide-react";
import type { Sniper } from "@shared/schema";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import { formatCurrency } from "@/lib/formatCurrency";

interface SniperStoryProps {
  sniper: Sniper;
  onClick: () => void;
  onDelete?: (id: number) => void;
  onKill?: (id: number) => void;
}

export function SniperStory({ sniper, onClick, onDelete, onKill }: SniperStoryProps) {
  const isHit = sniper.status === "hit";
  const [isKilling, setIsKilling] = useState(false);
  const [showKillMessage, setShowKillMessage] = useState(false);
  const [killedAmount, setKilledAmount] = useState<number>(0);
  
  const targetPrice = Number(sniper.targetPrice);
  const currentPrice = sniper.currentPrice ? Number(sniper.currentPrice) : null;
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(sniper.id);
    }
  };

  const handleKillClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Calculate savings amount: Original Price - Current Price
    // Original Price = the price when sniper was created (use currentPrice if set, otherwise targetPrice)
    // Current Price = the price when killed (what they actually paid)
    const originalPrice = currentPrice !== null ? currentPrice : targetPrice;
    const currentPriceWhenKilled = currentPrice !== null ? currentPrice : targetPrice;
    const savingsAmount = Math.max(0, originalPrice - currentPriceWhenKilled); // Ensure non-negative
    
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
        className="flex flex-col items-center space-y-2 group relative"
      >
        <div className="w-16 h-16 rounded-full bg-zinc-800" />
      </motion.div>
    );
  }
  
  return (
    <>
      <motion.div
        initial={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center space-y-2 group relative"
      >
        <div className="relative cursor-pointer" onClick={onClick}>
          {/* Ring Animation */}
          <motion.div
            animate={isHit ? {} : { rotate: 360 }}
            transition={isHit ? {} : { duration: 4, repeat: Infinity, ease: "linear" }}
            className={`w-[72px] h-[72px] rounded-full absolute -inset-1 border-2 border-dashed ${
              isHit ? "border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]" : "border-cyan-500/50 group-hover:border-cyan-400"
            }`}
          />
          
          {/* Status Indicator */}
          <div className="absolute -bottom-1 -right-1 z-10 bg-zinc-950 rounded-full p-0.5">
            {isHit ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 fill-green-500/20" />
            ) : (
              <Loader2 className="w-5 h-5 text-cyan-500 animate-spin" />
            )}
          </div>

          {/* Kill Sniper Button - Red Button with Neon Borders */}
          {onKill && !showKillMessage && (
            <Button
              onClick={handleKillClick}
              className="absolute -top-1 -right-1 z-20 px-2 py-1 bg-red-950/90 hover:bg-red-900/90 text-red-400 font-display font-bold text-[9px] uppercase tracking-wider border-2 border-red-500/50 hover:border-red-400 shadow-lg hover:shadow-red-500/50 transition-all rounded"
              title="Kill Sniper"
            >
              KILL
            </Button>
          )}
          
          {/* Kill Message Overlay */}
          {showKillMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/95 backdrop-blur-sm rounded-full"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="text-xs font-display font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-1"
                >
                  KILLED!
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-[10px] font-display font-bold text-green-400"
                >
                  {formatCurrency(killedAmount)}
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Avatar */}
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-zinc-900 bg-zinc-800">
            <img 
              src={sniper.imageUrl || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=100&h=100&fit=crop"} 
              alt={sniper.targetName}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
            />
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-display uppercase tracking-wider text-zinc-400 truncate w-20 text-center group-hover:text-cyan-400 transition-colors">
            {sniper.targetName}
          </span>
          <div className="flex flex-col items-center gap-0.5 text-[9px]">
            <span className="text-zinc-500">Target: {formatCurrency(Number(sniper.targetPrice))}</span>
            {sniper.currentPrice && (
              <span className="text-green-500">Current: {formatCurrency(Number(sniper.currentPrice))}</span>
            )}
          </div>
          {onDelete && (
            <Button
              onClick={handleDelete}
              variant="ghost"
              size="sm"
              className="h-5 px-2 text-[10px] text-red-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </motion.div>
    </>
  );
}
