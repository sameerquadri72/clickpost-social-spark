
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
        return await initiateFacebookAuth(supabaseClient, user.id);
      case 'callback':
        return await handleFacebookCallback(req, supabaseClient, user.id);
      default:
        return new Response('Not found', { status: 404, headers: corsHeaders });
    }
  } catch (error) {
    console.error('Facebook OAuth error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function initiateFacebookAuth(supabaseClient: any, userId: string) {
  const stateToken = crypto.randomUUID();
  const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/facebook-oauth/callback`;
  
  await supabaseClient
    .from('oauth_states')
    .insert({
      state_token: stateToken,
      platform: 'facebook',
      user_id: userId,
      redirect_url: `${new URL(Deno.env.get('SUPABASE_URL') || '').origin}/accounts`
    });

  const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
  authUrl.searchParams.set('client_id', Deno.env.get('FACEBOOK_APP_ID') || '');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', stateToken);
  authUrl.searchParams.set('scope', 'pages_manage_posts,pages_read_engagement,public_profile,pages_show_list,instagram_content_publish');

  return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleFacebookCallback(req: Request, supabaseClient: any, userId: string) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

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

  const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/facebook-oauth/callback`;

  // Exchange code for short-lived token
  const tokenResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?` + 
    new URLSearchParams({
      client_id: Deno.env.get('FACEBOOK_APP_ID') || '',
      client_secret: Deno.env.get('FACEBOOK_APP_SECRET') || '',
      redirect_uri: redirectUri,
      code,
    }));

  if (!tokenResponse.ok) {
    throw new Error('Failed to exchange code for token');
  }

  const tokenData = await tokenResponse.json();

  // Exchange for long-lived token
  const longLivedTokenResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?` +
    new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: Deno.env.get('FACEBOOK_APP_ID') || '',
      client_secret: Deno.env.get('FACEBOOK_APP_SECRET') || '',
      fb_exchange_token: tokenData.access_token,
    }));

  const longLivedTokenData = await longLivedTokenResponse.json();

  // Get user profile
  const profileResponse = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name,email,picture&access_token=${longLivedTokenData.access_token}`);
  const profile = await profileResponse.json();

  // Get pages managed by user
  const pagesResponse = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${longLivedTokenData.access_token}`);
  const pagesData = await pagesResponse.json();

  // Store Facebook account
  await supabaseClient
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
