import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDealSchema } from "@shared/schema";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCreateDeal } from "@/hooks/use-deals";
import { Plus, Target } from "lucide-react";

// Add coercion for numeric strings from inputs
const formSchema = insertDealSchema.extend({
  price: z.string().transform(v => v),
  originalPrice: z.string().optional().transform(v => v || undefined),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateDealDialog() {
  const [open, setOpen] = useState(false);
  const mutation = useCreateDeal();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      price: "",
      originalPrice: "",
      currency: "₹",
      status: "active",
      killCount: 0,
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="fixed bottom-20 right-4 z-40 rounded-full w-14 h-14 bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] transition-all duration-300 md:bottom-8 md:right-8"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-cyan-500 text-xl tracking-wider">
            <Target className="w-5 h-5" />
            Report New Target
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-400 text-xs uppercase tracking-wider">Target Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Sony WH-1000XM5..." {...field} className="bg-zinc-900 border-zinc-800 focus:border-cyan-500/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-400 text-xs uppercase tracking-wider">Intel / Details</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Lowest price in 3 months. Grab before OOS." {...field} className="bg-zinc-900 border-zinc-800 focus:border-cyan-500/50 resize-none" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-400 text-xs uppercase tracking-wider">Current Price</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="19999" {...field} className="bg-zinc-900 border-zinc-800 focus:border-cyan-500/50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="originalPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-400 text-xs uppercase tracking-wider">Original Price</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="24999" {...field} className="bg-zinc-900 border-zinc-800 focus:border-cyan-500/50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-400 text-xs uppercase tracking-wider">Image URL (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://..." 
                      {...field} 
                      value={field.value || ''} 
                      className="bg-zinc-900 border-zinc-800 focus:border-cyan-500/50" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-display font-bold uppercase tracking-wider mt-4"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Acquiring..." : "Initialize Target"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
