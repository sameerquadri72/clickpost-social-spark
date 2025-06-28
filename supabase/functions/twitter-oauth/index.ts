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
    // Environment variables validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const twitterClientId = Deno.env.get('TWITTER_CLIENT_ID');
    const twitterClientSecret = Deno.env.get('TWITTER_CLIENT_SECRET');

    console.log('Twitter OAuth Environment Check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseAnonKey: !!supabaseAnonKey,
      hasTwitterClientId: !!twitterClientId,
      hasTwitterClientSecret: !!twitterClientSecret,
      method: req.method,
      url: req.url
    });

    // Validate required environment variables
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!twitterClientId || !twitterClientSecret) {
      console.error('Missing Twitter credentials');
      throw new Error('Twitter OAuth credentials not configured. Please set TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET in your Supabase project secrets.');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    // Parse URL to determine action
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const action = pathParts[pathParts.length - 1];

    console.log('Processing Twitter OAuth action:', action);

    // Handle initiation (POST request from frontend)
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        console.log('POST body:', body);
        
        if (body.action === 'initiate') {
          // Validate authorization header
          const authHeader = req.headers.get('Authorization');
          if (!authHeader) {
            throw new Error('Missing authorization header');
          }

          const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
          
          if (userError || !user) {
            console.error('User authentication error:', userError);
            throw new Error('Unauthorized - invalid or expired token');
          }

          return await initiateTwitterAuth(supabaseClient, user.id, supabaseUrl, twitterClientId);
        }
      } catch (parseError) {
        console.error('Error parsing POST body:', parseError);
        throw new Error('Invalid request body');
      }
    }

    // Handle callback (GET request from Twitter)
    if (req.method === 'GET' && action === 'callback') {
      return await handleTwitterCallback(req, supabaseClient, supabaseUrl, twitterClientId, twitterClientSecret);
    }

    // Invalid action or method
    return new Response(JSON.stringify({ 
      error: 'Invalid action or method',
      method: req.method,
      action: action
    }), {
      status: 404, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Twitter OAuth error:', error);
    
    // Return detailed error information for debugging
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Ensure TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET are configured in Supabase project secrets',
      timestamp: new Date().toISOString()
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function initiateTwitterAuth(supabaseClient: any, userId: string, supabaseUrl: string, clientId: string) {
  try {
    // Twitter OAuth 2.0 PKCE flow
    const stateToken = crypto.randomUUID();
    const codeVerifier = crypto.randomUUID() + crypto.randomUUID();
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const redirectUri = `${supabaseUrl}/functions/v1/twitter-oauth/callback`;
    
    console.log('Initiating Twitter auth:', {
      userId,
      redirectUri,
      stateToken: stateToken.substring(0, 8) + '...'
    });
    
    // Store OAuth state in database for security
    const { error: insertError } = await supabaseClient
      .from('oauth_states')
      .insert({
        state_token: stateToken,
        platform: 'twitter',
        user_id: userId,
        redirect_url: `${new URL(supabaseUrl).origin}/accounts`,
        oauth_token_secret: codeVerifier // Store code verifier
      });

    if (insertError) {
      console.error('Failed to store OAuth state:', insertError);
      throw new Error('Failed to initialize OAuth flow');
    }

    // Build Twitter authorization URL
    const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'tweet.read tweet.write users.read offline.access');
    authUrl.searchParams.set('state', stateToken);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    console.log('Generated Twitter auth URL:', authUrl.toString());

    return new Response(JSON.stringify({ 
      authUrl: authUrl.toString(),
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in initiateTwitterAuth:', error);
    throw error;
  }
}

async function handleTwitterCallback(req: Request, supabaseClient: any, supabaseUrl: string, clientId: string, clientSecret: string) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  console.log('Twitter callback received:', { 
    hasCode: !!code, 
    hasState: !!state, 
    error,
    errorDescription
  });

  // Handle OAuth errors from Twitter
  if (error) {
    const errorMsg = errorDescription || error;
    console.error('Twitter OAuth error:', errorMsg);
    const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent(`Twitter OAuth error: ${errorMsg}`)}`;
    return new Response(null, {
      status: 302,
      headers: { 'Location': redirectUrl },
    });
  }

  // Validate required parameters
  if (!code || !state) {
    console.error('Missing required parameters:', { code: !!code, state: !!state });
    const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Missing authorization code or state parameter')}`;
    return new Response(null, {
      status: 302,
      headers: { 'Location': redirectUrl },
    });
  }

  try {
    // Verify state parameter for security
    const { data: stateRecord, error: stateError } = await supabaseClient
      .from('oauth_states')
      .select('*')
      .eq('state_token', state)
      .eq('platform', 'twitter')
      .single();

    if (stateError || !stateRecord) {
      console.error('Invalid state parameter:', stateError);
      const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Invalid or expired state parameter')}`;
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    }

    const redirectUri = `${supabaseUrl}/functions/v1/twitter-oauth/callback`;

    // Exchange code for token
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: stateRecord.oauth_token_secret, // Use stored code verifier
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Twitter token exchange error:', errorText);
      const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Failed to exchange authorization code for access token')}`;
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    }

    const tokenData = await tokenResponse.json();

    // Get user profile
    const profileResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('Twitter profile fetch error:', errorText);
      const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Failed to fetch Twitter profile')}`;
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    }

    const profileData = await profileResponse.json();
    const profile = profileData.data;

    // Store social account
    const { error: upsertError } = await supabaseClient
      .from('social_accounts')
      .upsert({
        user_id: stateRecord.user_id,
        platform: 'twitter',
        platform_user_id: profile.id,
        name: profile.name,
        username: profile.username,
        profile_image: profile.profile_image_url,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
        is_active: true,
      }, {
        onConflict: 'user_id,platform,platform_user_id'
      });

    if (upsertError) {
      console.error('Failed to store Twitter account:', upsertError);
      const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Failed to save Twitter account information')}`;
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

    // Redirect back to frontend with success
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