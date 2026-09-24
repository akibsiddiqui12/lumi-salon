import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { UserRow } from '../lib/types';

interface AuthCtx { user: UserRow | null; login: (u: UserRow) => void; logout: () => void; }
const Ctx = createContext<AuthCtx>({ user: null, login: () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserRow | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('lume_user');
      if (raw) setUser(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);
  const login = (u: UserRow) => { setUser(u); localStorage.setItem('lume_user', JSON.stringify(u)); };
  const logout = () => { setUser(null); localStorage.removeItem('lume_user'); };
  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
