import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type CreateSniperRequest } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useSnipers() {
  return useQuery({
    queryKey: [api.snipers.list.path],
    queryFn: async () => {
      const res = await fetch(api.snipers.list.path, { credentials: "include" });
      if (!res.ok) throw new Error('Failed to fetch snipers');
      return api.snipers.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateSniper() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateSniperRequest) => {
      const res = await fetch(api.snipers.create.path, {
        method: api.snipers.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.snipers.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error('Failed to deploy sniper');
      }
      return api.snipers.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.snipers.list.path] });
      toast({
        title: "Sniper Deployed",
        description: "Tracking system initiated. We'll watch for the drop.",
        className: "border-cyan-500/50 bg-zinc-950 text-cyan-500",
      });
    },
    onError: (error) => {
      toast({
        title: "Deployment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
