import { SOCIAL_MEDIA_CONFIG } from '@/config/socialMedia';
import { SocialAccount } from '@/contexts/SocialAccountsContext';

export interface AuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email?: string;
  profileImage?: string;
}

export class AuthService {
  private static instance: AuthService;

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async exchangeCodeForToken(platform: string, code: string): Promise<AuthTokenResponse> {
    const config = SOCIAL_MEDIA_CONFIG[platform as keyof typeof SOCIAL_MEDIA_CONFIG];
    
    if (!config) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const tokenData = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret
    };

    try {
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams(tokenData)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Token exchange failed: ${errorData}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Token exchange error for ${platform}:`, error);
      throw error;
    }
  }

  async getUserProfile(platform: string, accessToken: string): Promise<UserProfile> {
    switch (platform) {
      case 'linkedin':
        return this.getLinkedInProfile(accessToken);
      case 'facebook':
        return this.getFacebookProfile(accessToken);
      case 'twitter':
        return this.getTwitterProfile(accessToken);
      default:
        throw new Error(`Profile fetching not implemented for ${platform}`);
    }
  }

  private async getLinkedInProfile(accessToken: string): Promise<UserProfile> {
    try {
      const [profileResponse, emailResponse] = await Promise.all([
        fetch('https://api.linkedin.com/v2/people/~', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        }),
        fetch('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        })
      ]);

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch LinkedIn profile');
      }

      const profile = await profileResponse.json();
      const emailData = emailResponse.ok ? await emailResponse.json() : null;

      const firstName = profile.localizedFirstName || '';
      const lastName = profile.localizedLastName || '';
      const email = emailData?.elements?.[0]?.['handle~']?.emailAddress || '';

      return {
        id: profile.id,
        name: `${firstName} ${lastName}`.trim(),
        username: email.split('@')[0] || profile.id,
        email,
        profileImage: profile.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier
      };
    } catch (error) {
      console.error('LinkedIn profile fetch error:', error);
      throw error;
    }
  }

  private async getFacebookProfile(accessToken: string): Promise<UserProfile> {
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name,email,picture&access_token=${accessToken}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch Facebook profile');
      }

      const profile = await response.json();

      return {
        id: profile.id,
        name: profile.name,
        username: profile.name.toLowerCase().replace(/\s+/g, '.'),
        email: profile.email,
        profileImage: profile.picture?.data?.url
      };
    } catch (error) {
      console.error('Facebook profile fetch error:', error);
      throw error;
    }
  }

  private async getTwitterProfile(accessToken: string): Promise<UserProfile> {
    try {
      const response = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Twitter profile');
      }

      const data = await response.json();
      const user = data.data;

      return {
        id: user.id,
        name: user.name,
        username: user.username,
        profileImage: user.profile_image_url
      };
    } catch (error) {
      console.error('Twitter profile fetch error:', error);
      throw error;
    }
  }

  async refreshToken(platform: string, refreshToken: string): Promise<AuthTokenResponse> {
    const config = SOCIAL_MEDIA_CONFIG[platform as keyof typeof SOCIAL_MEDIA_CONFIG];
    
    if (!config) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const tokenData = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret
    };

    try {
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams(tokenData)
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      return await response.json();
    } catch (error) {
      console.error(`Token refresh error for ${platform}:`, error);
      throw error;
    }
  }
}

export const authService = AuthService.getInstance();