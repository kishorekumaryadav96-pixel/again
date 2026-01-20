import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDealSchema } from "@shared/schema";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useSavings } from "@/App";
import { useCreateDeal } from "@/hooks/use-deals";
import { PiggyBank } from "lucide-react";
import type { Deal } from "@shared/schema";

// Add coercion for numeric strings from inputs
const formSchema = insertDealSchema.extend({
  price: z.string().transform(v => v),
  originalPrice: z.string().optional().transform(v => v || undefined),
});

type FormValues = z.infer<typeof formSchema>;

interface AddSavingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddSavingDialog({ open, onOpenChange }: AddSavingDialogProps) {
  const { addSaving } = useSavings();
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

  const onSubmit = async (values: FormValues) => {
    try {
      // Create the deal via API
      const newDeal = await mutation.mutateAsync(values);
      
      // Add to local state for instant display
      addSaving(newDeal);
      
      // Close dialog and reset form
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-green-500 text-xl tracking-wider">
            <PiggyBank className="w-5 h-5" />
            Add New Saving
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-400 text-xs uppercase tracking-wider">Item Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Sony WH-1000XM5..." {...field} className="bg-zinc-900 border-zinc-800 focus:border-green-500/50" />
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
                  <FormLabel className="text-zinc-400 text-xs uppercase tracking-wider">Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Great deal on headphones..." {...field} className="bg-zinc-900 border-zinc-800 focus:border-green-500/50 resize-none" />
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
                      <Input type="number" placeholder="19999" {...field} className="bg-zinc-900 border-zinc-800 focus:border-green-500/50" />
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
                      <Input type="number" placeholder="24999" {...field} className="bg-zinc-900 border-zinc-800 focus:border-green-500/50" />
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
                      className="bg-zinc-900 border-zinc-800 focus:border-green-500/50" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full bg-green-500 hover:bg-green-400 text-black font-display font-bold uppercase tracking-wider mt-4"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Adding..." : "Add Saving"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
