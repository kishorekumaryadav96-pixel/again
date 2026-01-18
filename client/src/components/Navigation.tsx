import { Link, useLocation } from "wouter";
import { Crosshair, Trophy, List, User } from "lucide-react";
import { motion } from "framer-motion";

export function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: List, label: "Feed" },
    { href: "/snipers", icon: Crosshair, label: "Snipers" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-800 pb-safe">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = location === href;
          return (
            <Link key={href} href={href} className="relative group w-full h-full flex flex-col items-center justify-center cursor-pointer">
              {isActive && (
                <motion.div
                  layoutId="nav-glow"
                  className="absolute inset-0 bg-cyan-500/10"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <Icon 
                className={`w-6 h-6 mb-1 transition-all duration-300 ${
                  isActive ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" : "text-zinc-500 group-hover:text-zinc-300"
                }`} 
              />
              <span className={`text-[10px] uppercase font-display tracking-widest ${
                isActive ? "text-cyan-400" : "text-zinc-500"
              }`}>
                {label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute top-0 w-12 h-0.5 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
