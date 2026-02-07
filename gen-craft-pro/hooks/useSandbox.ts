/**
 * useSandbox — Sandbox lifecycle management hook
 * Manages isolated container environments
 */
import { useState, useCallback } from 'react';

export interface SandboxInfo {
  id: string;
  projectId: string;
  status: 'creating' | 'running' | 'stopped' | 'destroyed';
  port: number;
  url: string;
  memory: number;
  cpu: number;
  storageUsed: number;
  lastActivity: number;
  expiresAt: number;
}

export function useSandbox() {
  const [sandbox, setSandbox] = useState<SandboxInfo | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSandbox = useCallback(async (projectId: string, template = 'vite-react') => {
    setIsCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/sandbox', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, template }),
      });
      if (!res.ok) throw new Error('Failed to create sandbox');
      const data = await res.json();
      setSandbox(data.sandbox);
      return data.sandbox;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  const destroySandbox = useCallback(async (sandboxId: string) => {
    try {
      await fetch(`/api/sandbox/${sandboxId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setSandbox(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const execInSandbox = useCallback(async (sandboxId: string, command: string) => {
    try {
      const res = await fetch(`/api/sandbox/${sandboxId}/exec`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      if (!res.ok) throw new Error('Execution failed');
      return await res.json();
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, []);

  const getSandboxStatus = useCallback(async (sandboxId: string) => {
    try {
      const res = await fetch(`/api/sandbox/${sandboxId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to get status');
      const data = await res.json();
      setSandbox(data.sandbox);
      return data.sandbox;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, []);

  return {
    sandbox,
    isCreating,
    error,
    isRunning: sandbox?.status === 'running',
    createSandbox,
    destroySandbox,
    execInSandbox,
    getSandboxStatus,
  };
}
