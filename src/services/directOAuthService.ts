import { supabase } from '@/integrations/supabase/client';

interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
  authUrl: string;
  tokenUrl: string;
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
          authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
          tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken'
        };
      case 'facebook':
        return {
          clientId: import.meta.env.VITE_FACEBOOK_APP_ID || '',
          redirectUri: `${baseUrl}/auth/facebook/callback`,
          scope: 'pages_manage_posts,pages_read_engagement,public_profile,pages_show_list',
          authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
          tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token'
        };
      case 'twitter':
        return {
          clientId: import.meta.env.VITE_TWITTER_CLIENT_ID || '',
          redirectUri: `${baseUrl}/auth/twitter/callback`,
          scope: 'tweet.read tweet.write users.read offline.access',
          authUrl: 'https://twitter.com/i/oauth2/authorize',
          tokenUrl: 'https://api.twitter.com/2/oauth2/token'
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
        throw new Error(`${platform.charAt(0).toUpperCase() + platform.slice(1)} OAuth credentials not configured. Please set up the required environment variables.`);
      }

      // Generate state token for security
      const stateToken = crypto.randomUUID();
      
      // Store state in localStorage temporarily (in production, you'd want to use a more secure method)
      localStorage.setItem(`oauth_state_${platform}`, JSON.stringify({
        state: stateToken,
        platform,
        userId: user.id,
        timestamp: Date.now()
      }));

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
        
        localStorage.setItem(`oauth_code_verifier_${platform}`, codeVerifier);
        
        authUrl.searchParams.set('code_challenge', codeChallenge);
        authUrl.searchParams.set('code_challenge_method', 'S256');
      }

      console.log('Redirecting to OAuth URL:', authUrl.toString());
      
      // Redirect to OAuth provider
      window.location.href = authUrl.toString();
      
    } catch (error) {
      console.error('OAuth initiation error:', error);
      throw error;
    }
  }

  async handleOAuthCallback(platform: string, code: string, state: string): Promise<boolean> {
    try {
      // Verify state parameter
      const storedState = localStorage.getItem(`oauth_state_${platform}`);
      if (!storedState) {
        throw new Error('OAuth state not found');
      }

      const stateData = JSON.parse(storedState);
      if (stateData.state !== state) {
        throw new Error('Invalid OAuth state parameter');
      }

      // Check if state is not too old (5 minutes)
      if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
        throw new Error('OAuth state expired');
      }

      const config = this.getOAuthConfig(platform);

      // Exchange code for token using a proxy service
      const tokenData = await this.exchangeCodeForToken(platform, code, config);
      
      // Get user profile
      const profile = await this.getUserProfile(platform, tokenData.access_token);
      
      // Store account in Supabase
      await this.storeAccount(platform, profile, tokenData, stateData.userId);

      // Clean up localStorage
      localStorage.removeItem(`oauth_state_${platform}`);
      if (platform === 'twitter') {
        localStorage.removeItem(`oauth_code_verifier_${platform}`);
      }

      return true;
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw error;
    }
  }

  private async exchangeCodeForToken(platform: string, code: string, config: OAuthConfig): Promise<any> {
    // Use a CORS proxy or your own backend service to exchange the code
    // This is a simplified example - in production, you'd need a proper backend service
    
    const tokenParams: any = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId
    };

    // For Twitter, add PKCE code verifier
    if (platform === 'twitter') {
      const codeVerifier = localStorage.getItem(`oauth_code_verifier_${platform}`);
      if (codeVerifier) {
        tokenParams.code_verifier = codeVerifier;
      }
    }

    // Note: This would need to be handled by your backend in production
    // as client secrets should never be exposed to the frontend
    throw new Error('Token exchange must be handled by backend service. Please use the Edge Function method or set up a proper backend service.');
  }

  private async getUserProfile(platform: string, accessToken: string): Promise<any> {
    let profileUrl = '';
    
    switch (platform) {
      case 'linkedin':
        profileUrl = 'https://api.linkedin.com/v2/userinfo';
        break;
      case 'facebook':
        profileUrl = 'https://graph.facebook.com/v18.0/me?fields=id,name,email,picture';
        break;
      case 'twitter':
        profileUrl = 'https://api.twitter.com/2/users/me?user.fields=profile_image_url';
        break;
      default:
        throw new Error(`Profile fetching not implemented for ${platform}`);
    }

    const response = await fetch(profileUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${platform} profile`);
    }

    return await response.json();
  }

  private async storeAccount(platform: string, profile: any, tokenData: any, userId: string): Promise<void> {
    let accountData: any = {
      user_id: userId,
      platform,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
      is_active: true
    };

    // Platform-specific profile mapping
    switch (platform) {
      case 'linkedin':
        accountData = {
          ...accountData,
          platform_user_id: profile.sub,
          name: profile.name,
          username: profile.email?.split('@')[0] || profile.sub,
          email: profile.email,
          profile_image: profile.picture
        };
        break;
      case 'facebook':
        accountData = {
          ...accountData,
          platform_user_id: profile.id,
          name: profile.name,
          username: profile.name.toLowerCase().replace(/\s+/g, '.'),
          email: profile.email,
          profile_image: profile.picture?.data?.url
        };
        break;
      case 'twitter':
        const user = profile.data || profile;
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