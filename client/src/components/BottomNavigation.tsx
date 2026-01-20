import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";

export function BottomNavigation() {
  const [location] = useLocation();

  const navItems = [
    { href: "/snipers", icon: "🎯", label: "Snipers" },
    { href: "/logistics", icon: "✈️", label: "Logistics" },
    { href: "/subscriptions", icon: "💀", label: "Subscriptions" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800">
      <div className="max-w-md mx-auto px-4 py-3">
        <div className="flex items-center justify-around">
          {navItems.map(({ href, icon, label }) => {
            const isActive = location === href;
            
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1.5 px-4 py-2 rounded-lg transition-all duration-200 relative group"
              >
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-indicator"
                    className="absolute inset-0 bg-cyan-500/10 rounded-lg border border-cyan-500/30"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span
                  className={`text-2xl transition-transform duration-200 ${
                    isActive ? "scale-110" : "scale-100 group-hover:scale-105"
                  }`}
                >
                  {icon}
                </span>
                <span
                  className={`text-[10px] font-display uppercase tracking-wider transition-colors ${
                    isActive
                      ? "text-cyan-400 font-bold"
                      : "text-zinc-500 group-hover:text-zinc-400"
                  }`}
                >
                  {label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-dot"
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
