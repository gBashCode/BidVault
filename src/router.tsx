import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { syncGlobalTime } from "./lib/time";

export const getRouter = () => {
  const queryClient = new QueryClient();

  if (typeof window !== "undefined") {
    syncGlobalTime();
  }

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultViewTransition: true,
  });

  return router;
};
