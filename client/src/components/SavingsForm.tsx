import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSavings } from "@/App";
import { PiggyBank } from "lucide-react";
import { SAVING_CATEGORIES } from "@/types/savings";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  currentPrice: z.string().min(1, "Current price is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Current price must be a positive number"
  ),
  oldPrice: z.string().min(1, "Old price is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Old price must be a positive number"
  ),
  category: z.enum([
    "Food & Dining",
    "Shopping",
    "Bills & Utilities",
    "Transportation",
    "Entertainment",
    "Health & Fitness",
    "Travel",
    "Education",
    "Other",
  ] as const),
}).refine(
  (data) => parseFloat(data.oldPrice) > parseFloat(data.currentPrice),
  {
    message: "Old price must be greater than current price",
    path: ["oldPrice"],
  }
);

type FormValues = z.infer<typeof formSchema>;

interface SavingsFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SavingsForm({ open, onOpenChange }: SavingsFormProps) {
  const { addSaving } = useSavings();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      currentPrice: "",
      oldPrice: "",
      category: "Other",
    },
  });

  const onSubmit = (values: FormValues) => {
    const newSaving = {
      id: `saving-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: values.title,
      currentPrice: parseFloat(values.currentPrice),
      oldPrice: parseFloat(values.oldPrice),
      category: values.category,
      createdAt: new Date(),
    };

    addSaving(newSaving);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-green-500 text-xl tracking-wider">
            <PiggyBank className="w-5 h-5" />
            Add New Saving
          </DialogTitle>
          <DialogDescription className="sr-only">
            Enter the details of your purchase to track your savings.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-400 text-xs uppercase tracking-wider">Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Grocery shopping" 
                      {...field} 
                      className="bg-zinc-900 border-zinc-800 focus:border-green-500/50 text-zinc-100" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currentPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-400 text-xs uppercase tracking-wider">Current Price</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        step="0.01"
                        placeholder="0.00" 
                        {...field} 
                        className="bg-zinc-900 border-zinc-800 focus:border-green-500/50 text-zinc-100" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="oldPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-400 text-xs uppercase tracking-wider">Old Price</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        step="0.01"
                        placeholder="0.00" 
                        {...field} 
                        className="bg-zinc-900 border-zinc-800 focus:border-green-500/50 text-zinc-100" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-400 text-xs uppercase tracking-wider">Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-zinc-900 border-zinc-800 focus:border-green-500/50 text-zinc-100">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {SAVING_CATEGORIES.map((category) => (
                        <SelectItem 
                          key={category} 
                          value={category}
                          className="text-zinc-100 focus:bg-zinc-800 focus:text-green-400"
                        >
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full bg-green-500 hover:bg-green-400 text-black font-display font-bold uppercase tracking-wider mt-4"
            >
              Add Saving
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
