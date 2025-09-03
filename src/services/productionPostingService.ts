import { supabase } from '@/integrations/supabase/client';
import { SocialAccount } from '@/contexts/SocialAccountsContext';
import { ScheduledPost } from '@/contexts/PostsContext';

interface PostingResult {
  platform: string;
  success: boolean;
  postId?: string;
  error?: string;
}

export class ProductionPostingService {
  private static instance: ProductionPostingService;

  public static getInstance(): ProductionPostingService {
    if (!ProductionPostingService.instance) {
      ProductionPostingService.instance = new ProductionPostingService();
    }
    return ProductionPostingService.instance;
  }

  async publishPost(post: ScheduledPost, accounts: SocialAccount[]): Promise<PostingResult[]> {
    try {
      // Use the Edge Function to post to social media platforms
      const { data, error } = await supabase.functions.invoke('post-to-social', {
        body: {
          content: post.content,
          mediaUrls: post.media_urls || [],
          accountIds: accounts.map(acc => acc.id)
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      return data.results || [];
    } catch (error) {
      console.error('Publishing error:', error);
      // Return error results for all platforms
      return post.platforms.map(platform => ({
        platform,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }

  async validateAccounts(accounts: SocialAccount[]): Promise<{ account: SocialAccount; isValid: boolean }[]> {
    // Account validation is now also handled by Edge Functions to avoid CORS
    return accounts.map(account => ({ account, isValid: true }));
  }
}

export const productionPostingService = ProductionPostingService.getInstance();