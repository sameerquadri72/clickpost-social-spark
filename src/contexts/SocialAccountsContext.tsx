import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

      // Cast the data to ensure proper typing
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

      // Get the current session to include in the request
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No valid session found. Please log in again.');
      }

      console.log('Calling edge function:', `${platform}-oauth`);

      const response = await supabase.functions.invoke(`${platform}-oauth`, {
        body: { action: 'initiate' },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      console.log('Edge function response:', response);

      if (response.error) {
        console.error('OAuth initiation error:', response.error);
        
        // Provide more specific error messages based on common issues
        let errorMessage = response.error.message || 'Failed to initiate OAuth';
        
        if (errorMessage.includes('Missing') || errorMessage.includes('credentials') || errorMessage.includes('CLIENT_ID') || errorMessage.includes('CLIENT_SECRET') || errorMessage.includes('APP_ID') || errorMessage.includes('APP_SECRET')) {
          errorMessage = `OAuth credentials not configured for ${platform.charAt(0).toUpperCase() + platform.slice(1)}. Please configure the required API credentials in your Supabase project secrets.`;
        } else if (errorMessage.includes('Unauthorized')) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (errorMessage.includes('Edge Function returned a non-2xx status code')) {
          errorMessage = `OAuth service for ${platform.charAt(0).toUpperCase() + platform.slice(1)} is not properly configured. Please check that the required API credentials are set in your Supabase project secrets.`;
        }
        
        throw new Error(errorMessage);
      }

      // Check if response has data and authUrl
      if (!response.data || !response.data.authUrl) {
        throw new Error(`OAuth service for ${platform.charAt(0).toUpperCase() + platform.slice(1)} is not properly configured. Please check that the required API credentials are set in your Supabase project secrets.`);
      }

      const { authUrl } = response.data;
      console.log('Redirecting to OAuth URL:', authUrl);
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to connect account:', error);
      
      // Enhanced error message for better user experience
      let userFriendlyMessage = error instanceof Error ? error.message : "Failed to connect account";
      
      // If it's a generic error, provide more context
      if (userFriendlyMessage === "Failed to connect account" || userFriendlyMessage.includes('Edge Function returned a non-2xx status code')) {
        userFriendlyMessage = `Unable to connect to ${platform.charAt(0).toUpperCase() + platform.slice(1)}. This usually means the OAuth credentials are not configured in your Supabase project. Please check the setup instructions below.`;
      }
      
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