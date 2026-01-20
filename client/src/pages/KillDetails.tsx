import { MissionHistory } from "@/components/MissionHistory";
import { useSavings } from "@/App";

export default function KillDetails() {
  const { killedSnipers } = useSavings();

  return (
    <div className="min-h-screen bg-zinc-950 w-full">
      <main className="max-w-7xl mx-auto px-6 py-8">
        <section className="px-4 py-6 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-display uppercase tracking-[0.2em] text-zinc-500">Kill Details</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-500 font-medium">
                {killedSnipers.length} {killedSnipers.length === 1 ? 'kill' : 'kills'}
              </span>
            </div>
          </div>

          <MissionHistory killedSnipers={killedSnipers} />
        </section>
      </main>
    </div>
  );
}
