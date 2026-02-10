import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { apiFetch, refreshSession } from "@/lib/api";
import { StoredUser, clearTokens, getStoredUser, setStoredUser, setTokens } from "@/lib/auth";

interface AuthContextType {
  user: StoredUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<StoredUser | null>(getStoredUser());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const stored = getStoredUser();
      if (stored) {
        setUser(stored);
      }
      try {
        const refreshed = await refreshSession();
        if (refreshed?.accessToken) {
          const nextUser = refreshed.user ?? stored ?? null;
          if (nextUser) {
            setStoredUser(nextUser);
          }
          setUser(nextUser);
        } else {
          clearTokens();
          setStoredUser(null);
          setUser(null);
        }
      } catch {
        clearTokens();
        setStoredUser(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiFetch<{
      accessToken: string;
      refreshToken: string;
      user: StoredUser;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setTokens(data.accessToken, data.refreshToken);
    setStoredUser(data.user);
    setUser(data.user);
  };

  const logout = () => {
    clearTokens();
    setStoredUser(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
