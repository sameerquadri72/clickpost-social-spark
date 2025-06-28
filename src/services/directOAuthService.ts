import { supabase } from '@/integrations/supabase/client';

interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
  authUrl: string;
}

export class DirectOAuthService {
  private static instance: DirectOAuthService;

  public static getInstance(): DirectOAuthService {
    if (!DirectOAuthService.instance) {
      DirectOAuthService.instance = new DirectOAuthService();
    }
    return DirectOAuthService.instance;
  }

  private getOAuthConfig(platform: string): OAuthConfig {
    const baseUrl = window.location.origin;
    
    switch (platform) {
      case 'linkedin':
        return {
          clientId: import.meta.env.VITE_LINKEDIN_CLIENT_ID || '',
          redirectUri: `${baseUrl}/auth/linkedin/callback`,
          scope: 'openid profile email w_member_social',
          authUrl: 'https://www.linkedin.com/oauth/v2/authorization'
        };
      case 'facebook':
        return {
          clientId: import.meta.env.VITE_FACEBOOK_APP_ID || '',
          redirectUri: `${baseUrl}/auth/facebook/callback`,
          scope: 'public_profile,email,pages_manage_posts,pages_read_engagement',
          authUrl: 'https://www.facebook.com/v18.0/dialog/oauth'
        };
      case 'twitter':
        return {
          clientId: import.meta.env.VITE_TWITTER_CLIENT_ID || '',
          redirectUri: `${baseUrl}/auth/twitter/callback`,
          scope: 'tweet.read tweet.write users.read offline.access',
          authUrl: 'https://twitter.com/i/oauth2/authorize'
        };
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  async initiateOAuth(platform: string): Promise<void> {
    try {
      // Check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('You must be logged in to connect social accounts');
      }

      const config = this.getOAuthConfig(platform);
      
      if (!config.clientId) {
        throw new Error(`${platform.charAt(0).toUpperCase() + platform.slice(1)} OAuth credentials not configured. Please check your environment variables.`);
      }

      // Generate state token for security
      const stateToken = crypto.randomUUID();
      
      // Store OAuth state in Supabase for security
      const { error: stateError } = await supabase
        .from('oauth_states')
        .insert({
          state_token: stateToken,
          platform,
          user_id: user.id,
          redirect_url: `${window.location.origin}/accounts`
        });

      if (stateError) {
        console.error('Failed to store OAuth state:', stateError);
        throw new Error('Failed to initialize OAuth flow');
      }

      // Build authorization URL
      const authUrl = new URL(config.authUrl);
      authUrl.searchParams.set('client_id', config.clientId);
      authUrl.searchParams.set('redirect_uri', config.redirectUri);
      authUrl.searchParams.set('scope', config.scope);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('state', stateToken);

      // For Twitter, add PKCE parameters
      if (platform === 'twitter') {
        const codeVerifier = this.generateCodeVerifier();
        const codeChallenge = await this.generateCodeChallenge(codeVerifier);
        
        // Store code verifier in the oauth_states table
        await supabase
          .from('oauth_states')
          .update({ oauth_token_secret: codeVerifier })
          .eq('state_token', stateToken);
        
        authUrl.searchParams.set('code_challenge', codeChallenge);
        authUrl.searchParams.set('code_challenge_method', 'S256');
      }

      console.log('Redirecting to OAuth URL for', platform);
      
      // Redirect to OAuth provider
      window.location.href = authUrl.toString();
      
    } catch (error) {
      console.error('OAuth initiation error:', error);
      throw error;
    }
  }

  async handleOAuthCallback(platform: string, code: string, state: string): Promise<boolean> {
    try {
      // Verify state parameter by checking database
      const { data: stateRecord, error: stateError } = await supabase
        .from('oauth_states')
        .select('*')
        .eq('state_token', state)
        .eq('platform', platform)
        .single();

      if (stateError || !stateRecord) {
        throw new Error('Invalid or expired OAuth state');
      }

      // For demo purposes, we'll simulate a successful connection
      // In a real implementation, you would exchange the code for tokens here
      // This requires a backend service as client secrets cannot be exposed
      
      const mockProfile = this.generateMockProfile(platform);
      
      // Store the mock account
      await this.storeMockAccount(platform, mockProfile, stateRecord.user_id);

      // Clean up OAuth state
      await supabase
        .from('oauth_states')
        .delete()
        .eq('id', stateRecord.id);

      return true;
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw error;
    }
  }

  private generateMockProfile(platform: string): any {
    const timestamp = Date.now();
    
    switch (platform) {
      case 'linkedin':
        return {
          id: `linkedin_${timestamp}`,
          name: 'Demo LinkedIn User',
          email: 'demo@linkedin.com',
          username: 'demo.linkedin.user',
          picture: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150'
        };
      case 'facebook':
        return {
          id: `facebook_${timestamp}`,
          name: 'Demo Facebook User',
          email: 'demo@facebook.com',
          username: 'demo.facebook.user',
          picture: { data: { url: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150' } }
        };
      case 'twitter':
        return {
          data: {
            id: `twitter_${timestamp}`,
            name: 'Demo Twitter User',
            username: 'demo_twitter_user',
            profile_image_url: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150'
          }
        };
      default:
        throw new Error(`Mock profile not implemented for ${platform}`);
    }
  }

  private async storeMockAccount(platform: string, profile: any, userId: string): Promise<void> {
    let accountData: any = {
      user_id: userId,
      platform,
      access_token: `mock_token_${Date.now()}`,
      refresh_token: `mock_refresh_${Date.now()}`,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      is_active: true
    };

    // Platform-specific profile mapping
    switch (platform) {
      case 'linkedin':
        accountData = {
          ...accountData,
          platform_user_id: profile.id,
          name: profile.name,
          username: profile.username,
          email: profile.email,
          profile_image: profile.picture
        };
        break;
      case 'facebook':
        accountData = {
          ...accountData,
          platform_user_id: profile.id,
          name: profile.name,
          username: profile.username,
          email: profile.email,
          profile_image: profile.picture?.data?.url
        };
        break;
      case 'twitter':
        const user = profile.data;
        accountData = {
          ...accountData,
          platform_user_id: user.id,
          name: user.name,
          username: user.username,
          profile_image: user.profile_image_url
        };
        break;
    }

    const { error } = await supabase
      .from('social_accounts')
      .upsert(accountData, {
        onConflict: 'user_id,platform,platform_user_id'
      });

    if (error) {
      throw new Error(`Failed to store ${platform} account: ${error.message}`);
    }
  }

  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}

export const directOAuthService = DirectOAuthService.getInstance();