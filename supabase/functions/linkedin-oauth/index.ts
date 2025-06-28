import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check required environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const linkedinClientId = Deno.env.get('LINKEDIN_CLIENT_ID');
    const linkedinClientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET');

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseAnonKey: !!supabaseAnonKey,
      hasLinkedInClientId: !!linkedinClientId,
      hasLinkedInClientSecret: !!linkedinClientSecret
    });

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!linkedinClientId || !linkedinClientSecret) {
      throw new Error('Missing LinkedIn OAuth credentials. Please configure LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in your Supabase project secrets.');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (userError || !user) {
      console.error('User authentication error:', userError);
      throw new Error('Unauthorized - invalid or expired token');
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const action = pathParts[pathParts.length - 1];

    console.log('Processing action:', action, 'for user:', user.id);

    if (req.method === 'POST') {
      const body = await req.json();
      if (body.action === 'initiate') {
        return await initiateLinkedInAuth(supabaseClient, user.id, supabaseUrl, linkedinClientId);
      }
    }

    if (action === 'callback') {
      return await handleLinkedInCallback(req, supabaseClient, supabaseUrl, linkedinClientId, linkedinClientSecret);
    }

    return new Response(JSON.stringify({ error: 'Invalid action or method' }), {
      status: 404, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('LinkedIn OAuth error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Check that LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET are configured in your Supabase project secrets'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function initiateLinkedInAuth(supabaseClient: any, userId: string, supabaseUrl: string, clientId: string) {
  const stateToken = crypto.randomUUID();
  const redirectUri = `${supabaseUrl}/functions/v1/linkedin-oauth/callback`;
  
  console.log('Initiating LinkedIn auth for user:', userId, 'with redirect:', redirectUri);
  
  // Store state in database
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

  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', stateToken);
  authUrl.searchParams.set('scope', 'openid profile email w_member_social');

  console.log('Generated auth URL:', authUrl.toString());

  return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleLinkedInCallback(req: Request, supabaseClient: any, supabaseUrl: string, clientId: string, clientSecret: string) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  console.log('LinkedIn callback received:', { hasCode: !!code, hasState: !!state, error });

  if (error) {
    const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent(`LinkedIn OAuth error: ${error}`)}`;
    return new Response(null, {
      status: 302,
      headers: { 'Location': redirectUrl },
    });
  }

  if (!code || !state) {
    const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Missing code or state parameter')}`;
    return new Response(null, {
      status: 302,
      headers: { 'Location': redirectUrl },
    });
  }

  try {
    // Verify state
    const { data: stateRecord, error: stateError } = await supabaseClient
      .from('oauth_states')
      .select('*')
      .eq('state_token', state)
      .eq('platform', 'linkedin')
      .single();

    if (stateError || !stateRecord) {
      console.error('Invalid state parameter:', stateError);
      const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Invalid state parameter')}`;
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    }

    // Exchange code for token
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
      console.error('LinkedIn token exchange failed:', errorText);
      const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Failed to exchange code for token')}`;
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    }

    const tokenData = await tokenResponse.json();

    // Get user profile
    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('LinkedIn profile fetch failed:', errorText);
      const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Failed to fetch user profile')}`;
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    }

    const profile = await profileResponse.json();

    // Store social account
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
      }, {
        onConflict: 'user_id,platform,platform_user_id'
      });

    if (upsertError) {
      console.error('Failed to store social account:', upsertError);
      const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Failed to save account information')}`;
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    }

    // Clean up state
    await supabaseClient
      .from('oauth_states')
      .delete()
      .eq('id', stateRecord.id);

    // Redirect to frontend with success
    return new Response(null, {
      status: 302,
      headers: {
        'Location': stateRecord.redirect_url + '?success=linkedin',
      },
    });

  } catch (error) {
    console.error('LinkedIn callback error:', error);
    const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent(error.message)}`;
    return new Response(null, {
      status: 302,
      headers: { 'Location': redirectUrl },
    });
  }
}