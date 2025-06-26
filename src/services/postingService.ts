
import { SocialAccount, useSocialAccounts } from '@/contexts/SocialAccountsContext';
import { ScheduledPost } from '@/contexts/PostsContext';
import { linkedinService } from './linkedinService';

interface PostingResult {
  platform: string;
  success: boolean;
  postId?: string;
  error?: string;
}

export class PostingService {
  private static instance: PostingService;

  public static getInstance(): PostingService {
    if (!PostingService.instance) {
      PostingService.instance = new PostingService();
    }
    return PostingService.instance;
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
            const linkedinResult = await linkedinService.postToLinkedIn(account, {
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
          case 'twitter':
          case 'instagram':
            // Placeholder for other platforms
            result = {
              platform,
              success: false,
              error: `${platform} integration coming soon`
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

  async validateAccounts(accounts: SocialAccount[]): Promise<{ account: SocialAccount; isValid: boolean }[]> {
    const validationResults = [];

    for (const account of accounts) {
      let isValid = false;

      try {
        switch (account.platform) {
          case 'linkedin':
            isValid = await linkedinService.validateAccount(account);
            break;
          default:
            isValid = true; // Mock validation for other platforms
        }
      } catch (error) {
        console.error(`Validation error for ${account.platform}:`, error);
        isValid = false;
      }

      validationResults.push({ account, isValid });
    }

    return validationResults;
  }

  getServiceForPlatform(platform: string) {
    switch (platform) {
      case 'linkedin':
        return linkedinService;
      default:
        return null;
    }
  }
}

export const postingService = PostingService.getInstance();
