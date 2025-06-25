
import React, { createContext, useContext, useState } from 'react';

interface AuthContextType {
  currentUser: { email: string } | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Mock user for testing - authentication disabled
  const [currentUser] = useState<{ email: string } | null>({ email: 'test@example.com' });
  const [loading] = useState(false);

  const login = async (email: string, password: string) => {
    // Mock login - just log the attempt
    console.log('Mock login attempt:', email);
  };

  const register = async (email: string, password: string) => {
    // Mock register - just log the attempt  
    console.log('Mock register attempt:', email);
  };

  const logout = async () => {
    // Mock logout - just log the attempt
    console.log('Mock logout');
  };

  const value = {
    currentUser,
    login,
    register,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
