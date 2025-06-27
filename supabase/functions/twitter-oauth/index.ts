
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    switch (action) {
      case 'initiate':
        return await initiateTwitterAuth(supabaseClient, user.id);
      case 'callback':
        return await handleTwitterCallback(req, supabaseClient, user.id);
      default:
        return new Response('Not found', { status: 404, headers: corsHeaders });
    }
  } catch (error) {
    console.error('Twitter OAuth error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function initiateTwitterAuth(supabaseClient: any, userId: string) {
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

  const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/twitter-oauth/callback`;
  
  await supabaseClient
    .from('oauth_states')
    .insert({
      state_token: stateToken,
      platform: 'twitter',
      user_id: userId,
      redirect_url: `${new URL(Deno.env.get('SUPABASE_URL') || '').origin}/accounts`,
      oauth_token_secret: codeVerifier // Store code verifier
    });

  const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', Deno.env.get('TWITTER_CLIENT_ID') || '');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'tweet.read tweet.write users.read offline.access');
  authUrl.searchParams.set('state', stateToken);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleTwitterCallback(req: Request, supabaseClient: any, userId: string) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    throw new Error('Missing code or state parameter');
  }

  // Verify state and get code verifier
  const { data: stateRecord } = await supabaseClient
    .from('oauth_states')
    .select('*')
    .eq('state_token', state)
    .eq('user_id', userId)
    .eq('platform', 'twitter')
    .single();

  if (!stateRecord) {
    throw new Error('Invalid state parameter');
  }

  const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/twitter-oauth/callback`;

  // Exchange code for token
  const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${Deno.env.get('TWITTER_CLIENT_ID')}:${Deno.env.get('TWITTER_CLIENT_SECRET')}`)}`,
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
    throw new Error('Failed to exchange code for token');
  }

  const tokenData = await tokenResponse.json();

  // Get user profile
  const profileResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url', {
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
    },
  });

  if (!profileResponse.ok) {
    throw new Error('Failed to fetch user profile');
  }

  const profileData = await profileResponse.json();
  const profile = profileData.data;

  // Store social account
  await supabaseClient
    .from('social_accounts')
    .upsert({
      user_id: userId,
      platform: 'twitter',
      platform_user_id: profile.id,
      name: profile.name,
      username: profile.username,
      profile_image: profile.profile_image_url,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
      is_active: true,
    });

  // Clean up state
  await supabaseClient
    .from('oauth_states')
    .delete()
    .eq('id', stateRecord.id);

  return new Response(null, {
    status: 302,
    headers: {
      'Location': stateRecord.redirect_url + '?success=twitter',
    },
  });
}
