import { motion } from "framer-motion";
import { Trophy, Clock, Skull } from "lucide-react";
import confetti from "canvas-confetti";
import { formatDistanceToNow } from "date-fns";
import type { Deal } from "@shared/schema";
import { useKillDeal } from "@/hooks/use-deals";

interface DealCardProps {
  deal: Deal;
}

export function DealCard({ deal }: DealCardProps) {
  const killMutation = useKillDeal();
  const isKilled = deal.status === "killed";

  const handleKill = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isKilled) return;

    // Trigger confetti explosion
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x, y },
      colors: ['#00FFFF', '#39FF14', '#ffffff'],
      disableForReducedMotion: true,
    });

    killMutation.mutate(deal.id);
  };

  const discount = deal.originalPrice 
    ? Math.round(((Number(deal.originalPrice) - Number(deal.price)) / Number(deal.originalPrice)) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl bg-zinc-900/50 border ${
        isKilled ? "border-green-900/50" : "border-zinc-800 hover:border-cyan-500/30"
      } transition-all duration-300 group`}
    >
      {/* Background Glow */}
      {isKilled && (
        <div className="absolute inset-0 bg-green-500/5 pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center">
            <span className="text-xs font-display text-zinc-400">AS</span>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">Assassin #{deal.finderId}</p>
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <Clock className="w-3 h-3" />
              <span>{deal.createdAt ? formatDistanceToNow(new Date(deal.createdAt)) : 'Just now'} ago</span>
            </div>
          </div>
        </div>
        
        {isKilled ? (
          <div className="px-2 py-1 rounded bg-green-500/10 border border-green-500/20 flex items-center gap-1.5">
            <Trophy className="w-3 h-3 text-green-500" />
            <span className="text-[10px] font-display uppercase tracking-widest text-green-500">Killed</span>
          </div>
        ) : (
          <div className="px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/20 animate-pulse">
            <span className="text-[10px] font-display uppercase tracking-widest text-cyan-500">Active</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/20 relative group-hover:shadow-[0_0_20px_rgba(0,255,255,0.1)] transition-shadow duration-500">
          <img 
            src={deal.imageUrl || "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80"} 
            alt={deal.title}
            className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${isKilled ? "grayscale opacity-50" : ""}`}
          />
          
          {discount > 0 && (
            <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
              -{discount}%
            </div>
          )}
        </div>

        <div>
          <h3 className={`text-lg font-bold leading-tight ${isKilled ? "text-zinc-500 line-through" : "text-zinc-100"}`}>
            {deal.title}
          </h3>
          <p className="mt-1 text-sm text-zinc-400 line-clamp-2">{deal.description}</p>
        </div>

        <div className="flex items-end justify-between pt-2">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-display font-bold text-white">
                {deal.currency}{deal.price}
              </span>
              {deal.originalPrice && (
                <span className="text-sm text-zinc-500 line-through">
                  {deal.currency}{deal.originalPrice}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-1">{deal.killCount} kills confirmed</p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleKill}
            disabled={isKilled || killMutation.isPending}
            className={`
              relative overflow-hidden px-6 py-2.5 rounded-lg font-display text-sm font-bold tracking-wider uppercase
              transition-all duration-300
              ${isKilled 
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700" 
                : "bg-cyan-500 text-black hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] border border-cyan-400"
              }
            `}
          >
            {killMutation.isPending ? (
              "Executing..."
            ) : isKilled ? (
              <span className="flex items-center gap-2">
                <Trophy className="w-4 h-4" /> Claimed
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Skull className="w-4 h-4" /> Kill Deal
              </span>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
