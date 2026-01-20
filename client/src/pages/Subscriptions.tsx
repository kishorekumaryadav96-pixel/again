import { useState } from "react";
import { Skull, TrendingUp, AlertCircle, X, CheckCircle2, Ghost } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/formatCurrency";
import { Button } from "@/components/ui/button";

interface Subscription {
  id: string;
  name: string;
  price: number;
  status: "active" | "ghost";
  lastDetected?: Date;
  category: string;
}

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([
    {
      id: "1",
      name: "Netflix",
      price: 649,
      status: "active",
      lastDetected: new Date(),
      category: "Entertainment",
    },
    {
      id: "2",
      name: "iCloud",
      price: 149,
      status: "active",
      lastDetected: new Date(),
      category: "Cloud Storage",
    },
    {
      id: "3",
      name: "Gym Membership",
      price: 3701,
      status: "ghost",
      lastDetected: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      category: "Fitness",
    },
  ]);

  const totalBurnRate = subscriptions.reduce((sum, sub) => sum + sub.price, 0);

  const handleTerminate = (id: string) => {
    setSubscriptions((prev) => prev.filter((sub) => sub.id !== id));
  };

  const getStatusBadge = (subscription: Subscription) => {
    if (subscription.status === "active") {
      return (
        <div className="px-3 py-1 rounded bg-green-500/10 border border-green-500/30">
          <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Active
          </span>
        </div>
      );
    } else {
      return (
        <div className="px-3 py-1 rounded bg-red-500/10 border border-red-500/30">
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
            <Ghost className="w-3 h-3" />
            GHOST
          </span>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 p-4">
        <h1 className="text-xl font-display font-black tracking-widest text-cyan-500 uppercase flex items-center gap-2">
          <Skull className="w-6 h-6" />
          Financial Assassin
        </h1>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {/* Burn Rate Counter */}
        <section className="bg-gradient-to-br from-red-950/50 to-zinc-900/50 border border-red-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-display uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-red-500" />
              Burn Rate
            </h2>
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-display font-black text-red-400">
              {formatCurrency(totalBurnRate)}
            </span>
            <span className="text-sm text-zinc-500 uppercase tracking-wider">/mo</span>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            Total monthly subscription cost
          </p>
        </section>

        {/* Subscriptions List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-display uppercase tracking-[0.2em] text-zinc-500">
              Active Targets
            </h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-500 font-medium">
                {subscriptions.length} {subscriptions.length === 1 ? "target" : "targets"}
              </span>
            </div>
          </div>

          {subscriptions.length === 0 ? (
            <div className="text-center py-20 opacity-50">
              <Skull className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
              <p className="font-display text-zinc-600 mb-2">No subscriptions tracked</p>
              <p className="text-sm text-zinc-500">All targets eliminated</p>
            </div>
          ) : (
            subscriptions.map((subscription) => (
              <motion.div
                key={subscription.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative overflow-hidden rounded-xl bg-zinc-900/50 border transition-all duration-300 group ${
                  subscription.status === "ghost"
                    ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                    : "border-zinc-800 hover:border-cyan-500/30"
                }`}
              >
                {/* Background Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Content */}
                <div className="relative p-5">
                  {/* Header with Name and Status */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-lg border flex items-center justify-center transition-transform duration-300 ${
                          subscription.status === "ghost"
                            ? "bg-red-950/50 border-red-500/50 text-red-400"
                            : "bg-zinc-800 border-zinc-700 text-cyan-500"
                        } group-hover:scale-110`}
                      >
                        {subscription.status === "ghost" ? (
                          <Ghost className="w-6 h-6" />
                        ) : (
                          <Skull className="w-6 h-6" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-green-400 transition-colors break-words">
                          {subscription.name}
                        </h3>
                        <div className="mt-1">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em]">
                            {subscription.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(subscription)}
                  </div>

                  {/* Price and Details */}
                  <div className="space-y-3 pt-4 border-t border-zinc-800/50">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-zinc-500">Monthly Cost</span>
                        <span className="text-2xl font-display font-bold text-red-400">
                          {formatCurrency(subscription.price)}
                        </span>
                      </div>
                      {subscription.status === "ghost" && subscription.lastDetected && (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-zinc-500">Last Detected</span>
                          <span className="text-sm text-red-400 font-medium">
                            {Math.floor(
                              (Date.now() - subscription.lastDetected.getTime()) /
                                (24 * 60 * 60 * 1000)
                            )}{" "}
                            days ago
                          </span>
                          <span className="text-[10px] text-red-500/70 uppercase tracking-wider">
                            No entry detected in 30 days
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Terminate Button for Ghost Status */}
                    {subscription.status === "ghost" && (
                      <div className="flex justify-end pt-2">
                        <Button
                          onClick={() => handleTerminate(subscription.id)}
                          className="px-4 py-2 font-display font-bold text-xs uppercase tracking-wider border-2 transition-all rounded-lg flex-shrink-0 relative overflow-hidden bg-red-600 hover:bg-red-500 text-white border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.8)] hover:shadow-[0_0_30px_rgba(239,68,68,1)] animate-pulse"
                          style={{
                            animation: "pulse 2s infinite",
                            boxShadow:
                              "0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.4), inset 0 0 20px rgba(239, 68, 68, 0.2)",
                          }}
                          title="Terminate Subscription"
                        >
                          <span className="absolute inset-0 bg-red-400/30 animate-ping" style={{ animation: "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite" }} />
                          <span className="relative z-10 flex items-center gap-2">
                            <X className="w-4 h-4" />
                            TERMINATE
                          </span>
                        </Button>
                      </div>
                    )}
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
