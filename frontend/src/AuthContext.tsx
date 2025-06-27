import React, { createContext, useState, useContext, ReactNode, useMemo } from 'react';

interface AuthContextType {
  token: string | null;
  userEmail: string | null;
  login: (token: string, email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem('userEmail'));

  const login = (newToken: string, email: string): void => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('userEmail', email);
    setToken(newToken);
    setUserEmail(email);
  };

  const logout = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    setToken(null);
    setUserEmail(null);
  };

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    token,
    userEmail,
    login,
    logout,
  }), [token, userEmail]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
