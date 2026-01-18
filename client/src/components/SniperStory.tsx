import { motion } from "framer-motion";
import { Loader2, CheckCircle2 } from "lucide-react";
import type { Sniper } from "@shared/schema";

interface SniperStoryProps {
  sniper: Sniper;
  onClick: () => void;
}

export function SniperStory({ sniper, onClick }: SniperStoryProps) {
  const isHit = sniper.status === "hit";
  
  return (
    <div className="flex flex-col items-center space-y-2 cursor-pointer group" onClick={onClick}>
      <div className="relative">
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

        {/* Avatar */}
        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-zinc-900 bg-zinc-800">
          <img 
            src={sniper.imageUrl || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=100&h=100&fit=crop"} 
            alt={sniper.targetName}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
          />
        </div>
      </div>
      
      <span className="text-[10px] font-display uppercase tracking-wider text-zinc-400 truncate w-20 text-center group-hover:text-cyan-400 transition-colors">
        {sniper.targetName}
      </span>
    </div>
  );
}
