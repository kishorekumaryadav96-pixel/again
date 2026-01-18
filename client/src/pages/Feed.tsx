import { motion } from "framer-motion";
import { useDeals } from "@/hooks/use-deals";
import { useSnipers } from "@/hooks/use-snipers";
import { DealCard } from "@/components/DealCard";
import { SniperStory } from "@/components/SniperStory";
import { CreateDealDialog } from "@/components/CreateDealDialog";
import { Loader2, Plus } from "lucide-react";

export default function Feed() {
  const { data: deals, isLoading: dealsLoading } = useDeals();
  const { data: snipers, isLoading: snipersLoading } = useSnipers();

  if (dealsLoading || snipersLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
        <p className="text-cyan-500 font-display animate-pulse tracking-widest text-xs uppercase">Initializing System...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-display font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
              LIFE LEVER
            </h1>
            <span className="bg-zinc-800 text-[10px] px-1.5 py-0.5 rounded text-zinc-400 font-mono">
              BETA
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto">
        {/* Snipers Stories Bar */}
        <section className="py-4 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-sm overflow-x-auto scrollbar-hide">
          <div className="flex px-4 gap-4">
            {/* Add Sniper Button */}
            <div className="flex flex-col items-center space-y-2 cursor-pointer group">
              <div className="w-[68px] h-[68px] rounded-full border border-dashed border-zinc-700 flex items-center justify-center bg-zinc-900 group-hover:border-cyan-500/50 transition-colors">
                <Plus className="w-6 h-6 text-zinc-500 group-hover:text-cyan-500" />
              </div>
              <span className="text-[10px] font-display uppercase tracking-wider text-zinc-500 group-hover:text-cyan-500">
                New
              </span>
            </div>

            {/* Active Snipers */}
            {snipers?.map((sniper) => (
              <SniperStory 
                key={sniper.id} 
                sniper={sniper} 
                onClick={() => console.log('View sniper details')} 
              />
            ))}
          </div>
        </section>

        {/* Deals Feed */}
        <section className="px-4 py-6 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-display uppercase tracking-[0.2em] text-zinc-500">Live Intel</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-500 font-medium">Online</span>
            </div>
          </div>

          <div className="space-y-6">
            {deals?.length === 0 ? (
              <div className="text-center py-20 opacity-50">
                <p className="font-display text-zinc-600">No active targets</p>
              </div>
            ) : (
              deals?.map((deal, i) => (
                <motion.div
                  key={deal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <DealCard deal={deal} />
                </motion.div>
              ))
            )}
          </div>
        </section>
      </main>

      <CreateDealDialog />
    </div>
  );
}
