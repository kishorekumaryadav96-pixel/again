import { useState } from "react";
import { Plane, Search, MapPin, TrendingDown, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/formatCurrency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TrackedFlight {
  id: string;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  originalPrice: number;
  currentPrice: number;
  status: "tracked" | "killed";
  trackedAt: Date;
}

export default function Logistics() {
  const [destination, setDestination] = useState("");
  const [trackedFlights, setTrackedFlights] = useState<TrackedFlight[]>([
    {
      id: "1",
      origin: "Mumbai",
      originCode: "BOM",
      destination: "Dubai",
      destinationCode: "DXB",
      originalPrice: 22000,
      currentPrice: 18500,
      status: "tracked",
      trackedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
  ]);

  const handleMonitorFlight = () => {
    if (!destination.trim()) return;
    
    // In a real app, this would search for flights
    // For now, just show a message or add to tracked flights
    console.log("Monitoring flights to:", destination);
  };

  const savingsAmount = (flight: TrackedFlight) => flight.originalPrice - flight.currentPrice;
  const savingsPercentage = (flight: TrackedFlight) =>
    Math.round((savingsAmount(flight) / flight.originalPrice) * 100);

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 p-4">
        <h1 className="text-xl font-display font-black tracking-widest text-cyan-500 uppercase flex items-center gap-2">
          <Plane className="w-6 h-6" />
          Flight Interceptor
        </h1>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {/* Search Section */}
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-display uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
            <Search className="w-4 h-4 text-cyan-500" /> Intercept Flight
          </h2>
          
          <div className="space-y-3">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="text"
                placeholder="Enter destination (e.g., Dubai, New York)"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="bg-zinc-950 border-zinc-800 pl-10 text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleMonitorFlight();
                  }
                }}
              />
            </div>
            
            <Button
              onClick={handleMonitorFlight}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-display font-bold"
            >
              <Plane className="w-4 h-4 mr-2" />
              Monitor Flight
            </Button>
          </div>
        </section>

        {/* Tracked Flights Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-display uppercase tracking-[0.2em] text-zinc-500">Tracked Flights</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
              <span className="text-xs text-cyan-500 font-medium">
                {trackedFlights.length} {trackedFlights.length === 1 ? 'flight' : 'flights'}
              </span>
            </div>
          </div>

          {trackedFlights.length === 0 ? (
            <div className="text-center py-20 opacity-50">
              <Plane className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
              <p className="font-display text-zinc-600 mb-2">No flights tracked yet</p>
              <p className="text-sm text-zinc-500">Monitor a flight to get started</p>
            </div>
          ) : (
            trackedFlights.map((flight) => (
              <motion.div
                key={flight.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-cyan-500/30 transition-all duration-300 group"
              >
                {/* Background Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Content */}
                <div className="relative p-5">
                  {/* Header with Route and Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-cyan-500 group-hover:scale-110 transition-transform duration-300">
                          <Plane className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-zinc-300">{flight.originCode}</span>
                              <span className="text-xs text-zinc-500">→</span>
                              <span className="text-sm font-bold text-zinc-300">{flight.destinationCode}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <span>{flight.origin}</span>
                            <span>→</span>
                            <span>{flight.destination}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {flight.status === "tracked" && (
                      <div className="px-3 py-1 rounded bg-cyan-500/10 border border-cyan-500/30">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                          Tracked
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Price Comparison */}
                  <div className="space-y-3 pt-4 border-t border-zinc-800/50">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500">Was:</span>
                          <span className="text-sm text-zinc-400 line-through">
                            {formatCurrency(flight.originalPrice)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500">Now:</span>
                          <span className="text-lg font-bold text-green-500">
                            {formatCurrency(flight.currentPrice)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1">
                        <div className="px-2 py-1 rounded bg-green-500/10 border border-green-500/20">
                          <span className="text-xs font-bold text-green-500 uppercase tracking-wider">
                            -{savingsPercentage(flight)}%
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <TrendingDown className="w-4 h-4 text-green-500" />
                          <span className="text-lg font-display font-bold text-green-500">
                            {formatCurrency(savingsAmount(flight))}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Saved</span>
                      </div>
                    </div>

                    {/* Footer with Time */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/30">
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-xs">
                          Tracked {new Date(flight.trackedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
