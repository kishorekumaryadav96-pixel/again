import { Link, useLocation } from "wouter";
import { Crosshair, Trophy, List, User } from "lucide-react";
import { motion } from "framer-motion";
import { useSavings } from "@/App";
import { formatCurrency } from "@/lib/formatCurrency";

export function Navigation() {
  const [location] = useLocation();
  const { totalSavings } = useSavings();

  const navItems = [
    { href: "/", icon: List, label: "Feed", color: "blue" },
    { href: "/snipers", icon: Crosshair, label: "Snipers", color: "cyan" },
    { href: "/profile", icon: User, label: "Profile", color: "cyan" },
  ];

  return (
    <nav className="w-64 bg-zinc-900/50 backdrop-blur-lg border-r border-zinc-800 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-4">
          <h1 className="text-xl font-display font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
            LIFE LEVER
          </h1>
          <span className="bg-zinc-800 text-[10px] px-1.5 py-0.5 rounded text-zinc-400 font-mono">
            BETA
          </span>
        </div>
        {/* Total Savings Badge */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Total Savings</span>
            <span className="text-lg font-display font-bold text-green-500">
              {formatCurrency(totalSavings)}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 py-6 px-4 space-y-2">
        {navItems.map(({ href, icon: Icon, label, color }) => {
          const isActive = location === href;
          const isFeed = href === "/";
          const iconColor = isFeed 
            ? (isActive ? "text-blue-500" : "text-blue-400/70") 
            : (isActive ? "text-cyan-400" : "text-zinc-500");
          const textColor = isFeed
            ? (isActive ? "text-blue-400" : "text-zinc-500")
            : (isActive ? "text-cyan-400" : "text-zinc-500");
          
          return (
            <Link 
              key={href} 
              href={href} 
              className={`relative group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer ${
                isActive 
                  ? "bg-zinc-800/50 border border-zinc-700" 
                  : "hover:bg-zinc-800/30"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-glow"
                  className="absolute inset-0 bg-cyan-500/5 rounded-lg"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <Icon 
                className={`w-5 h-5 transition-all duration-300 ${
                  isActive 
                    ? (isFeed 
                        ? "text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" 
                        : "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]")
                    : iconColor
                }`} 
              />
              <span className={`text-sm font-medium tracking-wide ${textColor}`}>
                {label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r ${
                    isFeed ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]" : "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]"
                  }`}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
