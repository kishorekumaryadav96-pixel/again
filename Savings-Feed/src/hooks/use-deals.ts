import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateDealRequest } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useDeals() {
  return useQuery({
    queryKey: [api.deals.list.path],
    queryFn: async () => {
      const res = await fetch(api.deals.list.path, { credentials: "include" });
      if (!res.ok) throw new Error('Failed to fetch deals');
      return api.deals.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateDealRequest) => {
      const res = await fetch(api.deals.create.path, {
        method: api.deals.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.deals.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error('Failed to create deal');
      }
      return api.deals.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.deals.list.path] });
      toast({
        title: "Target Acquired",
        description: "New deal has been added to the hit list.",
        className: "border-cyan-500/50 bg-zinc-950 text-cyan-500",
      });
    },
    onError: (error) => {
      toast({
        title: "Mission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useKillDeal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.deals.kill.path, { id });
      const res = await fetch(url, {
        method: api.deals.kill.method,
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error('Deal not found');
        throw new Error('Failed to kill deal');
      }
      return api.deals.kill.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.deals.list.path] });
      // Confetti is handled in the UI component to keep hook pure
      toast({
        title: "TARGET ELIMINATED",
        description: "Excellent work, Assassin. Savings secured.",
        className: "border-green-500/50 bg-zinc-950 text-green-500 font-display",
      });
    },
  });
}
