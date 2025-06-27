
import { SocialAccount } from '@/contexts/SocialAccountsContext';

interface LinkedInPostData {
  content: string;
  media?: File[];
}

interface LinkedInPostResponse {
  success: boolean;
  postId?: string;
  error?: string;
}

export class LinkedInService {
  private static instance: LinkedInService;

  public static getInstance(): LinkedInService {
    if (!LinkedInService.instance) {
      LinkedInService.instance = new LinkedInService();
    }
    return LinkedInService.instance;
  }

  async postToLinkedIn(account: SocialAccount, postData: LinkedInPostData): Promise<LinkedInPostResponse> {
    try {
      console.log('Posting to LinkedIn:', { account: account.username, content: postData.content });
      
      // Mock LinkedIn API call - in real implementation, this would call LinkedIn's API
      // https://docs.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin
      
      const mockResponse = await this.mockLinkedInPost(account, postData);
      
      if (mockResponse.success) {
        console.log('LinkedIn post successful:', mockResponse.postId);
        return {
          success: true,
          postId: mockResponse.postId
        };
      } else {
        throw new Error(mockResponse.error || 'Failed to post to LinkedIn');
      }
    } catch (error) {
      console.error('LinkedIn posting error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async mockLinkedInPost(account: SocialAccount, postData: LinkedInPostData): Promise<LinkedInPostResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock successful response
    return {
      success: true,
      postId: `linkedin_post_${Date.now()}`
    };
  }

  async validateAccount(account: SocialAccount): Promise<boolean> {
    try {
      // Check if token is expired
      if (account.expires_at && account.expires_at < new Date().toISOString()) {
        console.log('LinkedIn token expired for account:', account.username);
        return false;
      }
      
      // Mock token validation - in real app, this would verify with LinkedIn API
      console.log('LinkedIn account is valid:', account.username);
      return true;
    } catch (error) {
      console.error('LinkedIn account validation error:', error);
      return false;
    }
  }

  getCharacterLimit(): number {
    return 3000; // LinkedIn's character limit for posts
  }

  supportsMedia(): boolean {
    return true;
  }

  getSupportedMediaTypes(): string[] {
    return ['image/jpeg', 'image/png', 'image/gif'];
  }
}

export const linkedinService = LinkedInService.getInstance();
