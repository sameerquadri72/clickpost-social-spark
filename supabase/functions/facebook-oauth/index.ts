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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const facebookAppId = Deno.env.get('FACEBOOK_APP_ID');
    const facebookAppSecret = Deno.env.get('FACEBOOK_APP_SECRET');

    console.log('Facebook OAuth Environment Check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseServiceKey: !!supabaseServiceKey,
      hasFacebookAppId: !!facebookAppId,
      hasFacebookAppSecret: !!facebookAppSecret,
      method: req.method,
      url: req.url
    });

    // Validate required environment variables
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!facebookAppId || !facebookAppSecret) {
      console.error('Missing Facebook credentials');
      throw new Error('Facebook OAuth credentials not configured. Please set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in your Supabase project secrets.');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Parse URL to determine action
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const action = pathParts[pathParts.length - 1];

    console.log('Processing Facebook OAuth action:', action);

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

          return await initiateFacebookAuth(supabaseClient, user.id, supabaseUrl, facebookAppId);
        }
      } catch (parseError) {
        console.error('Error parsing POST body:', parseError);
        throw new Error('Invalid request body');
      }
    }

    // Handle callback (GET request from Facebook)
    if (req.method === 'GET' && action === 'callback') {
      return await handleFacebookCallback(req, supabaseClient, supabaseUrl, facebookAppId, facebookAppSecret);
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
    console.error('Facebook OAuth error:', error);
    
    // Return detailed error information for debugging
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Ensure FACEBOOK_APP_ID and FACEBOOK_APP_SECRET are configured in Supabase project secrets',
      timestamp: new Date().toISOString()
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function initiateFacebookAuth(supabaseClient: any, userId: string, supabaseUrl: string, appId: string) {
  try {
    const stateToken = crypto.randomUUID();
    const redirectUri = `${supabaseUrl}/functions/v1/facebook-oauth/callback`;
    
    console.log('Initiating Facebook auth:', {
      userId,
      redirectUri,
      stateToken: stateToken.substring(0, 8) + '...'
    });
    
    // Store OAuth state in database for security
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

    // Build Facebook authorization URL
    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
    authUrl.searchParams.set('client_id', appId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', stateToken);
    authUrl.searchParams.set('scope', 'pages_manage_posts,pages_read_engagement,public_profile,pages_show_list,instagram_content_publish');

    console.log('Generated Facebook auth URL:', authUrl.toString());

    return new Response(JSON.stringify({ 
      authUrl: authUrl.toString(),
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in initiateFacebookAuth:', error);
    throw error;
  }
}

async function handleFacebookCallback(req: Request, supabaseClient: any, supabaseUrl: string, appId: string, appSecret: string) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  console.log('Facebook callback received:', { 
    hasCode: !!code, 
    hasState: !!state, 
    error,
    errorDescription
  });

  // Handle OAuth errors from Facebook
  if (error) {
    const errorMsg = errorDescription || error;
    console.error('Facebook OAuth error:', errorMsg);
    const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent(`Facebook OAuth error: ${errorMsg}`)}`;
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
      .eq('platform', 'facebook')
      .single();

    if (stateError || !stateRecord) {
      console.error('Invalid state parameter:', stateError);
      const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Invalid or expired state parameter')}`;
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
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
      const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Failed to exchange authorization code for access token')}`;
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
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
      const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Failed to get long-lived token')}`;
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    }

    const longLivedTokenData = await longLivedTokenResponse.json();

    // Get user profile
    const profileResponse = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name,email,picture&access_token=${longLivedTokenData.access_token}`);
    
    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('Facebook profile fetch failed:', errorText);
      const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Failed to fetch Facebook profile')}`;
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    }

    const profile = await profileResponse.json();

    // Get pages managed by user
    const pagesResponse = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${longLivedTokenData.access_token}`);
    const pagesData = await pagesResponse.json();

    // Store Facebook account
    const { error: upsertError } = await supabaseClient
      .from('social_accounts')
      .upsert({
        user_id: stateRecord.user_id,
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
      }, {
        onConflict: 'user_id,platform,platform_user_id'
      });

    if (upsertError) {
      console.error('Failed to store Facebook account:', upsertError);
      const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent('Failed to save Facebook account information')}`;
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    }

    // Store each Facebook page as a separate account
    for (const page of pagesData.data || []) {
      await supabaseClient
        .from('social_accounts')
        .upsert({
          user_id: stateRecord.user_id,
          platform: 'facebook',
          platform_user_id: `page_${page.id}`,
          name: `${page.name} (Page)`,
          username: page.name.toLowerCase().replace(/\s+/g, '.'),
          access_token: longLivedTokenData.access_token,
          page_access_token: page.access_token,
          is_active: true,
          metadata: { page_id: page.id, category: page.category }
        }, {
          onConflict: 'user_id,platform,platform_user_id'
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
              user_id: stateRecord.user_id,
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
            }, {
              onConflict: 'user_id,platform,platform_user_id'
            });
        }
      } catch (igError) {
        console.warn('Failed to fetch Instagram account for page:', page.id, igError);
        // Continue processing other pages even if Instagram fetch fails
      }
    }

    console.log('Facebook account stored successfully');

    // Clean up OAuth state
    await supabaseClient
      .from('oauth_states')
      .delete()
      .eq('id', stateRecord.id);

    // Redirect back to frontend with success
    return new Response(null, {
      status: 302,
      headers: {
        'Location': stateRecord.redirect_url + '?success=facebook',
      },
    });

  } catch (error) {
    console.error('Facebook callback processing error:', error);
    const redirectUrl = `${new URL(supabaseUrl).origin}/accounts?error=${encodeURIComponent(`Facebook connection failed: ${error.message}`)}`;
    return new Response(null, {
      status: 302,
      headers: { 'Location': redirectUrl },
    });
  }
}