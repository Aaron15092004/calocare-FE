import { QueryClient } from "@tanstack/react-query";

// Shared app-wide client so non-hook modules (cache invalidation helpers)
// can target the same cache the components read from.
export const queryClient = new QueryClient();
