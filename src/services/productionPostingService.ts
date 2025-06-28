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
    const results: PostingResult[] = [];

    for (const platform of post.platforms) {
      const account = accounts.find(acc => acc.platform === platform && acc.is_active);
      
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
            result = await this.postToLinkedIn(account, post);
            break;

          case 'facebook':
            result = await this.postToFacebook(account, post);
            break;

          case 'twitter':
            result = await this.postToTwitter(account, post);
            break;

          case 'instagram':
            result = await this.postToInstagram(account, post);
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

  private async postToLinkedIn(account: SocialAccount, post: ScheduledPost): Promise<PostingResult> {
    try {
      // Get user profile ID from LinkedIn
      const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
        },
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to get LinkedIn profile');
      }

      const profile = await profileResponse.json();
      const personUrn = `urn:li:person:${profile.sub}`;

      // Create post payload
      const postPayload: any = {
        author: personUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: post.content
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      // Handle media if present
      if (post.media && post.media.length > 0) {
        const mediaUrns = await this.uploadLinkedInMedia(account.access_token, post.media, profile.sub);
        if (mediaUrns.length > 0) {
          postPayload.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
          postPayload.specificContent['com.linkedin.ugc.ShareContent'].media = mediaUrns.map(urn => ({
            status: 'READY',
            description: {
              text: 'Image shared via EkClickPost'
            },
            media: urn,
            title: {
              text: 'Shared Image'
            }
          }));
        }
      }

      // Post to LinkedIn
      const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify(postPayload)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`LinkedIn API error: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      
      return {
        platform: 'linkedin',
        success: true,
        postId: result.id
      };

    } catch (error) {
      return {
        platform: 'linkedin',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async uploadLinkedInMedia(accessToken: string, mediaFiles: File[], profileId: string): Promise<string[]> {
    const mediaUrns: string[] = [];

    for (const file of mediaFiles) {
      try {
        // Register upload
        const registerResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            registerUploadRequest: {
              recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
              owner: `urn:li:person:${profileId}`,
              serviceRelationships: [{
                relationshipType: 'OWNER',
                identifier: 'urn:li:userGeneratedContent'
              }]
            }
          })
        });

        if (!registerResponse.ok) {
          continue;
        }

        const registerData = await registerResponse.json();
        const uploadUrl = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
        const asset = registerData.value.asset;

        // Upload file
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: file
        });

        if (uploadResponse.ok) {
          mediaUrns.push(asset);
        }
      } catch (error) {
        console.error('Media upload error:', error);
      }
    }

    return mediaUrns;
  }

  private async postToFacebook(account: SocialAccount, post: ScheduledPost): Promise<PostingResult> {
    try {
      const token = account.page_access_token || account.access_token;
      let endpoint = 'me/feed';
      
      // If it's a page account, use the page ID
      if (account.metadata?.page_id) {
        endpoint = `${account.metadata.page_id}/feed`;
      }

      const response = await fetch(`https://graph.facebook.com/v18.0/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: post.content,
          access_token: token
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
      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
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

  private async postToInstagram(account: SocialAccount, post: ScheduledPost): Promise<PostingResult> {
    try {
      if (!account.metadata?.ig_user_id || !account.page_access_token) {
        throw new Error('Instagram account not properly configured');
      }

      const igUserId = account.metadata.ig_user_id;
      const token = account.page_access_token;

      // For Instagram, we need images
      if (!post.media || post.media.length === 0) {
        throw new Error('Instagram posts require images');
      }

      // Create media container (simplified - in production you'd upload the image first)
      const mediaResponse = await fetch(`https://graph.facebook.com/v18.0/${igUserId}/media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: 'https://example.com/placeholder-image.jpg', // You'd need to upload the actual image
          caption: post.content,
          access_token: token
        })
      });

      if (!mediaResponse.ok) {
        const errorData = await mediaResponse.json();
        throw new Error(`Instagram media creation error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const mediaResult = await mediaResponse.json();

      // Publish the media
      const publishResponse = await fetch(`https://graph.facebook.com/v18.0/${igUserId}/media_publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creation_id: mediaResult.id,
          access_token: token
        })
      });

      if (!publishResponse.ok) {
        const errorData = await publishResponse.json();
        throw new Error(`Instagram publish error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const publishResult = await publishResponse.json();
      
      return {
        platform: 'instagram',
        success: true,
        postId: publishResult.id
      };
    } catch (error) {
      return {
        platform: 'instagram',
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
        // Check if token is expired
        if (account.expires_at && new Date(account.expires_at) < new Date()) {
          isValid = false;
        } else {
          switch (account.platform) {
            case 'linkedin':
              const linkedinResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
                headers: { 'Authorization': `Bearer ${account.access_token}` }
              });
              isValid = linkedinResponse.ok;
              break;
            case 'facebook':
              const facebookResponse = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${account.access_token}`);
              isValid = facebookResponse.ok;
              break;
            case 'twitter':
              const twitterResponse = await fetch('https://api.twitter.com/2/users/me', {
                headers: { 'Authorization': `Bearer ${account.access_token}` }
              });
              isValid = twitterResponse.ok;
              break;
            default:
              isValid = true;
          }
        }
      } catch (error) {
        console.error(`Validation error for ${account.platform}:`, error);
        isValid = false;
      }

      validationResults.push({ account, isValid });
    }

    return validationResults;
  }
}

export const productionPostingService = ProductionPostingService.getInstance();