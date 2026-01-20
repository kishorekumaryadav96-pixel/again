import { Skull } from "lucide-react";

export default function Subscriptions() {
  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 p-4">
        <h1 className="text-xl font-display font-black tracking-widest text-cyan-500 uppercase flex items-center gap-2">
          <Skull className="w-6 h-6" />
          Subscriptions
        </h1>
      </header>

      <main className="max-w-md mx-auto p-4">
        <div className="text-center py-20 opacity-50">
          <Skull className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
          <p className="font-display text-zinc-600 mb-2">Subscriptions Coming Soon</p>
          <p className="text-sm text-zinc-500">Manage your subscription tracking here</p>
        </div>
      </main>
    </div>
  );
}
