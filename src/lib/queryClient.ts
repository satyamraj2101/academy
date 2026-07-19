import { QueryClient } from '@tanstack/react-query';
import { toast } from './toast';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error: any) => {
        const message = error?.message || 'An unexpected error occurred';
        toast.error(message);
      },
    },
  },
});
