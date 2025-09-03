import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PostData {
  content: string
  mediaUrls?: string[]
  accountIds: string[]
}

interface PostingResult {
  platform: string
  success: boolean
  postId?: string
  error?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Verify user authentication
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { content, mediaUrls = [], accountIds }: PostData = await req.json();

    // Get the specified social accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select('*')
      .in('id', accountIds)
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (accountsError || !accounts) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch accounts' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: PostingResult[] = [];

    // Post to each selected account
    for (const account of accounts) {
      try {
        let result: PostingResult;

        switch (account.platform) {
          case 'linkedin':
            result = await postToLinkedIn(account, content, mediaUrls);
            break;
          case 'facebook':
            result = await postToFacebook(account, content, mediaUrls);
            break;
          case 'twitter':
            result = await postToTwitter(account, content, mediaUrls);
            break;
          case 'youtube':
            result = await postToYouTube(account, content, mediaUrls);
            break;
          default:
            result = {
              platform: account.platform,
              success: false,
              error: 'Unsupported platform'
            };
        }

        results.push(result);
        console.log(`Posting result for ${account.platform}:`, result);

      } catch (error) {
        console.error(`Error posting to ${account.platform}:`, error);
        results.push({
          platform: account.platform,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Post to social error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function postToLinkedIn(account: any, content: string, mediaUrls: string[]): Promise<PostingResult> {
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
            text: content
          },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

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

async function postToFacebook(account: any, content: string, mediaUrls: string[]): Promise<PostingResult> {
  try {
    const token = account.page_access_token || account.access_token;
    const pageId = account.metadata?.page_id || 'me';

    const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: content,
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

async function postToTwitter(account: any, content: string, mediaUrls: string[]): Promise<PostingResult> {
  try {
    // Check if this is an OAuth 1.0a account (has token_secret)
    if (!account.token_secret) {
      throw new Error('Twitter account missing OAuth 1.0a credentials');
    }

    // Get Twitter API credentials from environment
    const consumerKey = Deno.env.get('TWITTER_CONSUMER_KEY');
    const consumerSecret = Deno.env.get('TWITTER_CONSUMER_SECRET');

    if (!consumerKey || !consumerSecret) {
      throw new Error('Twitter API credentials not configured');
    }

    // Create tweet data
    const tweetData = { text: content };

    // Generate OAuth signature and headers
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

    const signature = await generateOAuthSignature(
      'POST',
      'https://api.twitter.com/2/tweets',
      oauthParams,
      consumerSecret,
      account.token_secret
    );

    oauthParams.oauth_signature = signature;

    const authHeader = 'OAuth ' + Object.keys(oauthParams)
      .sort()
      .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
      .join(', ');

    // Post to Twitter
    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tweetData)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Twitter API error: ${response.status} - ${errorData}`);
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

async function postToYouTube(account: any, content: string, mediaUrls: string[]): Promise<PostingResult> {
  // YouTube posting typically requires video uploads
  // For now, return not implemented
  return {
    platform: 'youtube',
    success: false,
    error: 'YouTube posting not implemented yet'
  };
}

async function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): Promise<string> {
  const signatureBaseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(
    Object.entries(params)
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join('&')
  )}`;

  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  
  const encoder = new TextEncoder();
  const keyBuffer = encoder.encode(signingKey);
  const dataBuffer = encoder.encode(signatureBaseString);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
  const signatureArray = new Uint8Array(signature);
  
  return btoa(String.fromCharCode(...signatureArray));
}