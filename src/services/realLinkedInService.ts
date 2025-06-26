import { SocialAccount } from '@/contexts/SocialAccountsContext';
import { SOCIAL_MEDIA_CONFIG } from '@/config/socialMedia';

interface LinkedInPostData {
  content: string;
  media?: File[];
}

interface LinkedInPostResponse {
  success: boolean;
  postId?: string;
  error?: string;
}

export class RealLinkedInService {
  private static instance: RealLinkedInService;

  public static getInstance(): RealLinkedInService {
    if (!RealLinkedInService.instance) {
      RealLinkedInService.instance = new RealLinkedInService();
    }
    return RealLinkedInService.instance;
  }

  async postToLinkedIn(account: SocialAccount, postData: LinkedInPostData): Promise<LinkedInPostResponse> {
    try {
      console.log('Posting to LinkedIn:', { account: account.username, content: postData.content });
      
      // First, get the user's profile ID
      const profileId = await this.getUserProfileId(account.accessToken);
      
      // Create the post payload
      const postPayload = {
        author: `urn:li:person:${profileId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: postData.content
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      // If media is provided, handle media upload
      if (postData.media && postData.media.length > 0) {
        const mediaUrns = await this.uploadMedia(account.accessToken, postData.media, profileId);
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

      // Post to LinkedIn
      const response = await fetch(`${SOCIAL_MEDIA_CONFIG.linkedin.apiUrl}/ugcPosts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.accessToken}`,
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
        success: true,
        postId: result.id
      };

    } catch (error) {
      console.error('LinkedIn posting error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async getUserProfileId(accessToken: string): Promise<string> {
    const response = await fetch(`${SOCIAL_MEDIA_CONFIG.linkedin.apiUrl}/people/~`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get LinkedIn profile ID');
    }

    const profile = await response.json();
    return profile.id;
  }

  private async uploadMedia(accessToken: string, mediaFiles: File[], profileId: string): Promise<string[]> {
    const mediaUrns: string[] = [];

    for (const file of mediaFiles) {
      try {
        // Step 1: Register upload
        const registerResponse = await fetch(`${SOCIAL_MEDIA_CONFIG.linkedin.apiUrl}/assets?action=registerUpload`, {
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
          throw new Error('Failed to register media upload');
        }

        const registerData = await registerResponse.json();
        const uploadUrl = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
        const asset = registerData.value.asset;

        // Step 2: Upload the file
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: file
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload media file');
        }

        mediaUrns.push(asset);
      } catch (error) {
        console.error('Media upload error:', error);
        // Continue with other files even if one fails
      }
    }

    return mediaUrns;
  }

  async validateAccount(account: SocialAccount): Promise<boolean> {
    try {
      // Check if token is expired
      if (account.expiresAt && account.expiresAt < new Date()) {
        console.log('LinkedIn token expired for account:', account.username);
        return false;
      }
      
      // Validate token by making a simple API call
      const response = await fetch(`${SOCIAL_MEDIA_CONFIG.linkedin.apiUrl}/people/~`, {
        headers: {
          'Authorization': `Bearer ${account.accessToken}`,
          'Accept': 'application/json'
        }
      });

      return response.ok;
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

export const realLinkedInService = RealLinkedInService.getInstance();