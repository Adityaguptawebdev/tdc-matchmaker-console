import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { LoginInput, MatchmakerPublic, SessionInfo } from '@tdc/shared';
import { PageSkeleton } from '../../components/ui/Feedback';
import { useToast } from '../../components/ui/Toast';
import { api, setUnauthorizedHandler } from '../../lib/api';

interface AuthState {
  user: MatchmakerPublic | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Session state. The JWT lives only in an httpOnly cookie set by the API; the browser app keeps just
 * the public user profile in memory and restores it from /auth/me on load.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MatchmakerPublic | null>(null);
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const toast = useToast();

  useEffect(() => {
    api
      .get<{ user: MatchmakerPublic }>('/auth/me')
      .then((res) => {
        setUser(res.data.user);
        setStatus('authenticated');
      })
      .catch(() => setStatus('anonymous'));
  }, []);

  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (userRef.current) toast.info('Your session has ended', 'Please sign in again to continue.');
      setUser(null);
      setStatus('anonymous');
    });
    return () => setUnauthorizedHandler(null);
  }, [toast]);

  const login = useCallback(async (input: LoginInput) => {
    const res = await api.post<SessionInfo>('/auth/login', input);
    setUser(res.data.user);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const value = useMemo(() => ({ user, status, login, logout }), [user, status, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <PageSkeleton />
      </div>
    );
  }
  if (status === 'anonymous')
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}
