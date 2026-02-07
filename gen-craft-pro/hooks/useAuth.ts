/**
 * useAuth — Authentication + Credits management hook
 * Uses the shared /api/billing/* credit system
 */
import { useState, useEffect, useCallback } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export interface CreditInfo {
  balance: number;
  lifetimeSpent: number;
}

interface UseAuthReturn {
  user: AuthUser | null;
  credits: CreditInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasCredits: boolean;
  error: string | null;
  login: (redirect?: string) => void;
  signup: (redirect?: string) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  checkCredits: () => Promise<void>;
  startCheckout: (packageId: string) => Promise<void>;
}

const APP_ID = 'gen-craft-pro';

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [credits, setCredits] = useState<CreditInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) { setUser(null); return; }
      const data = await res.json();
      if (data.valid && data.user) {
        setUser({ id: data.user.id, email: data.user.email, name: data.user.name, avatar: data.user.avatar });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  const checkCredits = useCallback(async () => {
    if (!user) { setCredits(null); return; }
    try {
      const res = await fetch('/api/billing/credits', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setCredits({ balance: data.credits || 0, lifetimeSpent: data.lifetimeSpent || 0 });
      } else {
        setCredits({ balance: 0, lifetimeSpent: 0 });
      }
    } catch {
      setCredits({ balance: 0, lifetimeSpent: 0 });
    }
  }, [user]);

  const login = useCallback((redirect = '/gen-craft-pro/') => {
    window.location.href = `/auth/login?redirect=${encodeURIComponent(redirect)}`;
  }, []);

  const signup = useCallback((redirect = '/gen-craft-pro/') => {
    window.location.href = `/auth/signup?redirect=${encodeURIComponent(redirect)}`;
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      setUser(null);
      setCredits(null);
    }
  }, []);

  const startCheckout = useCallback(async (packageId: string) => {
    if (!user) { setError('Please sign in first'); return; }
    try {
      const res = await fetch(`/api/billing/checkout/${APP_ID}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError(data.error || 'Checkout failed');
    } catch {
      setError('Failed to start checkout');
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await checkAuth();
      setIsLoading(false);
    })();
  }, [checkAuth]);

  useEffect(() => { if (user) checkCredits(); }, [user, checkCredits]);

  return {
    user,
    credits,
    isLoading,
    isAuthenticated: !!user,
    hasCredits: !!credits && credits.balance > 0,
    error,
    login,
    signup,
    logout,
    checkAuth,
    checkCredits,
    startCheckout,
  };
}
