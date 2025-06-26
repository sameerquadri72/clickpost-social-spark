import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAuthUrl } from '@/config/socialMedia';

export interface SocialAccount {
  id: string;
  platform: 'linkedin' | 'facebook' | 'twitter' | 'instagram';
  name: string;
  username: string;
  profileImage?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  isActive: boolean;
  connectedAt: Date;
}

interface SocialAccountsContextType {
  accounts: SocialAccount[];
  connectAccount: (platform: string) => void;
  addAccount: (account: SocialAccount) => void;
  disconnectAccount: (accountId: string) => void;
  getActiveAccounts: (platform?: string) => SocialAccount[];
  isAccountConnected: (platform: string) => boolean;
}

const SocialAccountsContext = createContext<SocialAccountsContextType | undefined>(undefined);

const STORAGE_KEY = 'ekclickpost_social_accounts';

export const SocialAccountsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);

  // Load accounts from localStorage on mount
  useEffect(() => {
    try {
      const storedAccounts = localStorage.getItem(STORAGE_KEY);
      if (storedAccounts) {
        const parsedAccounts = JSON.parse(storedAccounts);
        const deserializedAccounts = parsedAccounts.map((account: any) => ({
          ...account,
          connectedAt: new Date(account.connectedAt),
          expiresAt: account.expiresAt ? new Date(account.expiresAt) : undefined
        }));
        setAccounts(deserializedAccounts);
        console.log('Loaded social accounts:', deserializedAccounts.length);
      }
    } catch (error) {
      console.error('Failed to load social accounts:', error);
    }
  }, []);

  // Save accounts to localStorage whenever accounts change
  useEffect(() => {
    try {
      const serializedAccounts = accounts.map(account => ({
        ...account,
        connectedAt: account.connectedAt.toISOString(),
        expiresAt: account.expiresAt?.toISOString()
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializedAccounts));
      console.log('Saved social accounts:', accounts.length);
    } catch (error) {
      console.error('Failed to save social accounts:', error);
    }
  }, [accounts]);

  const connectAccount = (platform: string) => {
    try {
      const authUrl = getAuthUrl(platform as keyof typeof import('@/config/socialMedia').SOCIAL_MEDIA_CONFIG);
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to initiate OAuth flow:', error);
      throw error;
    }
  };

  const addAccount = (account: SocialAccount) => {
    setAccounts(prev => {
      // Remove any existing account for the same platform and user
      const filtered = prev.filter(acc => 
        !(acc.platform === account.platform && acc.username === account.username)
      );
      return [...filtered, account];
    });
    console.log('Added account:', account.platform, account.username);
  };

  const disconnectAccount = (accountId: string) => {
    setAccounts(prev => prev.filter(account => account.id !== accountId));
    console.log('Disconnected account:', accountId);
  };

  const getActiveAccounts = (platform?: string) => {
    return accounts.filter(account => 
      account.isActive && (!platform || account.platform === platform)
    );
  };

  const isAccountConnected = (platform: string) => {
    return accounts.some(account => account.platform === platform && account.isActive);
  };

  return (
    <SocialAccountsContext.Provider value={{
      accounts,
      connectAccount,
      addAccount,
      disconnectAccount,
      getActiveAccounts,
      isAccountConnected
    }}>
      {children}
    </SocialAccountsContext.Provider>
  );
};

export const useSocialAccounts = () => {
  const context = useContext(SocialAccountsContext);
  if (!context) {
    throw new Error('useSocialAccounts must be used within a SocialAccountsProvider');
  }
  return context;
};