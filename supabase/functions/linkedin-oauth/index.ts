import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check required environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const linkedinClientId = Deno.env.get('LINKEDIN_CLIENT_ID');
    const linkedinClientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET');

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

    const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (!user) {
      throw new Error('Unauthorized - invalid or expired token');
    }

    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    switch (action) {
      case 'initiate':
        return await initiateLinkedInAuth(supabaseClient, user.id, supabaseUrl, linkedinClientId);
      case 'callback':
        return await handleLinkedInCallback(req, supabaseClient, user.id, supabaseUrl, linkedinClientId, linkedinClientSecret);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
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

  return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleLinkedInCallback(req: Request, supabaseClient: any, userId: string, supabaseUrl: string, clientId: string, clientSecret: string) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    throw new Error(`LinkedIn OAuth error: ${error}`);
  }

  if (!code || !state) {
    throw new Error('Missing code or state parameter');
  }

  // Verify state
  const { data: stateRecord } = await supabaseClient
    .from('oauth_states')
    .select('*')
    .eq('state_token', state)
    .eq('user_id', userId)
    .eq('platform', 'linkedin')
    .single();

  if (!stateRecord) {
    throw new Error('Invalid state parameter');
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
    throw new Error('Failed to exchange code for token');
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
    throw new Error('Failed to fetch user profile');
  }

  const profile = await profileResponse.json();

  // Store social account
  const { error: upsertError } = await supabaseClient
    .from('social_accounts')
    .upsert({
      user_id: userId,
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
    });

  if (upsertError) {
    console.error('Failed to store social account:', upsertError);
    throw new Error('Failed to save account information');
  }

  // Clean up state
  await supabaseClient
    .from('oauth_states')
    .delete()
    .eq('id', stateRecord.id);

  // Redirect to frontend
  return new Response(null, {
    status: 302,
    headers: {
      'Location': stateRecord.redirect_url + '?success=linkedin',
    },
  });
}