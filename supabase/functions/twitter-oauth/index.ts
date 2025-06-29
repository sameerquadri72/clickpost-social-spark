import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const twitterConsumerKey = Deno.env.get('TWITTER_CONSUMER_KEY');
    const twitterConsumerSecret = Deno.env.get('TWITTER_CONSUMER_SECRET');

    console.log('Twitter OAuth 1.0a Environment Check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseAnonKey: !!supabaseAnonKey,
      hasTwitterConsumerKey: !!twitterConsumerKey,
      hasTwitterConsumerSecret: !!twitterConsumerSecret,
      method: req.method,
      url: req.url
    });

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!twitterConsumerKey || !twitterConsumerSecret) {
      console.error('Missing Twitter OAuth 1.0a credentials');
      throw new Error('Twitter OAuth 1.0a credentials not configured. Please set TWITTER_CONSUMER_KEY and TWITTER_CONSUMER_SECRET in your Supabase project secrets.');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const action = pathParts[pathParts.length - 1];

    console.log('Processing Twitter OAuth 1.0a action:', action);

    // Handle login initiation (equivalent to /api/twitter/login)
    if (req.method === 'POST' && action === 'index') {
      const body = await req.json();
      if (body.action === 'initiate') {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
          throw new Error('Missing authorization header');
        }

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
        
        if (userError || !user) {
          console.error('User authentication error:', userError);
          throw new Error('Unauthorized - invalid or expired token');
        }

        return await initiateTwitterOAuth1a(supabaseClient, user.id, supabaseUrl, twitterConsumerKey, twitterConsumerSecret);
      }
    }

    // Handle callback (equivalent to /api/twitter/callback)
    if (req.method === 'GET' && action === 'callback') {
      return await handleTwitterCallback(req, supabaseClient, supabaseUrl, twitterConsumerKey, twitterConsumerSecret);
    }

    return new Response(JSON.stringify({ 
      error: 'Invalid action or method',
      method: req.method,
      action: action
    }), {
      status: 404, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Twitter OAuth 1.0a error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Ensure TWITTER_CONSUMER_KEY and TWITTER_CONSUMER_SECRET are configured in Supabase project secrets',
      timestamp: new Date().toISOString()
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Deno-compatible HMAC-SHA1 function using Web Crypto API
async function generateHmacSha1(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const dataToSign = encoder.encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataToSign);
  const signatureArray = new Uint8Array(signature);
  
  // Convert to base64
  let binary = '';
  for (let i = 0; i < signatureArray.byteLength; i++) {
    binary += String.fromCharCode(signatureArray[i]);
  }
  return btoa(binary);
}

// OAuth 1.0a signature generation
async function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string = ''
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
  const signature = await generateHmacSha1(signingKey, signatureBaseString);

  return signature;
}

// Generate OAuth 1.0a authorization header
async function generateOAuthHeader(
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
  additionalParams: Record<string, string> = {},
  tokenSecret: string = ''
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID().replace(/-/g, '');

  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_version: '1.0',
    ...additionalParams
  };

  const signature = await generateOAuthSignature(method, url, oauthParams, consumerSecret, tokenSecret);
  oauthParams.oauth_signature = signature;

  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');

  return authHeader;
}

async function initiateTwitterOAuth1a(
  supabaseClient: any, 
  userId: string, 
  supabaseUrl: string, 
  consumerKey: string, 
  consumerSecret: string
) {
  try {
    const callbackUrl = `${supabaseUrl}/functions/v1/twitter-oauth/callback`;
    
    // Step 1: Get request token from Twitter
    const requestTokenUrl = 'https://api.twitter.com/oauth/request_token';
    const authHeader = await generateOAuthHeader(
      'POST',
      requestTokenUrl,
      consumerKey,
      consumerSecret,
      { oauth_callback: callbackUrl }
    );

    console.log('Requesting Twitter request token...');
    
    const requestTokenResponse = await fetch(requestTokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!requestTokenResponse.ok) {
      const errorText = await requestTokenResponse.text();
      console.error('Twitter request token error:', errorText);
      throw new Error(`Failed to get request token: ${errorText}`);
    }

    const requestTokenData = await requestTokenResponse.text();
    const params = new URLSearchParams(requestTokenData);
    const oauthToken = params.get('oauth_token');
    const oauthTokenSecret = params.get('oauth_token_secret');
    const oauthCallbackConfirmed = params.get('oauth_callback_confirmed');

    if (!oauthToken || !oauthTokenSecret || oauthCallbackConfirmed !== 'true') {
      throw new Error('Invalid request token response from Twitter');
    }

    console.log('Request token obtained successfully');

    // Store the request token and secret in database
    const { error: insertError } = await supabaseClient
      .from('oauth_states')
      .insert({
        state_token: oauthToken,
        platform: 'twitter',
        user_id: userId,
        redirect_url: `${new URL(supabaseUrl).origin}/accounts`,
        oauth_token_secret: oauthTokenSecret
      });

    if (insertError) {
      console.error('Failed to store OAuth state:', insertError);
      throw new Error('Failed to store OAuth state');
    }

    // Step 2: Redirect user to Twitter authorization
    const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}`;

    console.log('Generated Twitter auth URL:', authUrl);

    return new Response(JSON.stringify({ 
      authUrl: authUrl,
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in initiateTwitterOAuth1a:', error);
    throw error;
  }
}

async function handleTwitterCallback(
  req: Request, 
  supabaseClient: any, 
  supabaseUrl: string, 
  consumerKey: string, 
  consumerSecret: string
) {
  const url = new URL(req.url);
  const oauthToken = url.searchParams.get('oauth_token');
  const oauthVerifier = url.searchParams.get('oauth_verifier');
  const denied = url.searchParams.get('denied');

  console.log('Twitter callback received:', { 
    hasOauthToken: !!oauthToken, 
    hasOauthVerifier: !!oauthVerifier,
    denied
  });

  // Handle user denial
  if (denied) {
    console.log('User denied Twitter authorization');
    const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Twitter authorization was denied')}`;
    return new Response(null, {
      status: 302,
      headers: { 'Location': redirectUrl },
    });
  }

  if (!oauthToken || !oauthVerifier) {
    console.error('Missing required parameters:', { oauthToken: !!oauthToken, oauthVerifier: !!oauthVerifier });
    const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Missing OAuth parameters')}`;
    return new Response(null, {
      status: 302,
      headers: { 'Location': redirectUrl },
    });
  }

  try {
    // Retrieve stored request token secret
    const { data: stateRecord, error: stateError } = await supabaseClient
      .from('oauth_states')
      .select('*')
      .eq('state_token', oauthToken)
      .eq('platform', 'twitter')
      .single();

    if (stateError || !stateRecord) {
      console.error('Invalid OAuth token:', stateError);
      const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Invalid or expired OAuth token')}`;
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    }

    const oauthTokenSecret = stateRecord.oauth_token_secret;

    // Step 3: Exchange request token for access token
    const accessTokenUrl = 'https://api.twitter.com/oauth/access_token';
    const authHeader = await generateOAuthHeader(
      'POST',
      accessTokenUrl,
      consumerKey,
      consumerSecret,
      { 
        oauth_token: oauthToken,
        oauth_verifier: oauthVerifier
      },
      oauthTokenSecret
    );

    console.log('Exchanging request token for access token...');

    const accessTokenResponse = await fetch(accessTokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!accessTokenResponse.ok) {
      const errorText = await accessTokenResponse.text();
      console.error('Twitter access token error:', errorText);
      const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Failed to get access token')}`;
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    }

    const accessTokenData = await accessTokenResponse.text();
    const accessParams = new URLSearchParams(accessTokenData);
    const accessToken = accessParams.get('oauth_token');
    const accessTokenSecret = accessParams.get('oauth_token_secret');
    const screenName = accessParams.get('screen_name');
    const userIdStr = accessParams.get('user_id');

    if (!accessToken || !accessTokenSecret || !screenName || !userIdStr) {
      throw new Error('Invalid access token response from Twitter');
    }

    console.log('Access token obtained successfully for user:', screenName);

    // Get user profile information
    const userShowUrl = 'https://api.twitter.com/1.1/users/show.json';
    const userParams = { screen_name: screenName };
    const userAuthHeader = await generateOAuthHeader(
      'GET',
      userShowUrl + '?' + new URLSearchParams(userParams).toString(),
      consumerKey,
      consumerSecret,
      { oauth_token: accessToken },
      accessTokenSecret
    );

    const userResponse = await fetch(userShowUrl + '?' + new URLSearchParams(userParams).toString(), {
      headers: {
        'Authorization': userAuthHeader
      }
    });

    let profileImageUrl = null;
    let name = screenName;

    if (userResponse.ok) {
      const userData = await userResponse.json();
      profileImageUrl = userData.profile_image_url_https;
      name = userData.name;
    }

    // Store social account in database
    const { error: upsertError } = await supabaseClient
      .from('social_accounts')
      .upsert({
        user_id: stateRecord.user_id,
        platform: 'twitter',
        platform_user_id: userIdStr,
        name: name,
        username: screenName,
        profile_image: profileImageUrl,
        access_token: accessToken,
        token_secret: accessTokenSecret,
        is_active: true,
        metadata: {
          oauth_version: '1.0a',
          screen_name: screenName
        }
      }, {
        onConflict: 'user_id,platform,platform_user_id'
      });

    if (upsertError) {
      console.error('Failed to store Twitter account:', upsertError);
      const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Failed to save Twitter account')}`;
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    }

    console.log('Twitter account stored successfully');

    // Clean up OAuth state
    await supabaseClient
      .from('oauth_states')
      .delete()
      .eq('id', stateRecord.id);

    // Redirect to success page
    return new Response(null, {
      status: 302,
      headers: {
        'Location': stateRecord.redirect_url + '?success=twitter',
      },
    });

  } catch (error) {
    console.error('Twitter callback processing error:', error);
    const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent(`Twitter connection failed: ${error.message}`)}`;
    return new Response(null, {
      status: 302,
      headers: { 'Location': redirectUrl },
    });
  }
}