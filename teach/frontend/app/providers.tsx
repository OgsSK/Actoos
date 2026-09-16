'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Données "fraîches" pendant 5 min → pas de refetch pendant ce délai
            staleTime: 5 * 60 * 1000,

            // Garde en cache pendant 30 min après le dernier composant qui l'utilise
            gcTime: 30 * 60 * 1000,

            // Ne revalide pas en arrière-plan si la page reprend le focus
            refetchOnWindowFocus: false,

            // Revalide quand la connexion revient
            refetchOnReconnect: true,

            // Ne refetch pas à chaque mount si les données sont fraîches
            refetchOnMount: false,

            // Retry 1 fois en cas d'erreur réseau
            retry: 1,

            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}