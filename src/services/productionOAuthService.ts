import { supabase } from '@/integrations/supabase/client';

export class ProductionOAuthService {
  private static instance: ProductionOAuthService;

  public static getInstance(): ProductionOAuthService {
    if (!ProductionOAuthService.instance) {
      ProductionOAuthService.instance = new ProductionOAuthService();
    }
    return ProductionOAuthService.instance;
  }

  async initiateOAuth(platform: string): Promise<void> {
    try {
      // Check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('You must be logged in to connect social accounts');
      }

      console.log(`Initiating OAuth for ${platform} using Edge Functions`);

      // Get the current session to include in the request
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No valid session found. Please log in again.');
      }

      // Use Edge Functions for secure OAuth flow
      const functionName = `${platform}-oauth`;
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { action: 'initiate' },
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error(`${functionName} error:`, error);
        
        // Provide user-friendly error messages
        if (error.message?.includes('credentials not configured') || 
            error.message?.includes('CLIENT_ID') || 
            error.message?.includes('CLIENT_SECRET')) {
          throw new Error(`${platform.charAt(0).toUpperCase() + platform.slice(1)} OAuth credentials are not configured on the server. Please contact the administrator.`);
        }
        
        throw new Error(error.message || `Failed to initiate ${platform} OAuth`);
      }

      if (data?.authUrl) {
        console.log(`Redirecting to ${platform} OAuth URL`);
        window.location.href = data.authUrl;
      } else {
        throw new Error(`Invalid response from ${platform} OAuth service`);
      }

    } catch (error) {
      console.error(`OAuth initiation error for ${platform}:`, error);
      throw error;
    }
  }

  async validateConnection(platform: string, accountId: string): Promise<boolean> {
    try {
      const { data: account, error } = await supabase
        .from('social_accounts')
        .select('access_token, expires_at, platform')
        .eq('id', accountId)
        .eq('platform', platform)
        .single();

      if (error || !account) {
        return false;
      }

      // Check if token is expired
      if (account.expires_at && new Date(account.expires_at) < new Date()) {
        return false;
      }

      // For production, you would validate the token with the respective platform's API
      // This is a simplified check
      return !!account.access_token;

    } catch (error) {
      console.error('Connection validation error:', error);
      return false;
    }
  }

  async refreshToken(platform: string, accountId: string): Promise<boolean> {
    try {
      // In production, implement token refresh logic here
      // This would involve calling the platform's token refresh endpoint
      console.log(`Token refresh not implemented for ${platform}`);
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }
}

export const productionOAuthService = ProductionOAuthService.getInstance();