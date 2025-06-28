import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { productionOAuthService } from '@/services/productionOAuthService';

export interface SocialAccount {
  id: string;
  platform: 'linkedin' | 'facebook' | 'twitter' | 'instagram';
  platform_user_id: string;
  name: string;
  username: string;
  email?: string;
  profile_image?: string;
  access_token: string;
  refresh_token?: string;
  token_secret?: string;
  page_access_token?: string;
  expires_at?: string;
  is_active: boolean;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

interface SocialAccountsContextType {
  accounts: SocialAccount[];
  loading: boolean;
  connectAccount: (platform: string) => Promise<void>;
  disconnectAccount: (accountId: string) => Promise<void>;
  refreshAccounts: () => Promise<void>;
  getActiveAccounts: (platform?: string) => SocialAccount[];
  isAccountConnected: (platform: string) => boolean;
}

const SocialAccountsContext = createContext<SocialAccountsContextType | undefined>(undefined);

export const SocialAccountsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load accounts from Supabase
  const refreshAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAccounts([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load social accounts:', error);
        toast({
          title: "Error",
          description: "Failed to load social accounts",
          variant: "destructive",
        });
        return;
      }

      setAccounts((data || []) as SocialAccount[]);
      console.log('Loaded social accounts:', data?.length || 0);
    } catch (error) {
      console.error('Failed to load social accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAccounts();

    // Set up real-time subscription
    const channel = supabase
      .channel('social_accounts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'social_accounts'
        },
        () => {
          refreshAccounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const connectAccount = async (platform: string) => {
    try {
      // First check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Auth error:', userError);
        throw new Error('Authentication error. Please try logging in again.');
      }
      
      if (!user) {
        throw new Error('You must be logged in to connect social accounts. Please log in first.');
      }

      console.log('User authenticated, initiating OAuth for:', platform);

      // Use production OAuth service
      await productionOAuthService.initiateOAuth(platform);
      
    } catch (error) {
      console.error('Failed to connect account:', error);
      
      // Enhanced error message for better user experience
      let userFriendlyMessage = error instanceof Error ? error.message : "Failed to connect account";
      
      toast({
        title: "Connection Failed",
        description: userFriendlyMessage,
        variant: "destructive",
      });
      throw error; // Re-throw to allow caller to handle loading states
    }
  };

  const disconnectAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('social_accounts')
        .update({ is_active: false })
        .eq('id', accountId);

      if (error) {
        throw error;
      }

      await refreshAccounts();
      
      toast({
        title: "Account Disconnected",
        description: "Your social media account has been disconnected.",
      });
    } catch (error) {
      console.error('Failed to disconnect account:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect account",
        variant: "destructive",
      });
    }
  };

  const getActiveAccounts = (platform?: string) => {
    return accounts.filter(account => 
      account.is_active && (!platform || account.platform === platform)
    );
  };

  const isAccountConnected = (platform: string) => {
    return accounts.some(account => account.platform === platform && account.is_active);
  };

  return (
    <SocialAccountsContext.Provider value={{
      accounts,
      loading,
      connectAccount,
      disconnectAccount,
      refreshAccounts,
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