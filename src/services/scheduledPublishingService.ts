import { supabase } from '@/integrations/supabase/client';
import { isPostDueForPublishing, getNextPublishingTime } from '@/utils/timezoneUtils';
import { productionPostingService } from './productionPostingService';

export interface PublishingResult {
  postId: string;
  success: boolean;
  error?: string;
  publishedAt: Date;
}

export class ScheduledPublishingService {
  private static instance: ScheduledPublishingService;
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 60000; // Check every minute

  static getInstance(): ScheduledPublishingService {
    if (!ScheduledPublishingService.instance) {
      ScheduledPublishingService.instance = new ScheduledPublishingService();
    }
    return ScheduledPublishingService.instance;
  }

  // Start the publishing service
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.checkInterval = setInterval(() => {
      this.checkAndPublishScheduledPosts();
    }, this.CHECK_INTERVAL_MS);
    
    console.log('Scheduled publishing service started');
  }

  // Stop the publishing service
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('Scheduled publishing service stopped');
  }

  // Check for posts that are due for publishing
  private async checkAndPublishScheduledPosts(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all scheduled posts for the current user
      const { data: scheduledPosts, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'scheduled')
        .order('scheduled_for', { ascending: true });

      if (error) {
        console.error('Failed to fetch scheduled posts:', error);
        return;
      }

      if (!scheduledPosts || scheduledPosts.length === 0) return;

      // Find posts that are due for publishing
      const postsToPublish = scheduledPosts.filter(post => 
        isPostDueForPublishing(new Date(post.scheduled_for))
      );

      if (postsToPublish.length === 0) return;

      console.log(`Found ${postsToPublish.length} posts to publish`);

      // Publish each due post
      for (const post of postsToPublish) {
        await this.publishScheduledPost(post);
      }

      // Optimize next check based on next scheduled post
      this.optimizeNextCheck(scheduledPosts);

    } catch (error) {
      console.error('Error in scheduled publishing check:', error);
    }
  }

  // Publish a single scheduled post
  private async publishScheduledPost(post: any): Promise<void> {
    try {
      // Update status to publishing
      await supabase
        .from('scheduled_posts')
        .update({ 
          status: 'publishing',
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id);

      // Get user's social accounts for the platforms
      const { data: accounts } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', post.user_id)
        .in('platform', post.platforms);

      if (!accounts || accounts.length === 0) {
        throw new Error('No connected accounts found for the selected platforms');
      }

      // Publish the post using the production service
      const results = await productionPostingService.publishPost(post, accounts as any);
      
      // Check if publishing was successful
      const hasSuccess = results.some(r => r.success);
      
      if (hasSuccess) {
        // Update status to published
        await supabase
          .from('scheduled_posts')
          .update({ 
            status: 'published',
            updated_at: new Date().toISOString()
          })
          .eq('id', post.id);
        
        console.log(`Post ${post.id} published successfully`);
      } else {
        // Update status to failed
        await supabase
          .from('scheduled_posts')
          .update({ 
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', post.id);
        
        console.error(`Post ${post.id} failed to publish`);
      }

    } catch (error) {
      console.error(`Failed to publish scheduled post ${post.id}:`, error);
      
      // Update status to failed
      await supabase
        .from('scheduled_posts')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id);
    }
  }

  // Optimize the next check based on when the next post is scheduled
  private optimizeNextCheck(scheduledPosts: any[]): void {
    const nextPublishingTime = getNextPublishingTime(scheduledPosts);
    
    if (nextPublishingTime) {
      const now = new Date();
      const timeUntilNext = nextPublishingTime.getTime() - now.getTime();
      
      // If next post is more than 5 minutes away, we can check less frequently
      if (timeUntilNext > 5 * 60 * 1000) {
        // Adjust interval to check every 5 minutes instead of every minute
        if (this.checkInterval) {
          clearInterval(this.checkInterval);
          this.checkInterval = setInterval(() => {
            this.checkAndPublishScheduledPosts();
          }, Math.min(timeUntilNext, 5 * 60 * 1000));
        }
      }
    }
  }

  // Manually trigger a check (useful for testing)
  async manualCheck(): Promise<void> {
    await this.checkAndPublishScheduledPosts();
  }

  // Get service status
  getStatus(): { isRunning: boolean; nextCheck: Date | null } {
    return {
      isRunning: this.isRunning,
      nextCheck: this.checkInterval ? new Date(Date.now() + this.CHECK_INTERVAL_MS) : null
    };
  }
}

// Export singleton instance
export const scheduledPublishingService = ScheduledPublishingService.getInstance();
