import { User, Trophy, Target, Shield } from "lucide-react";
import { motion } from "framer-motion";

export default function Profile() {
  // Hardcoded stats for visual polish, in real app fetch from /api/users/me
  const stats = [
    { label: "Kills Confirmed", value: "12", icon: Trophy, color: "text-green-500" },
    { label: "Active Snipers", value: "5", icon: Target, color: "text-cyan-500" },
    { label: "Total Saved", value: "₹45k", icon: Shield, color: "text-purple-500" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      <header className="h-48 bg-gradient-to-b from-zinc-900 to-zinc-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1000&q=80')] opacity-10 bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
      </header>

      <main className="max-w-md mx-auto px-4 -mt-16 relative z-10">
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 rounded-full border-4 border-zinc-950 bg-zinc-900 overflow-hidden relative group">
            <img 
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop" 
              alt="Profile" 
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
            />
            <div className="absolute inset-0 ring-2 ring-cyan-500/50 rounded-full" />
          </div>
          
          <h1 className="mt-4 text-2xl font-display font-bold text-white tracking-wide">
            Assassin_01
          </h1>
          <p className="text-zinc-500 text-sm font-mono">Elite Hunter • Level 42</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex flex-col items-center text-center hover:border-zinc-700 transition-colors"
            >
              <stat.icon className={`w-5 h-5 mb-2 ${stat.color}`} />
              <span className="text-2xl font-bold text-white font-display">{stat.value}</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">{stat.label}</span>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 space-y-4">
          <h2 className="text-sm font-display uppercase tracking-widest text-zinc-500 pl-1">Recent Activity</h2>
          
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex items-center gap-4 py-3 border-b border-zinc-900">
              <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-zinc-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-zinc-300">Target eliminated: <span className="text-cyan-500">Sony XM5</span></p>
                <p className="text-xs text-zinc-600">2 hours ago</p>
              </div>
              <span className="text-green-500 font-mono text-xs">+500 XP</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
