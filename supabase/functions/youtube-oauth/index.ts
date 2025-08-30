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
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    console.log('YouTube OAuth Environment Check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseAnonKey: !!supabaseAnonKey,
      hasGoogleClientId: !!googleClientId,
      hasGoogleClientSecret: !!googleClientSecret,
      method: req.method,
      url: req.url
    });

    // Validate required environment variables
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!googleClientId || !googleClientSecret) {
      console.error('Missing Google credentials');
      throw new Error('Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your Supabase project secrets.');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    // Parse URL to determine action
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const action = pathParts[pathParts.length - 1];

    console.log('Processing YouTube OAuth action:', action);

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

          return await initiateYouTubeAuth(supabaseClient, user.id, supabaseUrl, googleClientId);
        }
      } catch (parseError) {
        console.error('Error parsing POST body:', parseError);
        throw new Error('Invalid request body');
      }
    }

    // Handle callback (GET request from Google)
    if (req.method === 'GET' && action === 'callback') {
      return await handleYouTubeCallback(req, supabaseClient, supabaseUrl, googleClientId, googleClientSecret);
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
    console.error('YouTube OAuth error:', error);
    
    // Return detailed error information for debugging
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured in Supabase project secrets',
      timestamp: new Date().toISOString()
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function initiateYouTubeAuth(supabaseClient: any, userId: string, supabaseUrl: string, clientId: string) {
  try {
    const stateToken = crypto.randomUUID();
    const redirectUri = `${supabaseUrl}/functions/v1/youtube-oauth/callback`;
    
    console.log('Initiating YouTube auth:', {
      userId,
      redirectUri,
      stateToken: stateToken.substring(0, 8) + '...'
    });
    
    // Store OAuth state in database for security
    const { error: insertError } = await supabaseClient
      .from('oauth_states')
      .insert({
        state_token: stateToken,
        platform: 'youtube',
        user_id: userId,
        redirect_url: `${new URL(supabaseUrl).origin}/accounts`
      });

    if (insertError) {
      console.error('Failed to store OAuth state:', insertError);
      throw new Error('Failed to initialize OAuth flow');
    }

    // Build Google OAuth authorization URL for YouTube
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/userinfo.profile');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('state', stateToken);
    authUrl.searchParams.set('prompt', 'consent');

    console.log('Generated YouTube auth URL:', authUrl.toString());

    return new Response(JSON.stringify({ 
      authUrl: authUrl.toString(),
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in initiateYouTubeAuth:', error);
    throw error;
  }
}

async function handleYouTubeCallback(req: Request, supabaseClient: any, supabaseUrl: string, clientId: string, clientSecret: string) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  console.log('YouTube callback received:', { 
    hasCode: !!code, 
    hasState: !!state, 
    error
  });

  // Handle OAuth errors from Google
  if (error) {
    console.error('YouTube OAuth error:', error);
    const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent(`YouTube OAuth error: ${error}`)}`;
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
      .eq('platform', 'youtube')
      .single();

    if (stateError || !stateRecord) {
      console.error('Invalid state parameter:', stateError);
      const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Invalid or expired state parameter')}`;
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    }

    const redirectUri = `${supabaseUrl}/functions/v1/youtube-oauth/callback`;

    // Exchange authorization code for access token and refresh token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('YouTube token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText
      });
      const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Failed to exchange authorization code for access token')}`;
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    }

    const tokenData = await tokenResponse.json();
    console.log('YouTube token exchange successful');

    // Get YouTube channel information
    const channelResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    if (!channelResponse.ok) {
      const errorText = await channelResponse.text();
      console.error('YouTube channel fetch failed:', {
        status: channelResponse.status,
        statusText: channelResponse.statusText,
        error: errorText
      });
      const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Failed to fetch YouTube channel information')}`;
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    }

    const channelData = await channelResponse.json();
    
    if (!channelData.items || channelData.items.length === 0) {
      const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('No YouTube channel found for this account')}`;
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    }

    const channel = channelData.items[0];
    console.log('YouTube channel fetched successfully:', {
      id: channel.id,
      title: channel.snippet.title
    });

    // Store social account in database
    const { error: upsertError } = await supabaseClient
      .from('social_accounts')
      .upsert({
        user_id: stateRecord.user_id,
        platform: 'youtube',
        platform_user_id: channel.id,
        name: channel.snippet.title,
        username: channel.snippet.customUrl || channel.snippet.title,
        profile_image: channel.snippet.thumbnails?.default?.url,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
        is_active: true,
        metadata: {
          channel_id: channel.id,
          custom_url: channel.snippet.customUrl,
          description: channel.snippet.description
        }
      }, {
        onConflict: 'user_id,platform,platform_user_id'
      });

    if (upsertError) {
      console.error('Failed to store YouTube account:', upsertError);
      const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Failed to save YouTube account information')}`;
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    }

    console.log('YouTube account stored successfully');

    // Clean up OAuth state
    await supabaseClient
      .from('oauth_states')
      .delete()
      .eq('id', stateRecord.id);

    // Redirect back to frontend with success
    return new Response(null, {
      status: 302,
      headers: {
        'Location': stateRecord.redirect_url + '?success=youtube',
      },
    });

  } catch (error) {
    console.error('YouTube callback processing error:', error);
    const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent(`YouTube connection failed: ${error.message}`)}`;
    return new Response(null, {
      status: 302,
      headers: { 'Location': redirectUrl },
    });
  }
}