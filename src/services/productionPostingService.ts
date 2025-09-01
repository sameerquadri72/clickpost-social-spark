
import { SocialAccount } from '@/contexts/SocialAccountsContext';
import { ScheduledPost } from '@/contexts/PostsContext';

interface PostingResult {
  platform: string;
  success: boolean;
  postId?: string;
  error?: string;
}

// Web Crypto API implementation for HMAC-SHA1
async function createHmacSha1(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyBuffer = encoder.encode(key);
  const dataBuffer = encoder.encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
  const signatureArray = new Uint8Array(signature);
  
  // Convert to base64
  return btoa(String.fromCharCode(...signatureArray));
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

          case 'youtube':
            result = await this.postToYouTube(account, post);
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
      if (post.media_urls && post.media_urls.length > 0) {
        // Note: media_urls are strings, need to convert to Files for upload
        // This is a placeholder - actual implementation would need file handling
        const mediaUrns: string[] = [];
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
      const pageId = account.metadata?.page_id || 'me';

      // Determine content type and endpoint
      if (post.media_urls && post.media_urls.length > 0) {
        // Note: For now, assume images since we're working with URLs
        return await this.postFacebookPhotos(pageId, token, post);
      } else {
        return await this.postFacebookText(pageId, token, post);
      }
    } catch (error) {
      return {
        platform: 'facebook',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async postFacebookText(pageId: string, token: string, post: ScheduledPost): Promise<PostingResult> {
    const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
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
  }

  private async postFacebookPhotos(pageId: string, token: string, post: ScheduledPost): Promise<PostingResult> {
    if (post.media_urls && post.media_urls.length === 1) {
      // Single photo - Note: This needs actual file handling for URLs
      return {
        success: false,
        platform: 'facebook',
        error: 'Media URL handling not implemented yet'
      };
    } else if (post.media_urls && post.media_urls.length > 1) {
      // Multiple photos - album
      // Note: This needs actual file handling for URLs
      return {
        success: false,
        platform: 'facebook',
        error: 'Multiple photo handling not implemented yet'
      };
    }

    // Text-only post
    return await this.postFacebookText(pageId, token, post);
  }

  private async postFacebookVideo(pageId: string, token: string, post: ScheduledPost): Promise<PostingResult> {
    // Note: Video URL handling not implemented yet
    return {
      success: false,
      platform: 'facebook',
      error: 'Video URL handling not implemented yet'
    };
  }

  // Twitter OAuth 1.0a posting implementation
  private async postToTwitter(account: SocialAccount, post: ScheduledPost): Promise<PostingResult> {
    try {
      // Check if this is an OAuth 1.0a account (has token_secret)
      if (!account.token_secret) {
        throw new Error('Twitter account missing OAuth 1.0a credentials');
      }

      let mediaIds: string[] = [];

      // Handle media uploads if present
      if (post.media_urls && post.media_urls.length > 0) {
        // Note: Twitter media URL handling not implemented yet
        console.warn('Twitter media URL handling not implemented');
      }

      // Create tweet with Twitter API v2
      const tweetData: any = { text: post.content };
      
      if (mediaIds.length > 0) {
        tweetData.media = { media_ids: mediaIds };
      }

      const result = await this.makeTwitterOAuth1aRequest(
        'POST',
        'https://api.twitter.com/2/tweets',
        tweetData,
        account.access_token,
        account.token_secret
      );

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

  private async uploadTwitterMedia(account: SocialAccount, mediaFiles: File[]): Promise<string[]> {
    const mediaIds: string[] = [];

    for (const file of mediaFiles) {
      try {
        const isVideo = file.type.startsWith('video/');
        
        if (isVideo) {
          // Chunked upload for videos
          const mediaId = await this.uploadTwitterVideoChunked(account, file);
          if (mediaId) mediaIds.push(mediaId);
        } else {
          // Streaming upload for images
          const mediaId = await this.uploadTwitterImageStreaming(account, file);
          if (mediaId) mediaIds.push(mediaId);
        }
      } catch (error) {
        console.error('Twitter media upload error:', error);
      }
    }

    return mediaIds;
  }

  private async uploadTwitterVideoChunked(account: SocialAccount, file: File): Promise<string | null> {
    try {
      // Initialize upload
      const initResult = await this.makeTwitterOAuth1aRequest(
        'POST',
        'https://upload.twitter.com/1.1/media/upload.json',
        {
          command: 'INIT',
          total_bytes: file.size.toString(),
          media_type: file.type,
          media_category: 'tweet_video'
        },
        account.access_token,
        account.token_secret
      );

      const mediaId = initResult.media_id_string;
      const chunkSize = 5 * 1024 * 1024; // 5MB chunks
      let segmentIndex = 0;

      // Upload chunks
      for (let start = 0; start < file.size; start += chunkSize) {
        const chunk = file.slice(start, start + chunkSize);
        const formData = new FormData();
        formData.append('command', 'APPEND');
        formData.append('media_id', mediaId);
        formData.append('segment_index', segmentIndex.toString());
        formData.append('media', chunk);

        await fetch('https://upload.twitter.com/1.1/media/upload.json', {
          method: 'POST',
          headers: {
            'Authorization': await this.generateTwitterAuthHeader('POST', 'https://upload.twitter.com/1.1/media/upload.json', account)
          },
          body: formData
        });

        segmentIndex++;
      }

      // Finalize upload
      await this.makeTwitterOAuth1aRequest(
        'POST',
        'https://upload.twitter.com/1.1/media/upload.json',
        {
          command: 'FINALIZE',
          media_id: mediaId
        },
        account.access_token,
        account.token_secret
      );

      return mediaId;
    } catch (error) {
      console.error('Twitter video upload error:', error);
      return null;
    }
  }

  private async uploadTwitterImageStreaming(account: SocialAccount, file: File): Promise<string | null> {
    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('media_category', 'tweet_image');

      const response = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
        method: 'POST',
        headers: {
          'Authorization': await this.generateTwitterAuthHeader('POST', 'https://upload.twitter.com/1.1/media/upload.json', account)
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Twitter image upload failed: ${response.status}`);
      }

      const result = await response.json();
      return result.media_id_string;
    } catch (error) {
      console.error('Twitter image upload error:', error);
      return null;
    }
  }

  private async generateTwitterAuthHeader(method: string, url: string, account: SocialAccount): Promise<string> {
    const consumerKey = 'YOUR_TWITTER_CONSUMER_KEY'; // This should come from environment
    const consumerSecret = 'YOUR_TWITTER_CONSUMER_SECRET'; // This should come from environment
    
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = Math.random().toString(36).substring(2, 15);

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: consumerKey,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_token: account.access_token,
      oauth_version: '1.0'
    };

    const signature = await this.generateTwitterSignature(method, url, oauthParams, consumerSecret, account.token_secret || '');
    oauthParams.oauth_signature = signature;

    return 'OAuth ' + Object.keys(oauthParams)
      .sort()
      .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
      .join(', ');
  }

  // Helper method for Twitter OAuth 1.0a signed requests
  private async makeTwitterOAuth1aRequest(
    method: string,
    url: string,
    params: Record<string, any>,
    accessToken: string,
    accessTokenSecret: string
  ): Promise<any> {
    // Note: In a real implementation, you would need the consumer key and secret
    // These should be stored securely and accessed from environment variables
    const consumerKey = 'YOUR_TWITTER_CONSUMER_KEY'; // This should come from environment
    const consumerSecret = 'YOUR_TWITTER_CONSUMER_SECRET'; // This should come from environment

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = Math.random().toString(36).substring(2, 15);

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: consumerKey,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_token: accessToken,
      oauth_version: '1.0'
    };

    // Combine OAuth params with request params
    const allParams = { ...oauthParams, ...params };

    // Generate signature
    const signature = await this.generateTwitterSignature(method, url, allParams, consumerSecret, accessTokenSecret);
    oauthParams.oauth_signature = signature;

    // Create authorization header
    const authHeader = 'OAuth ' + Object.keys(oauthParams)
      .sort()
      .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
      .join(', ');

    // Make the request
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    if (method === 'POST') {
      requestOptions.body = new URLSearchParams(params).toString();
    } else if (Object.keys(params).length > 0) {
      url += '?' + new URLSearchParams(params).toString();
    }

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Twitter API error: ${response.status} - ${errorData}`);
    }

    return await response.json();
  }

  private async generateTwitterSignature(
    method: string,
    url: string,
    params: Record<string, string>,
    consumerSecret: string,
    tokenSecret: string
  ): Promise<string> {
    // Sort parameters
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');

    // Create signature base string
    const signatureBaseString = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(sortedParams)
    ].join('&');

    // Create signing key
    const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

    // Generate signature using Web Crypto API
    const signature = await createHmacSha1(signingKey, signatureBaseString);

    return signature;
  }

  private async postToInstagram(account: SocialAccount, post: ScheduledPost): Promise<PostingResult> {
    try {
      if (!account.metadata?.ig_user_id || !account.page_access_token) {
        throw new Error('Instagram account not properly configured');
      }

      const igUserId = account.metadata.ig_user_id;
      const token = account.page_access_token;

      // Instagram requires media
      if (!post.media_urls || post.media_urls.length === 0) {
        throw new Error('Instagram posts require images or videos');
      }

      // Note: Instagram media URL handling not implemented yet
      throw new Error('Instagram media URL handling not implemented yet');
    } catch (error) {
      return {
        platform: 'instagram',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async createInstagramMediaContainer(igUserId: string, token: string, mediaFile: File, caption: string, isVideo: boolean): Promise<any> {
    // First upload media to a temporary URL (in production, you'd use your own storage)
    const mediaUrl = await this.uploadMediaToTemporaryStorage(mediaFile);
    
    const mediaData: any = {
      caption,
      access_token: token
    };

    if (isVideo) {
      mediaData.media_type = 'REELS';
      mediaData.video_url = mediaUrl;
    } else {
      mediaData.image_url = mediaUrl;
    }

    const response = await fetch(`https://graph.facebook.com/v18.0/${igUserId}/media`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mediaData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Instagram media creation error: ${errorData.error?.message || 'Unknown error'}`);
    }

    return await response.json();
  }

  private async waitForInstagramProcessing(igUserId: string, token: string, containerId: string): Promise<void> {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const response = await fetch(`https://graph.facebook.com/v18.0/${containerId}?fields=status_code&access_token=${token}`);
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.status_code === 'FINISHED') {
          return;
        } else if (result.status_code === 'ERROR') {
          throw new Error('Instagram media processing failed');
        }
      }

      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    throw new Error('Instagram media processing timeout');
  }

  private async publishInstagramMedia(igUserId: string, token: string, containerId: string): Promise<any> {
    const response = await fetch(`https://graph.facebook.com/v18.0/${igUserId}/media_publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: token
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Instagram publish error: ${errorData.error?.message || 'Unknown error'}`);
    }

    return await response.json();
  }

  private async uploadMediaToTemporaryStorage(file: File): Promise<string> {
    // In production, upload to your own storage service
    // For now, return a placeholder URL
    return 'https://example.com/temp-media/' + Date.now();
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
              // For OAuth 1.0a accounts, we need to make a signed request
              if (account.token_secret) {
                try {
                  await this.makeTwitterOAuth1aRequest(
                    'GET',
                    'https://api.twitter.com/1.1/account/verify_credentials.json',
                    {},
                    account.access_token,
                    account.token_secret
                  );
                  isValid = true;
                } catch {
                  isValid = false;
                }
              } else {
                // OAuth 2.0 validation
                const twitterResponse = await fetch('https://api.twitter.com/2/users/me', {
                  headers: { 'Authorization': `Bearer ${account.access_token}` }
                });
                isValid = twitterResponse.ok;
              }
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

  private async postToYouTube(account: SocialAccount, post: ScheduledPost): Promise<PostingResult> {
    try {
      if (!post.media_urls || post.media_urls.length === 0) {
        throw new Error('YouTube requires video content');
      }

      // Note: YouTube video URL handling not implemented yet
      throw new Error('YouTube video URL handling not implemented yet');

      // Create video metadata
      const metadata = {
        snippet: {
          title: post.content.substring(0, 100) || 'Untitled Video',
          description: post.content,
          tags: [],
          categoryId: '22', // People & Blogs
          defaultLanguage: 'en'
        },
        status: {
          privacyStatus: 'public',
          embeddable: true,
          license: 'youtube'
        }
      };

      // Note: YouTube video upload not implemented for URL handling
      return {
        platform: 'youtube',
        success: false,
        error: 'YouTube video upload not implemented yet'
      };
    } catch (error) {
      return {
        platform: 'youtube',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async uploadYouTubeVideo(accessToken: string, videoFile: File, metadata: any): Promise<any> {
    // Create multipart form data
    const boundary = '-------314159265358979323846';
    const delimiter = '\r\n--' + boundary + '\r\n';
    const close_delim = '\r\n--' + boundary + '--';

    // Create metadata part
    const metadataPart = delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata);

    // Create video part
    const videoPart = delimiter +
      'Content-Type: ' + videoFile.type + '\r\n\r\n';

    // Convert file to array buffer
    const videoBuffer = await videoFile.arrayBuffer();

    // Combine all parts
    const multipartRequestBody = new Uint8Array(
      new TextEncoder().encode(metadataPart + videoPart).length + 
      videoBuffer.byteLength + 
      new TextEncoder().encode(close_delim).length
    );

    let offset = 0;
    const metadataBytes = new TextEncoder().encode(metadataPart + videoPart);
    multipartRequestBody.set(metadataBytes, offset);
    offset += metadataBytes.length;

    multipartRequestBody.set(new Uint8Array(videoBuffer), offset);
    offset += videoBuffer.byteLength;

    const closeBytes = new TextEncoder().encode(close_delim);
    multipartRequestBody.set(closeBytes, offset);

    // Upload to YouTube
    const response = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`
      },
      body: multipartRequestBody
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`YouTube upload error: ${response.status} - ${errorData}`);
    }

    return await response.json();
  }
}

export const productionPostingService = ProductionPostingService.getInstance();
