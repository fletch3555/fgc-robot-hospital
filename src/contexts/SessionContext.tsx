'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AppSession } from '@/lib/auth-types';

type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface SessionContextValue {
  data: AppSession | null;
  status: SessionStatus;
}

const SessionContext = createContext<SessionContextValue>({ data: null, status: 'loading' });

/**
 * Drop-in replacement for next-auth's SessionProvider/useSession, backed by
 * Supabase Auth. Roles aren't in Supabase's JWT (no custom claims hook), so
 * this resolves them via GET /api/auth/me on every auth-state change.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppSession | null>(null);
  const [status, setStatus] = useState<SessionStatus>('loading');

  useEffect(() => {
    const supabase = createClient();

    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          setData(null);
          setStatus('unauthenticated');
          return;
        }
        const newData: AppSession = await res.json();
        // Avoid forcing a re-render (and thus a re-render of every
        // useSession() consumer, e.g. mid-interaction with a floating UI
        // component) when a window-focus refetch returns unchanged data.
        setData(prev => (prev && JSON.stringify(prev) === JSON.stringify(newData) ? prev : newData));
        setStatus('authenticated');
      } catch {
        setData(null);
        setStatus('unauthenticated');
      }
    };

    // onAuthStateChange fires once immediately with the current session,
    // then again on every sign-in/sign-out/token-refresh.
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      fetchSession();
    });

    const handleFocus = () => fetchSession();
    window.addEventListener('focus', handleFocus);

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return <SessionContext.Provider value={{ data, status }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}
