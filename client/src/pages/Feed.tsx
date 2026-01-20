import { useState, useEffect } from "react";
import { SniperStory } from "@/components/SniperStory";
import { SavingsForm } from "@/components/SavingsForm";
import { SavingsCard } from "@/components/SavingsCard";
import { SniperCard } from "@/components/SniperCard";
import { useSavings } from "@/App";
import { Plus, Plane, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/formatCurrency";

export default function Feed() {
  const { localSavings, localSnipers, deleteSniper, killSniper, killSaving, updateSniperPrice, trackedFlights } = useSavings();
  const [isSavingsFormOpen, setIsSavingsFormOpen] = useState(false);
  const [highlightedProductId, setHighlightedProductId] = useState<number | null>(null);

  // Visual Feedback: Read highlighted product ID from localStorage
  useEffect(() => {
    const checkHighlight = () => {
      try {
        const stored = localStorage.getItem("highlighted-product-id");
        if (stored) {
          const { id, timestamp } = JSON.parse(stored);
          // Only use if it's recent (within last 5 seconds)
          if (Date.now() - timestamp < 5000) {
            setHighlightedProductId(id);
            // Auto-clear after 3 seconds
            setTimeout(() => setHighlightedProductId(null), 3000);
          } else {
            localStorage.removeItem("highlighted-product-id");
            setHighlightedProductId(null);
          }
        } else {
          setHighlightedProductId(null);
        }
      } catch {
        setHighlightedProductId(null);
      }
    };

    // Check immediately
    checkHighlight();
    
    // Check periodically
    const interval = setInterval(checkHighlight, 100);
    
    return () => clearInterval(interval);
  }, []);

  // Live Pulse: Simulate live market by updating prices +/- ₹20 every 8 seconds
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

  return (
    <div className="min-h-screen bg-zinc-950 w-full">
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Snipers Stories Bar */}
        <section className="py-4 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-sm overflow-x-auto scrollbar-hide">
          <div className="flex px-4 gap-4">
            {/* Add Saving Button */}
            <button
              onClick={() => setIsSavingsFormOpen(true)}
              className="flex flex-col items-center space-y-2 cursor-pointer group"
            >
              <div className="w-[68px] h-[68px] rounded-full border border-dashed border-zinc-700 flex items-center justify-center bg-zinc-900 group-hover:border-green-500/50 transition-colors">
                <Plus className="w-6 h-6 text-green-500 group-hover:text-green-400" />
              </div>
              <span className="text-[10px] font-display uppercase tracking-wider text-green-500 group-hover:text-green-400">
                New
              </span>
            </button>

            {/* Active Snipers */}
            {localSnipers.map((sniper) => (
              <SniperStory 
                key={sniper.id} 
                sniper={sniper} 
                onClick={() => console.log('View sniper details')}
                onDelete={deleteSniper}
                onKill={killSniper}
              />
            ))}
          </div>
        </section>

        {/* Active Missions (Flights) */}
        {trackedFlights && trackedFlights.length > 0 && (
          <section className="px-4 py-6 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-display uppercase tracking-[0.2em] text-zinc-500">Active Missions</h2>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-xs text-cyan-500 font-medium">
                  {trackedFlights.length} {trackedFlights.length === 1 ? 'mission' : 'missions'}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {trackedFlights.map((flight: any) => {
                const savingsAmount = flight.originalPrice - flight.currentPrice;
                const savingsPercentage = Math.round((savingsAmount / flight.originalPrice) * 100);
                
                return (
                  <motion.div
                    key={flight.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-cyan-500/30 transition-all duration-300"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-cyan-500">
                            <Plane className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-bold text-zinc-300">{flight.originCode}</span>
                              <span className="text-xs text-zinc-500">→</span>
                              <span className="text-sm font-bold text-zinc-300">{flight.destinationCode}</span>
                            </div>
                            <div className="text-xs text-zinc-400">
                              {flight.origin} → {flight.destination}
                            </div>
                          </div>
                        </div>
                        <div className="px-3 py-1 rounded bg-cyan-500/10 border border-cyan-500/30">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                            TRACKING...
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
                        <div>
                          <div className="text-xs text-zinc-500 mb-1">Current Price</div>
                          <div className="text-lg font-bold text-green-500">
                            {formatCurrency(flight.currentPrice)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-zinc-500 mb-1">Savings</div>
                          <div className="flex items-center gap-1">
                            <TrendingDown className="w-4 h-4 text-green-500" />
                            <span className="text-lg font-bold text-green-500">
                              {formatCurrency(savingsAmount)}
                            </span>
                            <span className="text-xs text-green-500 ml-1">({savingsPercentage}%)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* Snipers Feed */}
        {localSnipers.length > 0 && (
          <section className="px-4 py-6 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-display uppercase tracking-[0.2em] text-zinc-500">Active Snipers</h2>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-xs text-cyan-500 font-medium">
                  {localSnipers.length} {localSnipers.length === 1 ? 'sniper' : 'snipers'}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {localSnipers.map((sniper) => (
                <SniperCard 
                  key={sniper.id} 
                  sniper={sniper} 
                  onKill={killSniper}
                  isHighlighted={highlightedProductId === sniper.id}
                />
              ))}
            </div>
          </section>
        )}

        {/* MY SAVINGS Section */}
        <section className="px-4 py-6 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-display uppercase tracking-[0.2em] text-zinc-500">MY SAVINGS</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-500 font-medium">
                {localSavings.length} {localSavings.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {localSavings.length === 0 ? (
              <div className="text-center py-20 opacity-50">
                <p className="font-display text-zinc-600 mb-2">No savings yet</p>
                <p className="text-sm text-zinc-500">Kill an active sniper to add it here</p>
              </div>
            ) : (
              localSavings.map((saving) => (
                <SavingsCard key={saving.id} saving={saving} onKill={undefined} />
              ))
            )}
          </div>
        </section>
      </main>

      <SavingsForm open={isSavingsFormOpen} onOpenChange={setIsSavingsFormOpen} />
    </div>
  );
}
