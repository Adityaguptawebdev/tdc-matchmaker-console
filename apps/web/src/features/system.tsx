import { createContext, useContext, type ReactNode } from 'react';
import type { SystemInfo } from '@tdc/shared';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';

const SystemContext = createContext<SystemInfo | undefined>(undefined);

/** Public runtime facts from /api/health: data store, AI availability, matching rule toggles. */
export function SystemProvider({ children }: { children: ReactNode }) {
  const { data } = useApi(() => api.get<SystemInfo>('/health'), 'health');
  return <SystemContext.Provider value={data}>{children}</SystemContext.Provider>;
}

export const useSystem = () => useContext(SystemContext);
