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
    const linkedinClientId = Deno.env.get('LINKEDIN_CLIENT_ID');
    const linkedinClientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET');

    console.log('LinkedIn OAuth Environment Check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseAnonKey: !!supabaseAnonKey,
      hasLinkedInClientId: !!linkedinClientId,
      hasLinkedInClientSecret: !!linkedinClientSecret,
      method: req.method,
      url: req.url
    });

    // Validate required environment variables
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!linkedinClientId || !linkedinClientSecret) {
      console.error('Missing LinkedIn credentials');
      throw new Error('LinkedIn OAuth credentials not configured. Please set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in your Supabase project secrets.');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    // Parse URL to determine action
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const action = pathParts[pathParts.length - 1];

    console.log('Processing LinkedIn OAuth action:', action);

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

          return await initiateLinkedInAuth(supabaseClient, user.id, supabaseUrl, linkedinClientId);
        }
      } catch (parseError) {
        console.error('Error parsing POST body:', parseError);
        throw new Error('Invalid request body');
      }
    }

    // Handle callback (GET request from LinkedIn)
    if (req.method === 'GET' && action === 'callback') {
      return await handleLinkedInCallback(req, supabaseClient, supabaseUrl, linkedinClientId, linkedinClientSecret);
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
    console.error('LinkedIn OAuth error:', error);
    
    // Return detailed error information for debugging
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Ensure LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET are configured in Supabase project secrets',
      timestamp: new Date().toISOString()
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function initiateLinkedInAuth(supabaseClient: any, userId: string, supabaseUrl: string, clientId: string) {
  try {
    const stateToken = crypto.randomUUID();
    const redirectUri = `${supabaseUrl}/functions/v1/linkedin-oauth/callback`;
    
    console.log('Initiating LinkedIn auth:', {
      userId,
      redirectUri,
      stateToken: stateToken.substring(0, 8) + '...'
    });
    
    // Store OAuth state in database for security
    const { error: insertError } = await supabaseClient
      .from('oauth_states')
      .insert({
        state_token: stateToken,
        platform: 'linkedin',
        user_id: userId,
        redirect_url: `${new URL(supabaseUrl).origin}/accounts`
      });

    if (insertError) {
      console.error('Failed to store OAuth state:', insertError);
      throw new Error('Failed to initialize OAuth flow');
    }

    // Build LinkedIn authorization URL
    const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', stateToken);
    authUrl.searchParams.set('scope', 'openid profile email w_member_social');

    console.log('Generated LinkedIn auth URL:', authUrl.toString());

    return new Response(JSON.stringify({ 
      authUrl: authUrl.toString(),
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in initiateLinkedInAuth:', error);
    throw error;
  }
}

async function handleLinkedInCallback(req: Request, supabaseClient: any, supabaseUrl: string, clientId: string, clientSecret: string) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  console.log('LinkedIn callback received:', { 
    hasCode: !!code, 
    hasState: !!state, 
    error,
    errorDescription
  });

  // Handle OAuth errors from LinkedIn
  if (error) {
    const errorMsg = errorDescription || error;
    console.error('LinkedIn OAuth error:', errorMsg);
    const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent(`LinkedIn OAuth error: ${errorMsg}`)}`;
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
      .eq('platform', 'linkedin')
      .single();

    if (stateError || !stateRecord) {
      console.error('Invalid state parameter:', stateError);
      const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Invalid or expired state parameter')}`;
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${supabaseUrl}/functions/v1/linkedin-oauth/callback`,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('LinkedIn token exchange failed:', {
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
    console.log('LinkedIn token exchange successful');

    // Fetch user profile from LinkedIn API
    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('LinkedIn profile fetch failed:', {
        status: profileResponse.status,
        statusText: profileResponse.statusText,
        error: errorText
      });
      const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Failed to fetch LinkedIn profile')}`;
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    }

    const profile = await profileResponse.json();
    console.log('LinkedIn profile fetched successfully:', {
      sub: profile.sub,
      name: profile.name,
      email: profile.email
    });

    // Store social account in database
    const { error: upsertError } = await supabaseClient
      .from('social_accounts')
      .upsert({
        user_id: stateRecord.user_id,
        platform: 'linkedin',
        platform_user_id: profile.sub,
        name: profile.name,
        username: profile.email?.split('@')[0] || profile.sub,
        email: profile.email,
        profile_image: profile.picture,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,platform,platform_user_id'
      });

    if (upsertError) {
      console.error('Failed to store LinkedIn account:', upsertError);
      const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Failed to save LinkedIn account information')}`;
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    }

    console.log('LinkedIn account stored successfully');

    // Clean up OAuth state
    await supabaseClient
      .from('oauth_states')
      .delete()
      .eq('id', stateRecord.id);

    // Redirect back to frontend with success
    return new Response(null, {
      status: 302,
      headers: {
        'Location': stateRecord.redirect_url + '?success=linkedin',
      },
    });

  } catch (error) {
    console.error('LinkedIn callback processing error:', error);
    const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent(`LinkedIn connection failed: ${error.message}`)}`;
    return new Response(null, {
      status: 302,
      headers: { 'Location': redirectUrl },
    });
  }
}