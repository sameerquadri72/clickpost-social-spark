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
    const facebookAppId = Deno.env.get('FACEBOOK_APP_ID');
    const facebookAppSecret = Deno.env.get('FACEBOOK_APP_SECRET');

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!facebookAppId || !facebookAppSecret) {
      throw new Error('Missing Facebook OAuth credentials. Please configure FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in your Supabase project secrets.');
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
        return await initiateFacebookAuth(supabaseClient, user.id, supabaseUrl, facebookAppId);
      case 'callback':
        return await handleFacebookCallback(req, supabaseClient, user.id, supabaseUrl, facebookAppId, facebookAppSecret);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Facebook OAuth error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Check that FACEBOOK_APP_ID and FACEBOOK_APP_SECRET are configured in your Supabase project secrets'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function initiateFacebookAuth(supabaseClient: any, userId: string, supabaseUrl: string, appId: string) {
  const stateToken = crypto.randomUUID();
  const redirectUri = `${supabaseUrl}/functions/v1/facebook-oauth/callback`;
  
  const { error: insertError } = await supabaseClient
    .from('oauth_states')
    .insert({
      state_token: stateToken,
      platform: 'facebook',
      user_id: userId,
      redirect_url: `${new URL(supabaseUrl).origin}/accounts`
    });

  if (insertError) {
    console.error('Failed to store OAuth state:', insertError);
    throw new Error('Failed to initialize OAuth flow');
  }

  const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
  authUrl.searchParams.set('client_id', appId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', stateToken);
  authUrl.searchParams.set('scope', 'pages_manage_posts,pages_read_engagement,public_profile,pages_show_list,instagram_content_publish');

  return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleFacebookCallback(req: Request, supabaseClient: any, userId: string, supabaseUrl: string, appId: string, appSecret: string) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    throw new Error(`Facebook OAuth error: ${error}`);
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
    .eq('platform', 'facebook')
    .single();

  if (!stateRecord) {
    throw new Error('Invalid state parameter');
  }

  const redirectUri = `${supabaseUrl}/functions/v1/facebook-oauth/callback`;

  // Exchange code for short-lived token
  const tokenResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?` + 
    new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    }));

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Facebook token exchange failed:', errorText);
    throw new Error('Failed to exchange code for token');
  }

  const tokenData = await tokenResponse.json();

  // Exchange for long-lived token
  const longLivedTokenResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?` +
    new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: tokenData.access_token,
    }));

  if (!longLivedTokenResponse.ok) {
    const errorText = await longLivedTokenResponse.text();
    console.error('Facebook long-lived token exchange failed:', errorText);
    throw new Error('Failed to get long-lived token');
  }

  const longLivedTokenData = await longLivedTokenResponse.json();

  // Get user profile
  const profileResponse = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name,email,picture&access_token=${longLivedTokenData.access_token}`);
  
  if (!profileResponse.ok) {
    const errorText = await profileResponse.text();
    console.error('Facebook profile fetch failed:', errorText);
    throw new Error('Failed to fetch user profile');
  }

  const profile = await profileResponse.json();

  // Get pages managed by user
  const pagesResponse = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${longLivedTokenData.access_token}`);
  const pagesData = await pagesResponse.json();

  // Store Facebook account
  const { error: upsertError } = await supabaseClient
    .from('social_accounts')
    .upsert({
      user_id: userId,
      platform: 'facebook',
      platform_user_id: profile.id,
      name: profile.name,
      username: profile.name.toLowerCase().replace(/\s+/g, '.'),
      email: profile.email,
      profile_image: profile.picture?.data?.url,
      access_token: longLivedTokenData.access_token,
      expires_at: longLivedTokenData.expires_in ? new Date(Date.now() + longLivedTokenData.expires_in * 1000).toISOString() : null,
      is_active: true,
      metadata: { pages: pagesData.data || [] }
    });

  if (upsertError) {
    console.error('Failed to store Facebook account:', upsertError);
    throw new Error('Failed to save account information');
  }

  // Store each Facebook page as a separate account
  for (const page of pagesData.data || []) {
    await supabaseClient
      .from('social_accounts')
      .upsert({
        user_id: userId,
        platform: 'facebook',
        platform_user_id: `page_${page.id}`,
        name: `${page.name} (Page)`,
        username: page.name.toLowerCase().replace(/\s+/g, '.'),
        access_token: longLivedTokenData.access_token,
        page_access_token: page.access_token,
        is_active: true,
        metadata: { page_id: page.id, category: page.category }
      });

    // Check for connected Instagram account
    try {
      const instagramResponse = await fetch(`https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`);
      const instagramData = await instagramResponse.json();

      if (instagramData.instagram_business_account) {
        const igAccountResponse = await fetch(`https://graph.facebook.com/v18.0/${instagramData.instagram_business_account.id}?fields=username,name,profile_picture_url&access_token=${page.access_token}`);
        const igAccount = await igAccountResponse.json();

        await supabaseClient
          .from('social_accounts')
          .upsert({
            user_id: userId,
            platform: 'instagram',
            platform_user_id: igAccount.id,
            name: igAccount.name,
            username: igAccount.username,
            profile_image: igAccount.profile_picture_url,
            access_token: longLivedTokenData.access_token,
            page_access_token: page.access_token,
            is_active: true,
            metadata: { 
              ig_user_id: igAccount.id,
              connected_page_id: page.id,
              page_name: page.name
            }
          });
      }
    } catch (igError) {
      console.warn('Failed to fetch Instagram account for page:', page.id, igError);
      // Continue processing other pages even if Instagram fetch fails
    }
  }

  // Clean up state
  await supabaseClient
    .from('oauth_states')
    .delete()
    .eq('id', stateRecord.id);

  return new Response(null, {
    status: 302,
    headers: {
      'Location': stateRecord.redirect_url + '?success=facebook',
    },
  });
}