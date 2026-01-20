import { useState, useEffect } from "react";
import { SniperStory } from "@/components/SniperStory";
import { SavingsForm } from "@/components/SavingsForm";
import { SavingsCard } from "@/components/SavingsCard";
import { SniperCard } from "@/components/SniperCard";
import { useSavings } from "@/App";
import { Plus } from "lucide-react";

export default function Feed() {
  const { localSavings, localSnipers, deleteSniper, killSniper, killSaving, updateSniperPrice } = useSavings();
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
