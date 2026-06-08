"use client";

import { GlobalRealtime } from "@/components/layout/global-realtime";
import { ToastContainer } from "@/components/ui/toast-container";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      {children}
      <ToastContainer />
      <GlobalRealtime />
    </QueryClientProvider>
  );
}
