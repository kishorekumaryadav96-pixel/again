import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSniperSchema } from "@shared/schema";
import { z } from "zod";
import { useSnipers, useCreateSniper } from "@/hooks/use-snipers";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Crosshair, Target, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

// Schema coercion
const sniperFormSchema = insertSniperSchema.extend({
  targetPrice: z.string().transform(v => v),
  currentPrice: z.string().optional().transform(v => v || undefined),
});

type SniperFormValues = z.infer<typeof sniperFormSchema>;

export default function Snipers() {
  const { data: snipers, isLoading } = useSnipers();
  const mutation = useCreateSniper();

  const form = useForm<SniperFormValues>({
    resolver: zodResolver(sniperFormSchema),
    defaultValues: {
      targetName: "",
      targetPrice: "",
      status: "tracking",
    },
  });

  const onSubmit = (values: SniperFormValues) => {
    mutation.mutate(values, {
      onSuccess: () => form.reset(),
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 p-4">
        <h1 className="text-xl font-display font-black tracking-widest text-cyan-500 uppercase flex items-center gap-2">
          <Crosshair className="w-6 h-6" />
          Active Trackers
        </h1>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-8">
        {/* Create Sniper Form */}
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-display uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-cyan-500" /> Deploy New Sniper
          </h2>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="targetName"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Product Name (e.g. iPhone 15)" {...field} className="bg-zinc-950 border-zinc-800" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="targetPrice"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input type="number" placeholder="Target Price" {...field} className="bg-zinc-950 border-zinc-800" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  disabled={mutation.isPending}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-display font-bold px-6"
                >
                  {mutation.isPending ? <Loader2 className="animate-spin" /> : "DEPLOY"}
                </Button>
              </div>
            </form>
          </Form>
        </section>

        {/* List */}
        <div className="grid grid-cols-1 gap-4">
          {snipers?.map((sniper) => (
            <motion.div
              key={sniper.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-xl flex items-center justify-between group hover:border-cyan-500/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`w-2 h-2 rounded-full absolute -top-1 -right-1 ${sniper.status === 'hit' ? 'bg-green-500' : 'bg-cyan-500 animate-pulse'}`} />
                  <div className="w-12 h-12 bg-zinc-800 rounded-lg overflow-hidden">
                    <img 
                      src={sniper.imageUrl || "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=100&h=100&fit=crop"} 
                      alt={sniper.targetName}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
                    />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-zinc-200">{sniper.targetName}</h3>
                  <p className="text-xs text-zinc-500 font-mono">Target: {Number(sniper.targetPrice).toLocaleString()}</p>
                </div>
              </div>

              <div className="text-right">
                <span className={`text-xs font-display uppercase tracking-wider px-2 py-1 rounded ${
                  sniper.status === 'hit' 
                    ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                    : 'bg-zinc-800 text-zinc-500'
                }`}>
                  {sniper.status}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
