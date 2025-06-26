import { SocialAccount } from '@/contexts/SocialAccountsContext';
import { ScheduledPost } from '@/contexts/PostsContext';
import { realLinkedInService } from './realLinkedInService';

interface PostingResult {
  platform: string;
  success: boolean;
  postId?: string;
  error?: string;
}

export class RealPostingService {
  private static instance: RealPostingService;

  public static getInstance(): RealPostingService {
    if (!RealPostingService.instance) {
      RealPostingService.instance = new RealPostingService();
    }
    return RealPostingService.instance;
  }

  async publishPost(post: ScheduledPost, accounts: SocialAccount[]): Promise<PostingResult[]> {
    const results: PostingResult[] = [];

    for (const platform of post.platforms) {
      const account = accounts.find(acc => acc.platform === platform && acc.isActive);
      
      if (!account) {
        console.error(`No active account found for platform: ${platform}`);
        results.push({
          platform,
          success: false,
          error: `No connected account for ${platform}`
        });
        continue;
      }

      try {
        let result: PostingResult;

        switch (platform) {
          case 'linkedin':
            const linkedinResult = await realLinkedInService.postToLinkedIn(account, {
              content: post.content,
              media: post.media
            });
            result = {
              platform,
              success: linkedinResult.success,
              postId: linkedinResult.postId,
              error: linkedinResult.error
            };
            break;

          case 'facebook':
            result = await this.postToFacebook(account, post);
            break;

          case 'twitter':
            result = await this.postToTwitter(account, post);
            break;

          case 'instagram':
            result = {
              platform,
              success: false,
              error: 'Instagram requires special approval and is not yet implemented'
            };
            break;

          default:
            result = {
              platform,
              success: false,
              error: 'Unsupported platform'
            };
        }

        results.push(result);
        console.log(`Posting result for ${platform}:`, result);

      } catch (error) {
        console.error(`Error posting to ${platform}:`, error);
        results.push({
          platform,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  private async postToFacebook(account: SocialAccount, post: ScheduledPost): Promise<PostingResult> {
    try {
      // Facebook Graph API posting
      const response = await fetch(`https://graph.facebook.com/v18.0/me/feed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: post.content,
          access_token: account.accessToken
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Facebook API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();
      
      return {
        platform: 'facebook',
        success: true,
        postId: result.id
      };
    } catch (error) {
      return {
        platform: 'facebook',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async postToTwitter(account: SocialAccount, post: ScheduledPost): Promise<PostingResult> {
    try {
      // Twitter API v2 posting
      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: post.content
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Twitter API error: ${errorData.detail || 'Unknown error'}`);
      }

      const result = await response.json();
      
      return {
        platform: 'twitter',
        success: true,
        postId: result.data.id
      };
    } catch (error) {
      return {
        platform: 'twitter',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async validateAccounts(accounts: SocialAccount[]): Promise<{ account: SocialAccount; isValid: boolean }[]> {
    const validationResults = [];

    for (const account of accounts) {
      let isValid = false;

      try {
        switch (account.platform) {
          case 'linkedin':
            isValid = await realLinkedInService.validateAccount(account);
            break;
          case 'facebook':
            isValid = await this.validateFacebookAccount(account);
            break;
          case 'twitter':
            isValid = await this.validateTwitterAccount(account);
            break;
          default:
            isValid = true; // Mock validation for unsupported platforms
        }
      } catch (error) {
        console.error(`Validation error for ${account.platform}:`, error);
        isValid = false;
      }

      validationResults.push({ account, isValid });
    }

    return validationResults;
  }

  private async validateFacebookAccount(account: SocialAccount): Promise<boolean> {
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${account.accessToken}`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private async validateTwitterAccount(account: SocialAccount): Promise<boolean> {
    try {
      const response = await fetch('https://api.twitter.com/2/users/me', {
        headers: {
          'Authorization': `Bearer ${account.accessToken}`,
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  getServiceForPlatform(platform: string) {
    switch (platform) {
      case 'linkedin':
        return realLinkedInService;
      default:
        return null;
    }
  }
}

export const realPostingService = RealPostingService.getInstance();