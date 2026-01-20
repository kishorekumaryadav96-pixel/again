import { formatDistanceToNow, format } from "date-fns";
import { Trophy, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import type { KilledSniper } from "@/App";
import { formatCurrency } from "@/lib/formatCurrency";

interface MissionHistoryProps {
  killedSnipers: KilledSniper[];
}

export function MissionHistory({ killedSnipers }: MissionHistoryProps) {
  if (killedSnipers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500 text-sm font-display">
          You haven't got any kills yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {killedSnipers.map((killedSniper) => (
        <motion.div
          key={killedSniper.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-green-500/30 transition-all duration-300 group"
        >
          <div className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-zinc-100 group-hover:text-green-400 transition-colors mb-2">
                  {killedSniper.targetName}
                </h3>
                <div className="flex items-center gap-2 text-zinc-400 text-xs">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {format(killedSniper.killedAt, "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-display font-bold text-green-500">
                    SAVED {formatCurrency(killedSniper.savedAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
